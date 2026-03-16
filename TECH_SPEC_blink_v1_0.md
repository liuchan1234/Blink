# Blink.MBTI 技术文档（v1.1）

## 1. 文档信息
- 文档类型：技术实现说明（研发执行版）
- 对应产品文档：`PRD_boss_requirements_only_v1.md`（老板确认版 v1.1）
- 技术栈决策（已锁定）：Vue 3 + FastAPI + MySQL
- 版本：v1.1
- 日期：2026-03-14
- 目标读者：前端、后端、测试、运维

## 2. 目标与非目标
### 2.1 技术目标
- T-01：实现“测验 -> 个人档案实时生成 -> 合盘付费 -> 历史回看”的端到端闭环。
- T-02：满足产品规则：免费 2 次 submit，第 3 次起每次 25 Stars。
- T-03：满足失败重试规则：`failed` 报告可免费重试，单笔支付最多 3 次。
- T-04：满足语言策略：手动选择 > Telegram language_code > 默认 en。
- T-05：支持 30,000 DAU 目标下的稳定运行与可观测。

### 2.2 非目标
- N-01：v1.0 不实现双向分享（A 开放 B 查看）与 Bot 通知。
- N-02：v1.0 不实现 Stars 之外的支付方式。
- N-03：v1.0 不实现 EN/RU 之外语言。

## 3. 技术选型（锁定）
### 3.1 前端
- 框架：Vue 3（Composition API）
- 构建：Vite
- 状态管理：Pinia
- 路由：Vue Router（或基于单页多 screen 的轻路由）
- 网络层：统一 API Client（axios 或 fetch 封装）

### 3.2 后端
- 框架：FastAPI
- 数据校验：Pydantic v2
- ORM：SQLAlchemy 2.x
- 数据迁移：Alembic
- 服务进程：Uvicorn（生产可配 Gunicorn + Uvicorn workers）

### 3.3 数据与异步
- 主数据库：MySQL 8.0+
- 缓存/限流：Redis
- 异步任务：Celery + Redis（broker）
- 任务类型：GPT 实时档案生成、合盘报告生成、失败重试任务

### 3.4 外部集成
- Telegram Mini App（initData）
- Telegram Stars（invoice + webhook）
- OpenAI API（档案/合盘内容生成）

## 4. 总体架构
### 4.1 分层
- 客户端层：Telegram Mini App（Vue）。
- API 层：FastAPI REST。
- 业务层：用户、测验、支付、报告、重试、语言策略。
- 异步层：Celery Worker 处理 GPT 任务。
- 存储层：MySQL（持久化）+ Redis（短期状态与风控）。
- 观测层：日志、指标、告警。

### 4.2 主流程（简化）
```text
MiniApp(Vue) -> FastAPI /api/user/init -> MySQL
MiniApp(Vue) -> FastAPI /api/user/submit -> Rule Engine -> GPT Profile Task -> MySQL
MiniApp(Vue) -> FastAPI /api/compat/invoice -> Telegram Stars
Telegram Webhook(successful_payment) -> FastAPI -> Celery Queue -> GPT Compat Task
MiniApp(Vue) -> FastAPI /api/compat/status/:id (polling) -> MySQL
```

### 4.3 服务部署单元
- `web-api`：FastAPI HTTP 服务。
- `worker`：Celery Worker。
- `scheduler`：可选，若未来需要定时任务。
- `mysql`：主数据库。
- `redis`：缓存与队列。

## 5. 数据模型（MySQL）
### 5.1 设计原则
- D-01：计费行为必须可追溯（`charge_id` 唯一）。
- D-02：报告状态可恢复（pending -> generating -> done/failed）。
- D-03：History 按 Telegram UID 归属，与 BLINK 码解耦。

### 5.2 核心表
#### users
- `user_id` BIGINT PRIMARY KEY（Telegram user id）
- `lang` VARCHAR(5) NOT NULL DEFAULT 'en'
- `free_submits_used` INT NOT NULL DEFAULT 0
- `created_at` DATETIME(3) NOT NULL
- `updated_at` DATETIME(3) NOT NULL

#### profiles
- `profile_id` CHAR(36) PRIMARY KEY
- `user_id` BIGINT NOT NULL
- `blink_code` VARCHAR(16) NOT NULL UNIQUE
- `mbti` VARCHAR(4) NOT NULL
- `attachment` VARCHAR(20) NOT NULL
- `poetic_name` VARCHAR(64) NOT NULL
- `gender` VARCHAR(16) NULL
- `birth_year` INT NULL
- `zodiac` VARCHAR(20) NOT NULL
- `rel_history` TINYINT NOT NULL
- `current_status` VARCHAR(32) NOT NULL
- `emotion` VARCHAR(32) NOT NULL
- `eq_score` INT NOT NULL
- `depth` DECIMAL(4,2) NOT NULL
- `guard` DECIMAL(4,2) NOT NULL
- `heat` DECIMAL(4,2) NOT NULL
- `heal` DECIMAL(4,2) NOT NULL
- `read_score` DECIMAL(4,2) NOT NULL
- `one_line` TEXT NOT NULL
- `monologue` TEXT NOT NULL
- `description` TEXT NOT NULL
- `love_letter` TEXT NOT NULL
- `strengths_json` JSON NOT NULL
- `blind_spots_json` JSON NOT NULL
- `soul_match_reason` TEXT NOT NULL
- `lang` VARCHAR(5) NOT NULL
- `created_at` DATETIME(3) NOT NULL

#### compat_reports
- `report_id` CHAR(36) PRIMARY KEY
- `owner_user_id` BIGINT NOT NULL
- `code_a` VARCHAR(16) NOT NULL
- `code_b` VARCHAR(16) NOT NULL
- `status` VARCHAR(16) NOT NULL（pending/generating/done/failed）
- `lang` VARCHAR(5) NOT NULL
- `amount_paid` INT NOT NULL DEFAULT 50
- `payment_method` VARCHAR(20) NOT NULL DEFAULT 'stars'
- `charge_id` VARCHAR(64) NULL
- `retry_count` INT NOT NULL DEFAULT 0
- `report_json` JSON NULL
- `error_code` VARCHAR(64) NULL
- `created_at` DATETIME(3) NOT NULL
- `updated_at` DATETIME(3) NOT NULL
- `generated_at` DATETIME(3) NULL
- 索引建议：`idx_compat_owner_created(owner_user_id, created_at DESC)`

#### payment_events
- `id` CHAR(36) PRIMARY KEY
- `user_id` BIGINT NOT NULL
- `event_type` VARCHAR(32) NOT NULL（compat_payment/retest_payment）
- `payload_key` VARCHAR(128) NOT NULL
- `charge_id` VARCHAR(64) NOT NULL UNIQUE
- `amount_paid` INT NOT NULL
- `currency` VARCHAR(16) NOT NULL DEFAULT 'stars'
- `status` VARCHAR(16) NOT NULL
- `created_at` DATETIME(3) NOT NULL

#### submit_attempts
- `attempt_id` CHAR(36) PRIMARY KEY
- `user_id` BIGINT NOT NULL
- `attempt_type` VARCHAR(16) NOT NULL（free/paid）
- `payment_event_id` CHAR(36) NULL
- `status` VARCHAR(16) NOT NULL（accepted/rejected/completed）
- `reason` VARCHAR(64) NULL
- `created_at` DATETIME(3) NOT NULL

### 5.3 Redis Key 规范
- `submit_lock:{user_id}`：30 秒去重锁。
- `submit_daily:{user_id}:{yyyy-mm-dd}`：免费 submit 每日计数（上限 5）。
- `gpt_daily_count:{yyyy-mm-dd}`：全局 GPT 调用计数（上限 5000）。
- `job_status:{report_id}`：异步任务短期状态（可选）。

## 6. API 契约（FastAPI）
### 6.1 用户接口
- `POST /api/user/init`
- 入参：`ref`(optional), `lang`(en/ru)
- 出参：
- 新用户：基础状态 + `free_submits_used`
- 老用户：最新 profile 快照 + `pending_report_id`

- `POST /api/user/submit`
- 入参：`gender`, `birth_year`, `zodiac`, `rel_history`, `current_status`, `emotion`, `quiz_answers[10]`, `lang`
- 规则：
- 免费次数 < 2 时可直接 submit。
- 免费次数 >= 2 且非 paid submit 时返回 `402 payment_required`。
- paid submit 成功后走同一 submit 逻辑，但不受每日免费上限限制。

- `POST /api/user/retest-invoice`
- 返回：Telegram Stars invoice（25 Stars）。

- `GET /api/user/lookup?code=BLINK-XXXXXX`
- 返回：公开字段（含 `poetic_name`）用于付款确认前展示。

### 6.2 合盘接口
- `POST /api/compat/invoice`
- 入参：`code_a`, `code_b`
- 行为：校验双码有效，预创建 `pending` 报告，返回 `invoice_link + report_id`。

- `GET /api/compat/status/{report_id}`
- 返回：`pending/generating/done/failed`，done 时包含 `report_json`。

- `POST /api/compat/retry`
- 入参：`report_id`
- 行为：仅 `failed` 可重试，且 `retry_count < 3`。

- `GET /api/compat/history`
- 返回：当前用户已完成报告列表（按时间倒序）。

### 6.3 Webhook 接口
- `POST /api/webhook/telegram`
- `pre_checkout_query`：10 秒内响应。
- `successful_payment`：按 payload 分发。
- `compat_report:{report_id}`：触发合盘生成任务。
- `retest:{user_id}`：触发 paid submit。

## 7. 核心状态机
### 7.1 Submit
```text
start -> check_quota
check_quota -> payment_required (free_submits_used >= 2 AND not paid_submit)
check_quota -> accepted
accepted -> generate_profile
generate_profile -> completed
generate_profile -> failed
```

### 7.2 Compat 报告
```text
pending -> generating -> done
pending -> generating -> failed
failed -> retry_pending (retry_count < 3)
retry_pending -> generating
failed -> retry_exhausted (retry_count >= 3)
```

### 7.3 支付
```text
invoice_created -> payment_pending -> payment_success -> dispatched
invoice_created -> cancelled
payment_success -> dispatch_failed (可重放 webhook)
```

## 8. 规则引擎
### 8.1 免费与付费
- RUL-01：每用户前 2 次 submit 免费。
- RUL-02：第 3 次起，每次 submit 单独支付 25 Stars。
- RUL-03：每日 5 次上限仅统计免费 submit。
- RUL-04：paid submit 不受每日 5 次限制。

### 8.2 失败重试
- RUL-05：`failed` 报告允许免费重试。
- RUL-06：单笔支付（按 `charge_id`）最多 3 次免费重试。
- RUL-07：超限返回 `403 retry_exhausted`。

### 8.3 语言
- RUL-08：语言优先级：手动选择 > Telegram language_code > 默认 en。
- RUL-09：个人档案生成使用当前用户语言。
- RUL-10：合盘报告使用付款方当次语言。
- RUL-11：历史报告保持生成时语言，不回写。

## 9. GPT 与任务设计
### 9.1 个人档案实时生成（v1.0 必做）
- 触发：`/api/user/submit`。
- 输入：mbti, attachment, gender, birth_year, rel_history, current_status, emotion, lang, radar dims。
- 输出：固定结构字段（one_line/monologue/description/love_letter/strengths/blind_spots/soul_match_reason）。
- 保护：schema 校验失败重试 1 次，仍失败则返回降级模板并记录错误。

### 9.2 合盘报告生成
- 触发：`successful_payment` webhook（compat payload）。
- 并发：Celery worker 并发配置（建议起步 10~20）。
- 超时：单任务 90 秒。
- 熔断：日调用超 5000 时降级模板并告警。

## 10. 错误码与前端行为
### 10.1 错误码
- `400 invalid_params`
- `401 unauthorized`
- `402 payment_required`
- `403 forbidden/retry_exhausted`
- `404 not_found`
- `409 conflict`
- `429 rate_limited`
- `500 internal_error`

### 10.2 前端处理分级
- Level-1：静默重试（网络抖动、502/503）。
- Level-2：Toast（可恢复业务错误）。
- Level-3：全屏错误（401、500、连续失败）。

## 11. 安全要求
- SEC-01：生产环境必须开启 Telegram initData HMAC 校验。
- SEC-02：Webhook 必须做来源校验与幂等处理。
- SEC-03：`charge_id` 全局唯一，重复回调不重复记账。
- SEC-04：日志脱敏，不记录完整用户隐私。

## 12. 观测与告警
### 12.1 指标
- submit 总量、free->paid 转化率。
- compat 支付成功率、done/failed 比例。
- retry 使用率、retry_exhausted 比率。
- GPT 调用量、超时率、schema 校验失败率。

### 12.2 告警
- AL-01：GPT 日调用量 > 4500 预警，>5000 告警并降级。
- AL-02：webhook 5xx 比率 > 1%。
- AL-03：compat failed 比率 15 分钟窗口 > 8%。
- AL-04：支付成功后 60 秒未进入 generating。

## 13. 部署与环境变量
### 13.1 环境
- `dev`：本地联调（可 mock 支付）。
- `staging`：接真实 Telegram 沙盒。
- `prod`：生产高可用部署。

### 13.2 必需环境变量
- `APP_ENV`
- `API_PORT`
- `MYSQL_DSN`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_PROVIDER_TOKEN`
- `OPENAI_API_KEY`
- `FREE_SUBMIT_LIMIT=2`
- `FREE_DAILY_LIMIT=5`
- `RETEST_PRICE_STARS=25`
- `COMPAT_PRICE_STARS=50`
- `GPT_DAILY_CAP=5000`
- `COMPAT_RETRY_LIMIT=3`
- `COMPAT_TIMEOUT_SEC=90`

## 14. 与当前仓库现状差距（迁移导向）
### 14.1 当前已具备
- G-READY-01：前后端主流程与接口路径已经通过 Node mock 跑通。
- G-READY-02：前端业务页面结构与轮询交互已可联调。

### 14.2 迁移必做
- G-GAP-01：前端从当前原生 JS 迁移至 Vue 3 + Pinia（保持 API 行为不变）。
- G-GAP-02：后端从 Node mock 迁移到 FastAPI（接口契约保持兼容）。
- G-GAP-03：存储从 JSON 文件迁移到 MySQL + Redis。
- G-GAP-04：接入真实 Telegram webhook 与支付幂等。
- G-GAP-05：接入真实 GPT 调用与 schema 校验、降级策略。

## 15. 实施里程碑
- M1（1 周）：FastAPI 基础骨架 + MySQL/Alembic + Redis 接入。
- M2（1 周）：用户/submit/lookup/retest-invoice API 与规则引擎。
- M3（1 周）：compat invoice/status/retry + webhook 幂等分发。
- M4（1 周）：GPT 生成链路（profile + compat）与降级机制。
- M5（3-5 天）：压测、告警、灰度发布、回滚演练。

## 16. 技术验收清单
- V-01：免费 2 次 + 第 3 次支付规则测试通过。
- V-02：`failed` 报告可重试且最多 3 次。
- V-03：断网或关闭 App 后 `pending_report_id` 恢复有效。
- V-04：同对码重复购买生成独立报告并进入历史。
- V-05：语言优先级与付款方语言规则符合定义。
- V-06：重复 webhook 不重复记账、不重复生成。
- V-07：GPT 日调用超上限自动降级并告警。

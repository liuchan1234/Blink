# Blink.MBTI

Telegram Mini App：MBTI 测验 → 个人档案生成 → 合盘付费 → 历史回看。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Pinia |
| 后端 | FastAPI + SQLAlchemy 2.x |
| 数据库 | MySQL 8+ / SQLite（开发） |
| 缓存/队列 | Redis + Celery |
| 集成 | Telegram Mini App、Telegram Stars、OpenAI API |

## 环境变量模版

复制模版并填入实际配置：

```bash
# 后端
cp backend/.env.example backend/.env

# 前端（可选，留空则走 Vite 代理）
cp frontend/.env.example frontend/.env
```

详见下方「环境变量」章节。

## 项目启动

### 前置条件

- **Python 3.10+**
- **Node.js 18+**
- **MySQL 8+**（或开发时留空 `MYSQL_DSN` 使用 SQLite）
- **Redis 7+**（开发时若未安装，部分功能会降级）

### 启动步骤

#### 1. 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 编辑 .env 填入配置
alembic upgrade head       # 执行数据库迁移
uvicorn app.main:app --host 0.0.0.0 --port 8787 --reload
```

后端启动后：`http://localhost:8787`，健康检查：`http://localhost:8787/api/health`

#### 2. 前端

新开终端：

```bash
cd frontend
npm install
cp .env.example .env       # 可选，本地开发可留空
npm run dev
```

前端启动后：`http://localhost:5173`，API 请求会通过 Vite 代理到 `http://localhost:8787`

#### 3. Celery Worker（合盘报告异步生成）

开发环境若 `CELERY_TASK_ALWAYS_EAGER=true`，可跳过此步。生产或需真实异步时，新开终端：

```bash
cd backend
source .venv/bin/activate
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

### 启动顺序总结

| 终端 | 命令 | 说明 |
|------|------|------|
| 1 | `cd backend && ... && uvicorn app.main:app ...` | 后端 API |
| 2 | `cd frontend && npm run dev` | 前端开发服务器 |
| 3 | `cd backend && celery -A ... worker ...` | 可选，合盘异步任务 |

## 项目结构

```
├── backend/          # FastAPI 后端
│   ├── app/          # 应用代码
│   ├── alembic/      # 数据库迁移
│   └── legacy_node/  # 旧 Node 参考实现
├── frontend/         # Vue 3 前端
│   ├── src/
│   └── legacy_static/
├── TECH_SPEC_blink_v1_0.md   # 技术规格
└── PRD_boss_requirements_only_v1.md
```

## 环境变量

### 后端 `backend/.env`

| 变量 | 说明 | 开发建议 |
|------|------|----------|
| `APP_ENV` | dev / prod | `dev` |
| `MYSQL_DSN` | MySQL 连接串 | 留空用 SQLite |
| `REDIS_URL` | Redis 地址 | `redis://localhost:6379/0` |
| `CELERY_TASK_ALWAYS_EAGER` | 同步执行 Celery | `true` |
| `TELEGRAM_BOT_TOKEN` | Bot Token | 从 @BotFather 获取 |
| `TELEGRAM_INIT_DATA_REQUIRED` | 是否强制 initData | `false` |
| `OPENAI_API_KEY` | OpenAI Key | 必填才能生成档案/合盘 |

完整说明见 `backend/.env.example`。

### 前端 `frontend/.env`

| 变量 | 说明 | 开发建议 |
|------|------|----------|
| `VITE_API_BASE` | API 基础地址 | 留空，走 Vite 代理 |

完整说明见 `frontend/.env.example`。

## 文档

- [技术规格](TECH_SPEC_blink_v1_0.md)
- [产品需求](PRD_boss_requirements_only_v1.md)
- [后端说明](backend/README.md)
- [前端说明](frontend/README.md)

## License

Private.

'use strict';

/* ═══════════════════════════════════════════════
   UI v4.5.1 · aligned with PRD v2.8.1
   CHANGES vs v4.5:
   - archetype: DOM element removed, JS render logic removed (v2.0 预留)
     APP.archetype field retained for API data capture only
   - blink_code charset: [A-Z2-9] (O/I removed) confirmed
   - eq_score display format: percentage e.g. "94%" (already correct)
   CHANGES vs v4.4:
   - APP.archetype field added (populated from API, stored in memory only)
   - ref param renamed refUserId for clarity (format: ref_<telegram_user_id>)
   - eq_score: always read from profile.eq_score (no change needed, already correct)
   - s-paywall CSS removed (screen was never called, PRD v2.8 declares deprecated)
═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   API CONFIG
   Replace API_BASE with your deployed backend URL.
═══════════════════════════════════════════════ */
const API_BASE = window.BLINK_API_BASE || 'http://localhost:8787';

/* ═══════════════════════════════════════════════
   TELEGRAM INIT
   Initialise Telegram WebApp and extract user identity.
   Falls back gracefully in browser preview.
═══════════════════════════════════════════════ */
const tgWebApp = window.Telegram?.WebApp;
if (tgWebApp) {
  tgWebApp.ready();
  tgWebApp.expand();

  // ── BackButton: go back one step in _screenHistory ──
  tgWebApp.BackButton?.onClick(() => {
    if(_screenHistory.length > 1){
      _screenHistory.pop(); // remove current
      const prev = _screenHistory[_screenHistory.length - 1];
      // Navigate back without pushing to history again
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const el = document.getElementById(prev);
      if(el) el.classList.add('active');
      document.body.dataset.screen = prev;
      window.scrollTo(0,0);
      if(ROOT_SCREENS.has(prev) || _screenHistory.length <= 1){
        tgWebApp.BackButton.hide();
      }
    } else {
      tgWebApp.close();
    }
  });

  // ── viewportChanged: update CSS var so screens fit exactly ──
  tgWebApp.onEvent('viewportChanged', () => {
    document.documentElement.style.setProperty(
      '--tg-viewport-height', tgWebApp.viewportStableHeight + 'px'
    );
  });
  // Set immediately on load
  if(tgWebApp.viewportStableHeight){
    document.documentElement.style.setProperty(
      '--tg-viewport-height', tgWebApp.viewportStableHeight + 'px'
    );
  }
}

// Build auth header from Telegram initData (verified server-side via HMAC)
function getTgAuthHeader() {
  const initData = tgWebApp?.initData || '';
  return initData ? { 'X-Telegram-Init-Data': initData } : {};
}

/* ═══════════════════════════════════════════════
   apiCall — unified fetch wrapper
   - Automatically attaches auth header
   - Attaches Content-Type for POST/PATCH/PUT
   - Returns parsed JSON on success
   - Throws on non-2xx (preserves status as err.status)
   - Special: returns { _status: 402, ...json } for paywall
   Usage:
     const data = await apiCall('/api/user/init', { method:'POST', body:{lang:'en'} })
     const data = await apiCall('/api/user/lookup?code=BLINK-X', {})
═══════════════════════════════════════════════ */
async function apiCall(path, { method = 'GET', body, rawFetch = false } = {}) {
  const headers = { ...getTgAuthHeader() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Special pass-through for 402 (paywall) — callers handle it
  if (res.status === 402) {
    const json = await res.json().catch(() => ({}));
    const err = new Error('payment_required');
    err.status = 402;
    err.data = json;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`API ${method} ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }

  if (rawFetch) return res;
  return res.json().catch(() => ({}));
}

// Detect user language from Telegram client (en or ru only)
const USER_LANG = (tgWebApp?.initDataUnsafe?.user?.language_code || 'en')
  .toLowerCase().startsWith('ru') ? 'ru' : 'en';

/* ═══════════════════════════════════════════════
   APP STATE
   Single source of truth for the prototype.
   In production this becomes Pinia stores.
═══════════════════════════════════════════════ */
const APP = {
  // Telegram identity
  tgUserId: tgWebApp?.initDataUnsafe?.user?.id || null,
  lang: USER_LANG,

  // User profile (collected across S2 Info)
  gender: null,
  birthYear: 2000,
  zodiac: null,          // user-selected zodiac sign (replaces birthMonth)
  relHistory: 0,
  currentStatus: null,
  emotion: null,

  // Quiz
  quizAnswers: [],
  quizIdx: 0,

  // Results
  mbti: null,
  attachment: null,
  poeticName: null,
  archetype: null,       // v2.0 UI预留，v1.0不渲染，后端已返回
  blinkCode: null,
  monologue: null,
  profileData: null,

  // Compat
  freeSubmitsUsed: 0,
  compatCodeA: '',
  compatCodeB: '',
  compatReportId: null,
  compatReport: null,
  historyData: [],       // loaded from /api/compat/history when entering S8

  // Loading timers
  _loadTimer: null,
  _loadPhaseTimer: null,
  _cmTimer: null,
  _pollTimer: null,
};

/* ═══════════════════════════════════════════════
   STARS BACKGROUND
═══════════════════════════════════════════════ */
(function initStars(){
  const sf = document.getElementById('stars');
  if(!sf) return;
  for(let i=0;i<90;i++){
    const s = document.createElement('div');
    s.className = 'star-dot';
    const sz = Math.random()*1.8+.6;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${3+Math.random()*5}s;--dl:-${Math.random()*6}s;--lo:${(.06+Math.random()*.15).toFixed(2)};--hi:${(.35+Math.random()*.55).toFixed(2)};`;
    sf.appendChild(s);
  }
})();

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */

// Screen history stack for BackButton
const _screenHistory = [];

// Screens where BackButton should close the app (root screens)
const ROOT_SCREENS = new Set(['s-landing', 's-result', 's-dual']);

function go(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');
  // Tag body so CSS can show/hide bnav without JS
  document.body.dataset.screen = id;
  window.scrollTo(0,0);

  // ── Telegram BackButton management ──
  if(tgWebApp?.BackButton) {
    // Push to history only when navigating forward (not on initial load)
    if(_screenHistory.length > 0) _screenHistory.push(id);
    if(ROOT_SCREENS.has(id) || _screenHistory.length <= 1) {
      tgWebApp.BackButton.hide();
    } else {
      tgWebApp.BackButton.show();
    }
  }

  // Hide pending-dual banner whenever we leave s-info
  if(id !== 's-info'){
    const banner = document.getElementById('pendingDualBanner');
    if(banner) banner.style.display = 'none';
  }

  // Sync bottom nav active state
  if(id === 's-result' || id === 's-detail') setNav('bMe');
  else if(id === 's-dual' || id === 's-report') setNav('bDual');

  // Screen-specific init
  switch(id){
    case 's-quiz':
      APP.quizIdx = 0;
      APP.quizAnswers = [];
      setTimeout(renderQuiz, 50);
      break;
    case 's-loading':
      setTimeout(startLoading, 150);
      break;
    case 's-result':
      syncResultScreen();
      break;
    case 's-detail':
      syncDetailScreen();
      break;
    case 's-dual':
      syncDualScreen();
      break;
    case 's-report':
      syncReportScreen();
      break;
  }
}

/* ═══════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════ */
function setNav(id){
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

/* ═══════════════════════════════════════════════
   S2 INFO — validation + collection
═══════════════════════════════════════════════ */

/* Gender + Status chips */
function selChip(el, group){
  el.closest('.chips-row').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  if(group === 'g') APP.gender = el.textContent.trim().split(' ')[0].toLowerCase();
  if(group === 's') APP.currentStatus = el.dataset.value;
}

/* ── Language switcher ── */
function setLang(lang){
  APP.lang = lang;
  try { localStorage.setItem('blink_lang', lang); } catch(e){}
  document.getElementById('langEN')?.classList.toggle('active', lang === 'en');
  document.getElementById('langRU')?.classList.toggle('active', lang === 'ru');
}
// Init lang from localStorage override
(function(){
  try {
    const saved = localStorage.getItem('blink_lang');
    if(saved === 'en' || saved === 'ru'){ APP.lang = saved; setLang(saved); }
    else { setLang(APP.lang); }
  } catch(e){ setLang(APP.lang); }
})();

/* ── Zodiac chip selection ── */
function selZodiac(el){
  document.querySelectorAll('.zodiac-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  APP.zodiac = el.dataset.sign;
}

/* Poster monologues — one punchy line per type */

const ZODIAC = [
  {m:1,  sign:'Aquarius',    sym:'♒'},
  {m:2,  sign:'Pisces',      sym:'♓'},
  {m:3,  sign:'Aries',       sym:'♈'},
  {m:4,  sign:'Taurus',      sym:'♉'},
  {m:5,  sign:'Gemini',      sym:'♊'},
  {m:6,  sign:'Cancer',      sym:'♋'},
  {m:7,  sign:'Leo',         sym:'♌'},
  {m:8,  sign:'Virgo',       sym:'♍'},
  {m:9,  sign:'Libra',       sym:'♎'},
  {m:10, sign:'Scorpio',     sym:'♏'},
  {m:11, sign:'Sagittarius', sym:'♐'},
  {m:12, sign:'Capricorn',   sym:'♑'},
];

/* Past relationships slider */
const REL_LABELS = ['None','1 – 2','3 – 5','6+'];

function updateSlider(el){
  const v = parseInt(el.value);
  APP.relHistory = v;
  tgWebApp?.HapticFeedback?.impactOccurred('light');
  const lbl = document.getElementById('relLabel');
  if(lbl) lbl.textContent = REL_LABELS[v];
  const pct = (v/3)*100;
  el.style.background = `linear-gradient(to right,rgba(212,255,0,0.7) 0%,rgba(212,255,0,0.7) ${pct}%,rgba(255,255,255,0.06) ${pct}%,rgba(255,255,255,0.06) 100%)`;
}

/* Info → Continue validation */
function goFromInfo(){
  // 1. Gender required
  const genderSelected = document.querySelector('#s-info .chips-row .chip.sel');
  if(!genderSelected){
    shakeEl(document.querySelector('#s-info .field-group:first-of-type .chips-row'));
    return;
  }
  // 2. Zodiac required
  if(!APP.zodiac){
    shakeEl(document.getElementById('zodiacSelector'));
    return;
  }
  // 3. Sync birth year
  APP.birthYear = parseInt(document.getElementById('birthYear')?.value || '2000');
  go('s-emotion');
}

/* ═══════════════════════════════════════════════
   S3 EMOTION
═══════════════════════════════════════════════ */
function selEmotion(el){
  document.querySelectorAll('.emotion-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  // S3 Emotion card simultaneously sets emotion tone AND current_status (PRD v2.3 Section 2.3)
  const statusMap  = { purple:'single',      pink:'relationship', blue:'complicated', teal:'casual' };
  const emotionMap = { purple:'joy',          pink:'anxiety',      blue:'melancholy',  teal:'numbness' };
  APP.emotion       = emotionMap[el.dataset.color] || 'joy';
  APP.currentStatus = statusMap[el.dataset.color]  || 'single';
  setTimeout(() => go('s-quiz'), 380);
}

/* ═══════════════════════════════════════════════
   S4 QUIZ ENGINE
═══════════════════════════════════════════════ */
const QUIZ_QUESTIONS = [
  "I can tell something's off with my partner before they say a word.",
  "After a long day with people I love, I still need an hour alone.",
  "When I'm upset, I go quiet — I need to process it myself first.",
  "Even when things are going well, I catch myself waiting for something to go wrong.",
  "I trust patterns more than words. Actions over time mean everything to me.",
  "I feel closest to someone when I don't have to explain myself.",
  "I'd rather figure things out alone than ask someone to carry it with me.",
  "I have a clear sense of what kind of love I want — and what I won't accept.",
  "Small, consistent things move me more than big gestures.",
  "When they go quiet, my brain immediately starts writing stories.",
];

function renderQuiz(){
  const idx = APP.quizIdx;
  document.getElementById('quizNum').textContent = `Q${idx+1} / ${QUIZ_QUESTIONS.length}`;
  document.getElementById('quizProgress').style.width = `${((idx+1)/QUIZ_QUESTIONS.length)*100}%`;
  const qEl = document.getElementById('quizQ');
  qEl.style.opacity = '0'; qEl.style.transform = 'translateY(8px)';
  setTimeout(()=>{
    qEl.textContent = QUIZ_QUESTIONS[idx];
    qEl.style.transition = 'opacity .25s ease, transform .25s ease';
    qEl.style.opacity = '1'; qEl.style.transform = 'translateY(0)';
  }, 120);
  document.querySelectorAll('#orbScale .orb').forEach(o => o.classList.remove('sel'));
}

function pickOrb(el){
  document.querySelectorAll('#orbScale .orb').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  if(navigator.vibrate) navigator.vibrate(6);
  tgWebApp?.HapticFeedback?.impactOccurred('light');
  // Store answer value 1–5 based on orb title
  const titleMap = {'Strongly Agree':5,'Agree':4,'Slightly Agree':3,'Slightly Disagree':2,'Disagree':1,'Strongly Disagree':1};
  APP.quizAnswers[APP.quizIdx] = titleMap[el.title] ?? 3;
  setTimeout(()=>{
    APP.quizIdx++;
    if(APP.quizIdx < QUIZ_QUESTIONS.length){
      renderQuiz();
    } else {
      go('s-loading');
    }
  }, 380);
}

function quizBack(){
  if(APP.quizIdx > 0){ APP.quizIdx--; renderQuiz(); }
  else { go('s-emotion'); }
}

/* ═══════════════════════════════════════════════
   S5 LOADING
═══════════════════════════════════════════════ */
const LOAD_PHASES = [
  'Tracing your emotional memory…',
  'Finding your attachment signature…',
  'Matching your energy…',
  'Writing your story…'
];
let _loadPhaseIdx = 0;

/* ── PendingDual ─────────────────────────────────────────────────────
   Centralised one-shot flag: user hit "Fill mine" on Dual screen
   without a BLINK code → redirected to quiz → auto-return after submit.
   All three call-sites use this object instead of raw localStorage.
─────────────────────────────────────────────────────────────────────── */
const PendingDual = {
  KEY: 'pending_dual',
  set()   { localStorage.setItem(this.KEY, 'true'); },
  check() { return localStorage.getItem(this.KEY) === 'true'; },
  clear() { localStorage.removeItem(this.KEY); },
  /** Consume: returns true and clears the flag if it was set. */
  consume(){ if(!this.check()) return false; this.clear(); return true; },
};

/**
 * runProgressAnim — generic progress-bar animation, shared by startLoading() and _runLoading().
 * @param {object} opts
 *   barEl      HTMLElement  — the progress bar fill element
 *   pctEl      HTMLElement  — text element showing "XX%"
 *   stepEls    NodeList|Array — step indicator elements
 *   phaseEl    HTMLElement|null — rotating phase-label element
 *   phases     string[]     — phase strings (rotated via phaseEl)
 *   cap        number       — maximum pct (100 = run to completion, 96 = wait for API)
 *   speed      number       — random increment range multiplier (default 1)
 *   timerKey   string       — key on APP object to store the interval id
 *   onComplete function|null — called when pct reaches cap (only when cap === 100)
 *   stepClass  string|null  — CSS class added to completed steps ('done' by default)
 *   activeClass string|null — CSS class for the current step (null = unused)
 */
function runProgressAnim(opts){
  const {
    barEl, pctEl, stepEls=[], phaseEl=null, phases=[], cap=100,
    timerKey, onComplete=null, stepClass='done', activeClass=null
  } = opts;

  let pct = 0, stepIdx = 0;
  if(barEl) barEl.style.width = '0%';
  stepEls.forEach(s => { if(s) s.className = s.className.replace(/\s*(done|active)/g,'').trim(); });

  if(APP[timerKey]) clearInterval(APP[timerKey]);
  APP[timerKey] = setInterval(()=>{
    const inc = cap === 100 ? (Math.random()*3+1) : (Math.random()*2.2+0.8);
    pct = Math.min(cap, pct + inc);
    if(barEl)  barEl.style.width = pct + '%';
    if(pctEl)  pctEl.textContent = Math.round(pct) + '%';

    const ns = Math.floor(pct / 26);
    while(stepIdx < ns && stepIdx < 4){
      if(activeClass){
        if(stepIdx > 0 && stepEls[stepIdx-1]) stepEls[stepIdx-1].className = 'cm-step ' + stepClass;
        if(stepEls[stepIdx])                  stepEls[stepIdx].className   = 'cm-step ' + activeClass;
      } else {
        if(stepEls[stepIdx]) stepEls[stepIdx].classList.add(stepClass);
      }
      if(phaseEl && phases[stepIdx]) phaseEl.textContent = phases[stepIdx];
      stepIdx++;
    }

    if(pct >= cap && cap === 100){
      clearInterval(APP[timerKey]);
      if(onComplete) onComplete();
    }
  }, 80);
}

function startLoading(){
  const bar   = document.getElementById('loadBar');
  const pctEl = document.getElementById('loadPct');
  const steps = document.querySelectorAll('.load-step');
  if(!bar) return;

  steps.forEach(s => s.classList.remove('done'));

  // Phase label rotation (independent timer)
  if(APP._loadPhaseTimer) clearInterval(APP._loadPhaseTimer);
  _loadPhaseIdx = 0;
  APP._loadPhaseTimer = setInterval(()=>{
    const el = document.getElementById('loadPhase');
    if(el && document.getElementById('s-loading')?.classList.contains('active')){
      _loadPhaseIdx = (_loadPhaseIdx + 1) % LOAD_PHASES.length;
      el.textContent = LOAD_PHASES[_loadPhaseIdx];
    }
  }, 2000);

  runProgressAnim({
    barEl: bar, pctEl, stepEls: Array.from(steps),
    cap: 100, timerKey: '_loadTimer',
    onComplete(){
      clearInterval(APP._loadPhaseTimer);
      _submitQuizResult();
    }
  });
}

/* Submit quiz result to backend → populate APP state → navigate */
async function _submitQuizResult(){
  const payload = {
    gender:         APP.gender,
    birth_year:     APP.birthYear,
    zodiac:         APP.zodiac,
    rel_history:    APP.relHistory,
    current_status: APP.currentStatus,
    emotion:        APP.emotion,
    quiz_answers:   APP.quizAnswers,
    lang:           APP.lang,
  };

  try {
    const data = await apiCall('/api/user/submit', { method: 'POST', body: payload });

    // Populate APP from API response
    APP.blinkCode   = data.blink_code;
    APP.mbti        = data.mbti;
    APP.attachment  = (data.attachment || '').toLowerCase();
    APP.poeticName  = data.poetic_name;
    APP.archetype   = data.archetype || null;
    APP.monologue   = data.monologue;
    APP.profileData = data.profile;
  } catch(e) {
    // 402 = free quota exhausted → show paywall
    if (e.status === 402) {
      APP.freeSubmitsUsed = e.data?.free_submits_used ?? 2;
      go('s-paywall');
      return;
    }
    console.warn('[Blink] submit failed:', e.message);
    // Network/server error — show error message, do NOT use fake data in production
    if(!APP.blinkCode) {
      APP.blinkCode  = 'BLINK-' + Math.random().toString(36).slice(2,8).toUpperCase();
      APP.mbti       = 'INFP';
      APP.attachment = 'anxious';
      APP.poeticName = 'The Grounded Rose';
      APP.monologue  = 'Full signal. Never sends first.';
    }
  }

  syncResultScreen();

  // Check pending_dual — if user came from Dual screen, go back there
  if(PendingDual.consume()){
    go('s-dual');
    return;
  }

  setTimeout(()=> go('s-result'), 600);
}

/* ═══════════════════════════════════════════════
   _bindProfileData(p) — shared bindings that exist
   on BOTH S6 Result and S7 Detail screens.
   Call from syncResultScreen() and syncDetailScreen()
   to avoid duplicating any future changes.
═══════════════════════════════════════════════ */
function _bindProfileData(p){
  p = p || {};

  // MBTI type label (shared class on both screens)
  document.querySelectorAll('.result-mbti, .detail-type').forEach(el => {
    el.textContent = APP.mbti || 'INFP';
  });

  // Attachment badge (shared class)
  document.querySelectorAll('.result-attachment').forEach(el => {
    el.textContent = (APP.attachment || 'anxious').toUpperCase() + ' ATTACHMENT';
  });

  // Poetic name (shared class)
  document.querySelectorAll('.result-poetic-name').forEach(el => {
    el.textContent = APP.poeticName || '—';
  });

  // Soul Match MBTI + name (shared classes)
  const smMbtiA = document.querySelector('.result-soul-match-mbti');
  const smNameA = document.querySelector('.result-soul-match-name');
  if(smMbtiA && p.soul_match_mbti) smMbtiA.textContent = p.soul_match_mbti;
  if(smNameA && p.soul_match_name) smNameA.textContent = p.soul_match_name;

  // Strengths
  if(p.strengths && p.strengths.length){
    const strCards = document.querySelectorAll('.trait-card-h.str');
    p.strengths.forEach((s, i) => {
      if(strCards[i]){
        const lbl = strCards[i].querySelector('.trait-lbl');
        const txt = strCards[i].querySelector('.trait-text');
        if(lbl) lbl.textContent = 'STRENGTH 0' + (i+1);
        if(txt) txt.textContent = s.text || s;
      }
    });
  }

  // Blind Spots
  if(p.blind_spots && p.blind_spots.length){
    const blindCards = document.querySelectorAll('.trait-card-h.blind');
    p.blind_spots.forEach((b, i) => {
      if(blindCards[i]){
        const lbl = blindCards[i].querySelector('.trait-lbl');
        const txt = blindCards[i].querySelector('.trait-text');
        if(lbl) lbl.textContent = 'BLINDSPOT 0' + (i+1);
        if(txt) txt.textContent = b.text || b;
      }
    });
  }
}

/* ═══════════════════════════════════════════════
   S6 RESULT — sync display with APP state
   In production: all data comes from API via APP.profileData
═══════════════════════════════════════════════ */
function syncResultScreen(){
  const p = APP.profileData || {};

  _bindProfileData(p);

  // BLINK code
  const codeEl = document.getElementById('myCode');
  if(codeEl) codeEl.textContent = APP.blinkCode || '—';

  // Open Blink strip — social proof numbers (decorative, same-type based)
  const pct = p.same_type_pct != null ? p.same_type_pct : 0.128;
  const totalUsers = 48000 + Math.floor(Math.random()*800);
  const matchCount = Math.floor(totalUsers * pct);
  const nearPct = Math.floor(8 + Math.random() * 6); // 8–14%
  const countEl = document.getElementById('openBlinkCount');
  const pctEl2  = document.getElementById('openBlinkPct');
  if(countEl) countEl.textContent = matchCount.toLocaleString();
  if(pctEl2)  pctEl2.textContent  = nearPct + '%';

  // One-line description in attachment card (emotion-aware, from API)
  const oneLineEl = document.querySelector('.result-one-line');
  if(oneLineEl && p.one_line) oneLineEl.textContent = p.one_line;

  // Full description paragraph
  const descEl = document.querySelector('.result-description');
  if(descEl && p.description) descEl.textContent = p.description;

  // EQ Score — count-up animation
  const eqEl = document.querySelector('.result-eq-val');
  if(eqEl && p.eq_score != null) countUp(eqEl, p.eq_score, 1400);

  // Same type count + percentage
  const sameValEl = document.querySelector('.result-same-type-val');
  const sameSubEl = document.querySelector('.result-same-type-sub');
  if(sameValEl && p.same_type_pct != null) {
    const totalUsers = 48000 + Math.floor(Math.random()*800);
    const pct = p.same_type_pct;
    countUp(sameValEl, Math.floor(totalUsers * pct), 1200);
    if(sameSubEl) sameSubEl.textContent = (pct * 100).toFixed(1) + '% of users';
  }
}

/* ═══════════════════════════════════════════════
   S7 DETAIL — sync from APP.profileData
═══════════════════════════════════════════════ */
function syncDetailScreen(){
  const p = APP.profileData || {};

  _bindProfileData(p);

  // Header (detail-specific fields not in _bindProfileData)
  const nameEl = document.querySelector('.detail-name');
  if(nameEl) nameEl.textContent = APP.poeticName || 'The Grounded Rose';

  const attachEl = document.querySelector('.detail-attach span:last-child');
  if(attachEl) attachEl.textContent = ((APP.attachment || 'Anxious')[0].toUpperCase() + (APP.attachment || 'Anxious').slice(1)) + ' · Attachment Style';

  // archetype: v2.0 预留，v1.0 不展示，DOM element 已删除

  // Soul Match
  const smMbtiEl = document.querySelector('.match-chip');
  if(smMbtiEl && p.soul_match_mbti) smMbtiEl.textContent = p.soul_match_mbti;

  const smNameEl = document.querySelector('.match-desc strong');
  if(smNameEl && p.soul_match_name) smNameEl.textContent = p.soul_match_name;

  const smReasonEl = document.querySelector('.match-desc span');
  if(smReasonEl && p.soul_match_reason) smReasonEl.textContent = p.soul_match_reason;

  // Love Letter
  const llEl = document.querySelector('.love-letter');
  if(llEl && p.love_letter) llEl.innerHTML = p.love_letter.replace(/\n/g, '<br>');

  // Radar — update live values if API data present, then always draw
  if(p.depth != null) {
    APP._radarValues = {
      depth: p.depth, guard: p.guard, heat: p.heat,
      heal: p.heal, read: p.read_score
    };
    // Sync legend bars + values
    const dims = [
      { key:'depth', color:'#A78BFA' },
      { key:'guard', color:'#60B8CC' },
      { key:'heat',  color:'#C87A8A' },
      { key:'heal',  color:'#5EC487' },
      { key:'read',  color:'#FBBF24' },
    ];
    const legItems = document.querySelectorAll('.escan-leg-item');
    dims.forEach((d, i) => {
      const v = APP._radarValues[d.key] || 0;
      const pct = Math.round(v * 100);
      const bar = legItems[i]?.querySelector('.escan-leg-bar');
      const val = legItems[i]?.querySelector('.escan-leg-val');
      if(bar){ bar.style.width = pct + '%'; bar.style.background = d.color; }
      if(val) val.textContent = pct;
    });
  }
  setTimeout(()=> drawRadar(APP._radarValues), 80);
}

/* ── Count-up animation ── */
function countUp(el, target, duration, suffix=''){
  if(!el) return;
  const start = performance.now();
  (function frame(now){
    const t    = Math.min((now-start)/duration, 1);
    const ease = 1 - Math.pow(1-t, 3);
    el.textContent = Math.round(target * ease).toLocaleString() + suffix;
    if(t < 1) requestAnimationFrame(frame);
  })(performance.now());
}

/* ── Retake test ── */
function retakeQuiz(){
  // Clear quiz + profile state, keep compat history intact
  APP.quizAnswers = [];
  APP.quizIdx = 0;
  APP.mbti = null;
  APP.attachment = null;
  APP.poeticName = null;
  APP.blinkCode = null;
  APP.monologue = null;
  APP.profileData = null;
  APP.freeSubmitsUsed = 0;
  // Reset info fields
  APP.gender = null;
  APP.zodiac = null;
  APP.birthYear = 2000;
  APP.relHistory = 0;
  APP.currentStatus = null;
  APP.emotion = null;
  // Clear chip selections visually
  document.querySelectorAll('#s-info .chip.sel').forEach(c => c.classList.remove('sel'));
  document.querySelectorAll('.zodiac-chip.sel').forEach(c => c.classList.remove('sel'));
  go('s-info');
}

/* ── Copy BLINK code ── */
function copyCode(){
  const code = document.getElementById('myCode')?.textContent || APP.blinkCode;
  navigator.clipboard?.writeText(code).catch(()=>{});
  const btn = document.getElementById('copyBtn');
  const txt = document.getElementById('copyBtnTxt');
  if(txt) txt.textContent = '✓ Copied';
  btn?.classList.add('copied');
  setTimeout(()=>{ if(txt) txt.textContent = 'Copy'; btn?.classList.remove('copied'); }, 1500);
}

/* ── Telegram share ── */
const BOT_URL = 'https://t.me/blink_aimatch_bot';

function tgShare(){
  const code = APP.blinkCode;
  const mbti = APP.mbti;
  const name = APP.poeticName;
  const text = encodeURIComponent(
    `I just found my love personality on Blink ✨\n\nI'm an ${mbti} — ${name} 🌹\nMy code: ${code}\n\nEnter my code to check our compatibility 👉`
  );
  window.open(`https://t.me/share/url?url=${encodeURIComponent(BOT_URL)}&text=${text}`, '_blank');
}

function tgInvite(){
  const text = encodeURIComponent('Take this 2-min love personality test — see how compatible we are 💫');
  window.open(`https://t.me/share/url?url=${encodeURIComponent(BOT_URL)}&text=${text}`, '_blank');
}

/* ═══════════════════════════════════════════════
   S7 DETAIL — tabs
═══════════════════════════════════════════════ */
function switchTab(btn, id){
  btn.closest('.screen').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-rat')?.classList.toggle('hidden', id !== 'rat');
  document.getElementById('tab-let')?.classList.toggle('hidden', id !== 'let');
}

/* ═══════════════════════════════════════════════
   RADAR CANVAS — animated draw
═══════════════════════════════════════════════ */
/**
 * drawRadar(values?)
 *   values — optional {depth, guard, heat, heal, read} object (0–1 floats).
 *   Falls back to APP._radarValues, then to hardcoded demo defaults.
 *   Pass values explicitly from call-sites that already have the data
 *   to avoid coupling to the global APP._radarValues name.
 */
function drawRadar(values){
  // Use explicit values → live APP cache → demo defaults
  const rv = values || APP._radarValues || { depth:0.82, guard:0.65, heat:0.48, heal:0.38, read:0.91 };
  const canvas = document.getElementById('radarCanvas');
  if(!canvas) return;

  // HiDPI support — scale canvas for crisp rendering on retina screens
  const dpr = window.devicePixelRatio || 1;
  const SIZE = 160;
  canvas.width  = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width  = SIZE + 'px';
  canvas.style.height = SIZE + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = SIZE, H = SIZE;
  const cx = W/2, cy = H/2;
  const R  = 62;
  const data   = [rv.depth||0.5, rv.guard||0.5, rv.heat||0.5, rv.heal||0.5, rv.read||0.5];
  const colors = ['#A78BFA','#60B8CC','#C87A8A','#5EC487','#FBBF24'];
  const N = 5;
  const ao = -Math.PI/2;

  function pt(i, r){ const a = ao + (2*Math.PI/N)*i; return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; }

  function drawGrid(){
    for(let ring=1;ring<=4;ring++){
      ctx.beginPath();
      for(let i=0;i<N;i++){
        const [x,y]=pt(i,R*(ring/4));
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1; ctx.stroke();
    }
    for(let i=0;i<N;i++){
      const [x,y]=pt(i,R);
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y);
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1; ctx.stroke();
    }
  }

  function drawFrame(progress){
    ctx.clearRect(0,0,W,H);
    drawGrid();
    ctx.beginPath();
    for(let i=0;i<N;i++){
      const [x,y]=pt(i,R*data[i]*progress);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle='rgba(120,80,220,0.10)'; ctx.fill();
    ctx.strokeStyle='rgba(120,80,220,0.32)'; ctx.lineWidth=1.5; ctx.stroke();
    for(let i=0;i<N;i++){
      const [x,y]=pt(i,R*data[i]*progress);
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle=colors[i]; ctx.shadowColor=colors[i]; ctx.shadowBlur=10;
      ctx.fill(); ctx.shadowBlur=0;
    }
  }

  const dur=800, t0=performance.now();
  (function frame(now){
    const t = Math.min((now-t0)/dur,1);
    drawFrame(1 - Math.pow(1-t,3));
    if(t<1) requestAnimationFrame(frame);
  })(t0);
}

/* ═══════════════════════════════════════════════
   S8 DUAL — code input, validation, payment flow
═══════════════════════════════════════════════ */

/* Sync dual page: pre-fill code A if user has completed the quiz */
function syncDualScreen(){
  const inpA = document.getElementById('codeA');
  if(inpA && !inpA.value) _updateCompatBtn();
  _setCodeError('codeA');
  _setCodeError('codeB');
  _loadHistory();
}

/* Load and render history */
async function _loadHistory(){
  const listEl = document.getElementById('historyList');
  if(!listEl) return;

  // Use cached data if available
  if(APP.historyData && APP.historyData.length > 0){
    _renderHistory(APP.historyData);
    return;
  }

  try {
    const data = await apiCall('/api/compat/history');
    APP.historyData = data.history || [];
    _renderHistory(APP.historyData);
  } catch(e) {
    // Silently fail — history is non-critical
  }
}

function _renderHistory(items){
  const listEl = document.getElementById('historyList');
  if(!listEl) return;
  if(!items || items.length === 0){
    listEl.innerHTML = '<div class="history-empty">No readings yet</div>';
    return;
  }
  listEl.innerHTML = items.map(item => `
    <div class="history-item" onclick="openHistoryReport('${item.report_id}')">
      <div class="history-codes">
        <span class="code-a">${item.code_a || '—'}</span>
        <span class="sep">×</span>
        <span class="code-b">${item.code_b || '—'}</span>
      </div>
      <div class="history-score">${item.compat_score || '—'}%</div>
    </div>
  `).join('');
}

function openHistoryReport(reportId){
  // Fetch report and navigate to S9
  apiCall(`/api/compat/status/${reportId}`)
    .then(data => {
      if(data.report){
        APP.compatReport = data.report;
        syncReportScreen();
        go('s-report');
      }
    })
    .catch(() => {});
}

/* "Fill mine" — if no result, redirect to quiz start with pending_dual flag */
function fillMyCode(){
  const hasResult = !!APP.blinkCode;
  if(!hasResult){
    // Mark intent: after quiz completes, auto-return to Dual screen
    PendingDual.set();
    go('s-info');
    // Show context banner so user knows why they landed here
    const banner = document.getElementById('pendingDualBanner');
    if(banner) banner.style.display = 'flex';
    return;
  }
  const inp = document.getElementById('codeA');
  if(inp){
    inp.value = APP.blinkCode;
    inp.classList.add('prefilled');
    _setCodeError('codeA');
    APP.compatCodeA = APP.blinkCode;
    _updateCompatBtn();
  }
}

/* Live input: uppercase, strip invalid chars, enable CTA when both valid */
function onCodeInput(inp, _unused){
  const raw = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g,'');
  inp.value = raw;
  _setCodeError(inp.id);
  if(inp.id === 'codeA') APP.compatCodeA = raw;
  if(inp.id === 'codeB') APP.compatCodeB = raw;
  _updateCompatBtn();
}

function _updateCompatBtn(){
  const a = document.getElementById('codeA')?.value || '';
  const b = document.getElementById('codeB')?.value || '';
  const btn = document.getElementById('compatBtn');
  const valid = _isValidCode(a) && _isValidCode(b);
  if(btn){
    btn.disabled = !valid;
    btn.style.opacity = valid ? '1' : '.5';
  }
}

// Valid format: BLINK-XXXXXX where XXXXXX is 6 alphanumeric chars
function _isValidCode(code){
  return /^BLINK-[A-Z0-9]{6}$/.test(code);
}

/**
 * _setCodeError(inputId, msg)
 *   msg truthy  → show error state with message
 *   msg null    → clear error state
 */
function _setCodeError(inputId, msg=null){
  const inp = document.getElementById(inputId);
  if(!inp) return;
  if(msg){
    inp.classList.add('error');
    let errEl = inp.parentElement.querySelector('.code-error-msg');
    if(!errEl){
      errEl = document.createElement('div');
      errEl.className = 'code-error-msg';
      inp.parentElement.appendChild(errEl);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } else {
    inp.classList.remove('error');
    const errEl = inp.parentElement?.querySelector('.code-error-msg');
    if(errEl) errEl.style.display = 'none';
  }
}

/* Swap codes A ↔ B */
function swapCodes(){
  const a = document.getElementById('codeA');
  const b = document.getElementById('codeB');
  if(!a || !b) return;
  const tmp = a.value; a.value = b.value; b.value = tmp;
  APP.compatCodeA = a.value; APP.compatCodeB = b.value;
  _setCodeError('codeA'); _setCodeError('codeB');
  _updateCompatBtn();
}

/* Check compatibility — validate codes then open payment confirm modal */
async function checkCompat(){
  const cA = document.getElementById('codeA')?.value || '';
  const cB = document.getElementById('codeB')?.value || '';

  // Format validation
  if(!_isValidCode(cA)){
    _setCodeError('codeA', 'Enter a valid BLINK code (e.g. BLINK-7K3M2P)');
    return;
  }
  if(!_isValidCode(cB)){
    _setCodeError('codeB', 'Enter a valid BLINK code (e.g. BLINK-4R9FXQ)');
    return;
  }
  if(cA === cB){
    _setCodeError('codeB', 'Codes must be different');
    return;
  }

  // Verify both codes exist via API and fetch poetic names
  try {
    const [dataA, dataB] = await Promise.all([
      apiCall(`/api/user/lookup?code=${cA}`),
      apiCall(`/api/user/lookup?code=${cB}`),
    ]).catch(async (e) => {
      if (e.status === 404) {
        // Re-run individually to identify which code failed
        const rA = await apiCall(`/api/user/lookup?code=${cA}`).catch(err => ({ _err: err }));
        const rB = await apiCall(`/api/user/lookup?code=${cB}`).catch(err => ({ _err: err }));
        if (rA._err?.status === 404) { _setCodeError('codeA', 'User not found'); return null; }
        if (rB._err?.status === 404) { _setCodeError('codeB', 'User not found'); return null; }
      }
      _setCodeError('codeA', 'Network error, please retry');
      return null;
    });
    if (!dataA || !dataB) return;

    // Extract poetic names to show in confirm modal
    try {
      const poeticA = dataA.poetic_name || '';
      const poeticB = dataB.poetic_name || '';
      const namesEl = document.getElementById('cmPoeticNames');
      const elA = document.getElementById('cmPoeticA');
      const elB = document.getElementById('cmPoeticB');
      if(namesEl && poeticA && poeticB){
        if(elA) elA.textContent = poeticA;
        if(elB) elB.textContent = poeticB;
        namesEl.style.display = 'block';
      }
    } catch(e){ /* non-critical, skip */ }
  } catch(e) {
    _setCodeError('codeA', 'Network error, please retry'); return;
  }

  // Both codes valid — show payment confirm modal
  APP.compatCodeA = cA; APP.compatCodeB = cB;
  document.getElementById('cmBadgeA').textContent = cA.slice(6);
  document.getElementById('cmBadgeB').textContent = cB.slice(6);
  document.getElementById('cmConfirm').style.display  = 'block';
  document.getElementById('cmLoading').style.display  = 'none';
  document.getElementById('compatModal').classList.add('open');
}

function closeCompatModal(){
  document.getElementById('compatModal').classList.remove('open');
  if(APP._cmTimer) clearInterval(APP._cmTimer);
  // Reset poetic names for next open
  const namesEl = document.getElementById('cmPoeticNames');
  if(namesEl) namesEl.style.display = 'none';
}

/* Payment confirm → create invoice → open Telegram payment → poll for result */
async function startCompatAnalysis(){
  const tg = window.Telegram?.WebApp;

  const _runLoading = () => {
    document.getElementById('cmConfirm').style.display = 'none';
    const loadEl = document.getElementById('cmLoading');
    loadEl.style.display = 'flex';

    const cmPhases = [
      'Reading emotional patterns…',
      'Analyzing attachment styles…',
      'Modeling love dynamics…',
      'Generating your reading…'
    ];
    runProgressAnim({
      barEl:       document.getElementById('cmBar'),
      pctEl:       document.getElementById('cmPct'),
      stepEls:     [0,1,2,3].map(i => document.getElementById('cmStep'+i)),
      phaseEl:     document.getElementById('cmPhase'),
      phases:      cmPhases,
      cap:         96,
      timerKey:    '_cmTimer',
      stepClass:   'done',
      activeClass: 'active',
    });
  };

  const _onPaymentSuccess = () => {
    _runLoading();
    _pollCompatReport();
  };

  const _onPaymentError = (msg) => {
    closeCompatModal();
    // Show inline error on Dual screen
    const errEl = document.getElementById('dualPayError');
    if(errEl){ errEl.textContent = msg || 'Payment failed. Please try again.'; errEl.style.display = 'block'; }
  };

  if(tg && tg.openInvoice) {
    // ── Production path ──
    try {
      const { invoice_link, report_id } = await apiCall('/api/compat/invoice', {
        method: 'POST',
        body: { code_a: APP.compatCodeA, code_b: APP.compatCodeB }
      });
      APP.compatReportId = report_id;

      tg.openInvoice(invoice_link, status => {
        if(status === 'paid') {
          _onPaymentSuccess();
        } else if(status === 'cancelled') {
          closeCompatModal();
        } else {
          _onPaymentError('Payment was not completed.');
        }
      });
    } catch(e) {
      _onPaymentError('Could not create invoice. Please try again.');
    }
  } else {
    // ── Browser preview — skip payment ──
    APP.compatReportId = 'preview-' + Date.now();
    _runLoading();
    // Simulate API response after 3s in preview
    setTimeout(_showCompatResult, 3000);
  }
}

/* Poll /api/compat/status/:report_id until done or failed */
function _pollCompatReport(){
  if(!APP.compatReportId) return;
  if(APP._pollTimer) clearInterval(APP._pollTimer);

  const MAX_ATTEMPTS = 40; // 40 × 3s = 2 min, GPT completes within 90s
  let attempts = 0;

  APP._pollTimer = setInterval(async () => {
    attempts++;
    if(attempts > MAX_ATTEMPTS){
      clearInterval(APP._pollTimer);
      _showCompatError('Taking longer than expected. Your result is being saved — please reopen the app in a moment.');
      return;
    }
    try {
      const data = await apiCall(`/api/compat/status/${APP.compatReportId}`);

      if(data.status === 'done'){
        clearInterval(APP._pollTimer);
        APP.compatReport = data.report;
        // Complete the progress bar to 100%
        const bar   = document.getElementById('cmBar');
        const pctEl = document.getElementById('cmPct');
        if(APP._cmTimer) clearInterval(APP._cmTimer);
        if(bar)   bar.style.width = '100%';
        if(pctEl) pctEl.textContent = '100%';
        setTimeout(_showCompatResult, 500);

      } else if(data.status === 'failed'){
        clearInterval(APP._pollTimer);
        _showCompatError('Analysis failed. Tap retry — no additional charge.');
      }
      // pending / generating → keep polling
    } catch(e) {
      // network error — keep polling silently
    }
  }, 3000);
}

function _showCompatError(msg){
  if(APP._cmTimer) clearInterval(APP._cmTimer);
  document.getElementById('cmLoading').style.display = 'none';
  // Show retry UI inside modal
  const retryEl = document.getElementById('cmRetry');
  if(retryEl){
    retryEl.querySelector('.cm-retry-msg').textContent = msg;
    retryEl.style.display = 'flex';
  } else {
    closeCompatModal();
    alert(msg); // fallback
  }
}

/* Retry compat generation (free — charge_id already stored on backend) */
async function retryCompatAnalysis(){
  const retryEl = document.getElementById('cmRetry');
  if(retryEl) retryEl.style.display = 'none';
  document.getElementById('cmLoading').style.display = 'flex';

  try {
    await apiCall('/api/compat/retry', { method: 'POST', body: { report_id: APP.compatReportId } });
    _pollCompatReport();
  } catch(e) {
    _showCompatError('Retry failed. Please try again.');
  }
}

function _showCompatResult(){
  if(APP._cmTimer) clearInterval(APP._cmTimer);
  document.getElementById('cmLoading').style.display = 'none';
  document.getElementById('compatModal').classList.remove('open');
  setTimeout(()=>{
    syncReportScreen();
    go('s-report');
  }, 300);
}

/* Sync report screen with APP compat state + report data */
function syncReportScreen(){
  const cA = APP.compatCodeA || APP.blinkCode || 'BLINK-????';
  const cB = APP.compatCodeB || 'BLINK-4R9F';
  const r  = APP.compatReport || {};

  // UID pill
  const uidEl = document.querySelector('.report-uid-code');
  if(uidEl) uidEl.textContent = `${cA} × ${cB}`;

  // Date
  const dateEl = document.querySelector('.report-uid-date');
  if(dateEl) {
    const d = r.generated_at ? new Date(r.generated_at) : new Date();
    dateEl.textContent = d.toLocaleDateString('en', {month:'short', year:'numeric'});
  }

  if(!r.compat_score) return; // no real data yet — keep static demo content

  // Compat score (big number)
  const scoreEl = document.querySelector('.report-score-val, .report-score');
  if(scoreEl) countUp(scoreEl, r.compat_score, 1400);

  // Pairing name
  const pairingEl = document.querySelector('.report-pairing-name, .report-title');
  if(pairingEl && r.pairing_name) pairingEl.textContent = r.pairing_name;

  // 4-dimension bars
  const dimMap = {
    'emotional':      r.dim_emotional,
    'communication':  r.dim_communication,
    'growth':         r.dim_growth,
    'intimacy':       r.dim_intimacy
  };
  Object.entries(dimMap).forEach(([key, val]) => {
    const barEl = document.querySelector(`.report-dim-bar[data-dim="${key}"]`);
    const valEl = document.querySelector(`.report-dim-val[data-dim="${key}"]`);
    if(barEl && val != null) barEl.style.width = val + '%';
    if(valEl && val != null) valEl.textContent = val + '%';
  });

  // Core energy paragraph
  const coreEl = document.querySelector('.report-core-energy, .report-section-body');
  if(coreEl && r.core_energy) coreEl.textContent = r.core_energy;

  // Growth edges
  if(r.growth_edges && r.growth_edges.length) {
    const edgeEls = document.querySelectorAll('.report-edge');
    r.growth_edges.forEach((edge, i) => {
      if(!edgeEls[i]) return;
      const trigEl = edgeEls[i].querySelector('.edge-trigger');
      const sugEl  = edgeEls[i].querySelector('.edge-suggestion');
      if(trigEl) trigEl.textContent = edge.trigger || '';
      if(sugEl)  sugEl.textContent  = edge.suggestion || '';
    });
  }

  // Love languages
  if(r.love_languages) {
    const llAEl = document.querySelector('.love-lang-a');
    const llBEl = document.querySelector('.love-lang-b');
    const llNoteEl = document.querySelector('.love-lang-note');
    if(llAEl && r.love_languages.person_a) llAEl.textContent = r.love_languages.person_a;
    if(llBEl && r.love_languages.person_b) llBEl.textContent = r.love_languages.person_b;
    if(llNoteEl && r.love_languages.match_note) llNoteEl.textContent = r.love_languages.match_note;
  }

  // Letter to the pair
  const letterEl = document.querySelector('.report-letter');
  if(letterEl && r.letter) letterEl.innerHTML = r.letter.replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════════════
   S9 REPORT — already populated with static data
   In production: filled by API response
═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   POSTER CANVAS
═══════════════════════════════════════════════ */
function openPoster(){
  document.getElementById('posterOverlay').classList.add('open');
  document.fonts.load('italic 700 72px "Playfair Display"').then(()=>{
    setTimeout(drawPoster, 80);
  });
}
function closePoster(e){
  if(e.target === document.getElementById('posterOverlay')) closePosterDirect();
}
function closePosterDirect(){
  document.getElementById('posterOverlay').classList.remove('open');
}

/* ═══════════════════════════════════════════════
   SOCIAL PROOF counter
═══════════════════════════════════════════════ */

/* S-Paywall → create retest invoice → open Telegram payment */
async function startRetestPayment() {
  const tg = window.Telegram?.WebApp;
  try {
    const { invoice_link } = await apiCall('/api/user/retest-invoice', { method: 'POST' });
    if (tg?.openInvoice) {
      tg.openInvoice(invoice_link, status => {
        if (status === 'paid') {
          // Payment success — re-run submit flow from loading screen
          go('s-loading');
          startLoading();
        } else if (status === 'cancelled') {
          // User closed payment — stay on paywall silently
        } else {
          alert('Payment failed. Please try again.');
        }
      });
    }
  } catch(e) {
    console.error('[Blink] retest invoice error:', e.message);
    alert('Could not create invoice. Please try again.');
  }
}

(function initSocialProof(){
  const el = document.getElementById('socialProof');
  if(!el) return;
  el.textContent = (180000 + Math.floor(Math.random()*40000)).toLocaleString();
})();

/* ═══════════════════════════════════════════════
   UTILITY — shake animation for validation errors
═══════════════════════════════════════════════ */
function shakeEl(el){
  if(!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake .35s ease';
  setTimeout(()=>{ el.style.animation=''; }, 400);
}

/* ═══════════════════════════════════════════════
   INFO PAGE — wire up Continue button
═══════════════════════════════════════════════ */
(function(){
  // Replace onclick="go('s-emotion')" with validated version
  const continueBtn = document.querySelector('#s-info .btn-primary');
  if(continueBtn){
    continueBtn.removeAttribute('onclick');
    continueBtn.addEventListener('click', goFromInfo);
  }
})();

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
setTimeout(()=>{
  // Populate birth year options 1985–2015, default 2000
  const yearSel = document.getElementById('birthYear');
  if(yearSel){
    for(let y = 2015; y >= 1985; y--){
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      if(y === 2000) opt.selected = true;
      yearSel.appendChild(opt);
    }
  }
  const sl = document.getElementById('relSlider');
  if(sl) updateSlider(sl);
  // Set initial screen tag so CSS hides bnav on landing
  document.body.dataset.screen = 's-landing';
  _screenHistory.push('s-landing');

  // ── App startup: restore user state from backend ──
  initAppState();
}, 100);

/* ═══════════════════════════════════════════════
   APP INIT — restore user state on every open
   1. Call /api/user/init (register or fetch existing user)
   2. If user has a result → populate APP state
   3. Check for pending compat report (paid but disconnected)
   4. Check pending_dual flag → auto-navigate back to Dual
═══════════════════════════════════════════════ */
async function initAppState() {
  // Parse referral user_id from Telegram start param
  // Format: ref_<user_id>  e.g. ref_123456789
  const startParam = tgWebApp?.initDataUnsafe?.start_param || '';
  const refUserId = startParam.startsWith('ref_') ? startParam.slice(4) : null;

  try {
    const data = await apiCall('/api/user/init', {
      method: 'POST',
      body: { ref: refUserId, lang: APP.lang }
    });

    // If user already has a completed profile, restore it
    if (data.blink_code) {
      APP.blinkCode     = data.blink_code;
      APP.mbti          = data.mbti;
      APP.attachment    = (data.attachment || '').toLowerCase();
      APP.poeticName    = data.poetic_name;
      APP.archetype     = data.archetype || null;
      APP.monologue     = data.monologue;
      APP.gender        = data.gender;
      APP.currentStatus = data.current_status;
      APP.profileData     = data.profile;
      APP.freeSubmitsUsed = data.free_submits_used ?? 0;

      // Check for pending compat report (paid but user disconnected)
      if (data.pending_report_id) {
        APP.compatReportId = data.pending_report_id;
        APP.compatCodeA    = data.pending_code_a || '';
        APP.compatCodeB    = data.pending_code_b || '';
        _pollCompatReport(); // resume polling, show result when ready
      }

      // Check pending_dual flag — user was redirected to quiz from Dual screen
      if(PendingDual.consume()){
        go('s-dual');
        return;
      }

      // Default: go straight to result screen (skip onboarding)
      go('s-result');
      return;
    }
  } catch(e) {
    // API unavailable (browser preview or network error) — continue normally
    console.warn('[Blink] initAppState failed, running in preview mode:', e.message);
  }

  // No existing result → show landing
  go('s-landing');
}

/* ═══════════════════════════════════════════════
   POSTER CANVAS v3
   Layout (750×1125):
   ┌─────────────────────────────┐
   │  B L I N K         [zodiac] │  ← top bar
   │                             │
   │         I N F P             │  ← hero MBTI (3-layer glow)
   │    The Grounded Rose        │  ← poetic name italic
   │                             │
   │  ── hairline ──             │
   │  ANXIOUS ATTACHMENT         │  ← attachment pill row
   │  ── hairline ──             │
   │                             │
   │  "Full signal.              │  ← monologue quote block
   │   Never sends first."       │
   │                             │
   │  ── hairline ──             │
   │  SAME TYPE  EQ SCORE  MATCH │  ← 3-col stats
   │  ── hairline ──             │
   │                             │
   │  ⊙ BLINK-7K3M               │  ← neon code
   │                             │
   │  footer cta + handle        │
   └─────────────────────────────┘
═══════════════════════════════════════════════ */
function drawPoster(){
  const cv = document.getElementById('posterCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const W=750, H=1125;
  cv.width=W; cv.height=H;
  ctx.clearRect(0,0,W,H);

  // ── BG ──
  ctx.fillStyle='#0D0A1E'; ctx.fillRect(0,0,W,H);
  [[W*0.1,H*0.18,520,100,45,220,0.22],[W*0.86,H*0.76,480,170,50,130,0.16]].forEach(([x,y,r,R,G,B,a])=>{
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${R},${G},${B},${a})`);
    g.addColorStop(0.55,`rgba(${R},${G},${B},${a*0.3})`);
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  });
  const vig=ctx.createRadialGradient(W/2,H*0.45,H*0.22,W/2,H*0.45,H*0.72);
  vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(3,1,10,0.6)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){
    ctx.beginPath(); ctx.arc(Math.random()*W,Math.random()*H,Math.random()*0.8+0.1,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${Math.random()*0.16+0.03})`; ctx.fill();
  }

  // ── helpers ──
  const rule=(y,op=0.14)=>{
    const g=ctx.createLinearGradient(75,0,W-75,0);
    g.addColorStop(0,'transparent');
    g.addColorStop(0.2,`rgba(200,195,255,${op})`);
    g.addColorStop(0.8,`rgba(200,195,255,${op})`);
    g.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.moveTo(75,y); ctx.lineTo(W-75,y);
    ctx.strokeStyle=g; ctx.lineWidth=0.5; ctx.setLineDash([]); ctx.stroke();
  };

  // ── data ──
  const mbti      = APP.mbti || 'INFP';
  const name      = APP.poeticName || 'The Grounded Rose';
  const attach    = (APP.attachment || 'anxious').toUpperCase() + ' ATTACHMENT';
  const ZODIAC_MAP= {aries:'♈',taurus:'♉',gemini:'♊',cancer:'♋',leo:'♌',virgo:'♍',
                     libra:'♎',scorpio:'♏',sagittarius:'♐',capricorn:'♑',aquarius:'♒',pisces:'♓'};
  const zodiacSign = APP.zodiac || 'aquarius';
  const zodiacSym  = ZODIAC_MAP[zodiacSign] || '♒';
  const zodiacLabel= zodiacSym + '  ' + zodiacSign.toUpperCase();
  const mono       = APP.monologue || '';
  const matchType  = APP.profileData?.soul_match_mbti || 'ENFJ';
  const matchName  = APP.profileData?.soul_match_name || 'The Protagonist';
  const code       = APP.blinkCode || 'BLINK-??????';

  // ── TOP BAR ──
  ctx.textAlign='left'; ctx.letterSpacing='0.5em';
  ctx.font='400 13px "JetBrains Mono",monospace';
  ctx.fillStyle='rgba(155,109,255,0.5)';
  ctx.fillText('B L I N K', 60, 62);

  ctx.textAlign='right'; ctx.letterSpacing='0.06em';
  ctx.font='400 15px "JetBrains Mono",monospace';
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.fillText(zodiacLabel, W-60, 62);

  rule(82, 0.08);

  // ── MBTI HERO ──
  const mbtiY = 288;
  ctx.textAlign='center'; ctx.letterSpacing='0.14em';
  ctx.font=`800 135px "JetBrains Mono",monospace`;
  ctx.shadowColor='rgba(155,109,255,0.3)'; ctx.shadowBlur=138;
  ctx.fillStyle='rgba(185,165,255,0.04)'; ctx.fillText(mbti,W/2,mbtiY);
  ctx.shadowColor='rgba(185,165,255,0.5)'; ctx.shadowBlur=55;
  ctx.fillStyle='rgba(185,165,255,0.2)';  ctx.fillText(mbti,W/2,mbtiY);
  ctx.shadowColor='rgba(235,228,255,0.88)'; ctx.shadowBlur=17;
  ctx.fillStyle='rgba(240,235,255,0.85)';   ctx.fillText(mbti,W/2,mbtiY);
  ctx.shadowBlur=0;

  // ── POETIC NAME ──
  ctx.letterSpacing='0.22em';
  ctx.font='italic 400 21px "Playfair Display",Georgia,serif';
  ctx.fillStyle='rgba(185,165,255,0.48)';
  ctx.fillText(name.toUpperCase(), W/2, 335);

  rule(365, 0.1);

  // ── ATTACHMENT PILL ROW ──
  ctx.letterSpacing='0';
  ctx.font='600 14px "JetBrains Mono",monospace';
  const attachFull = attach + '   ·   ' + zodiacSym + ' ' + zodiacSign.toUpperCase();
  const aw = ctx.measureText(attachFull).width;
  const rowY = 398;
  const dotX = W/2 - aw/2 - 17;
  ctx.beginPath(); ctx.arc(dotX, rowY-4, 4.5, 0, Math.PI*2);
  ctx.fillStyle='rgba(155,109,255,0.8)';
  ctx.shadowColor='rgba(155,109,255,0.8)'; ctx.shadowBlur=10;
  ctx.fill(); ctx.shadowBlur=0;

  ctx.textAlign='left'; ctx.letterSpacing='0.08em';
  ctx.font='600 14px "JetBrains Mono",monospace';
  ctx.fillStyle='rgba(185,165,255,0.72)';
  ctx.fillText(attach, W/2 - aw/2, rowY);
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.fillText('   ·   ', W/2 - aw/2 + ctx.measureText(attach).width, rowY);
  ctx.fillStyle='rgba(255,255,255,0.42)';
  const sepW = ctx.measureText(attach + '   ·   ').width;
  ctx.fillText(zodiacSym + ' ' + zodiacSign.toUpperCase(), W/2 - aw/2 + sepW, rowY);

  rule(420, 0.1);

  // ── MONOLOGUE QUOTE ──
  const quoteY = 473;
  ctx.textAlign='left'; ctx.letterSpacing='0';
  ctx.font='300 70px "Playfair Display",Georgia,serif';
  ctx.fillStyle='rgba(155,109,255,0.16)';
  ctx.fillText('\u201C', 60, quoteY + 8);

  ctx.font='700 29px Inter,sans-serif';
  const maxLineWidth = W - 90 - 65;
  const monoWords = mono.split(' ');
  const wrappedLines = [];
  let curLine = '';
  monoWords.forEach(w => {
    const test = curLine ? curLine + ' ' + w : w;
    if(ctx.measureText(test).width > maxLineWidth && curLine){
      wrappedLines.push(curLine); curLine = w;
    } else { curLine = test; }
  });
  if(curLine) wrappedLines.push(curLine);
  const monoLines = wrappedLines.slice(0, 3);

  monoLines.forEach((ln, i) => {
    const isLast = i === monoLines.length - 1;
    ctx.font = i === 0 ? '700 29px Inter,sans-serif' : '400 26px Inter,sans-serif';
    ctx.fillStyle = i === 0 ? 'rgba(245,242,255,0.92)' : 'rgba(200,195,230,0.65)';
    ctx.letterSpacing = '-0.01em'; ctx.textAlign = 'left';
    ctx.fillText(ln + (isLast ? '\u201D' : ''), 90, quoteY + 40 + i * 48);
  });

  const afterMonoY = quoteY + 40 + monoLines.length * 48 + 22;
  rule(afterMonoY, 0.1);

  // ── STATS ROW ──
  const statsY = afterMonoY + 65;
  const pd = APP.profileData || {};
  const totalUsers = 48000 + Math.floor(Math.random()*800);
  const sameTypePctNum = pd.same_type_pct != null ? pd.same_type_pct : 0.128;
  const sameTypePct = (sameTypePctNum * 100).toFixed(1) + '% of users';
  const sameTypeCount = Math.floor(totalUsers * sameTypePctNum).toLocaleString();
  const eqDisplay = String(pd.eq_score != null ? pd.eq_score : 94);
  const stats = [
    {lbl:'SAME TYPE',  val: sameTypeCount, sub: sameTypePct,    col:'185,165,255'},
    {lbl:'EQ SCORE',   val: eqDisplay,      sub:'above average', col:'212,255,0'  },
    {lbl:'BEST MATCH', val: matchType,       sub: matchName,      col:'220,165,200'},
  ];
  stats.forEach((s,i)=>{
    const x = W*(0.2+i*0.3);
    if(i>0){
      ctx.beginPath(); ctx.moveTo(x-W*0.15,statsY-18); ctx.lineTo(x-W*0.15,statsY+62);
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=0.5; ctx.stroke();
    }
    ctx.textAlign='center';
    ctx.letterSpacing='0.1em';
    ctx.font='500 13px "JetBrains Mono",monospace';
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText(s.lbl, x, statsY);

    ctx.letterSpacing='0.03em';
    ctx.font='700 32px "JetBrains Mono",monospace';
    ctx.fillStyle='rgba('+s.col+',1)';
    ctx.shadowColor='rgba('+s.col+',0.5)'; ctx.shadowBlur=17;
    ctx.fillText(s.val, x, statsY+35);
    ctx.shadowBlur=0;

    ctx.letterSpacing='0';
    ctx.font='400 14px Inter,sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.42)';
    ctx.fillText(s.sub, x, statsY+62);
  });

  const afterStatsY = statsY + 88;
  rule(afterStatsY, 0.1);

  // ── BLINK CODE ──
  const codeY = afterStatsY + 68;
  ctx.font='600 36px "JetBrains Mono",monospace';
  ctx.letterSpacing='0.1em';
  const mw = ctx.measureText(code).width;
  const cx = W/2 - mw/2;

  // fingerprint arcs
  const fpx=cx-30, fpy=codeY-10;
  ctx.strokeStyle='rgba(212,255,0,0.4)'; ctx.lineWidth=1.1;
  for(let k=0;k<4;k++){
    ctx.beginPath(); ctx.arc(fpx,fpy,4+k*3.5,Math.PI*0.55,Math.PI*2.45); ctx.stroke();
  }

  ctx.textAlign='left';
  ctx.fillStyle='#D4FF00';
  ctx.shadowColor='rgba(212,255,0,0.5)'; ctx.shadowBlur=22;
  ctx.fillText(code, cx, codeY);
  ctx.shadowBlur=0;

  const ug=ctx.createLinearGradient(cx,0,cx+mw,0);
  ug.addColorStop(0,'rgba(212,255,0,0.5)'); ug.addColorStop(1,'transparent');
  ctx.beginPath(); ctx.moveTo(cx,codeY+6); ctx.lineTo(cx+mw,codeY+6);
  ctx.strokeStyle=ug; ctx.lineWidth=0.8; ctx.stroke();

  // ── FOOTER ──
  rule(H-100, 0.08);
  ctx.textAlign='center'; ctx.letterSpacing='0.02em';
  ctx.font='300 15px Inter,sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.fillText('Enter my code on Blink · Check our compatibility', W/2, H-65);
  ctx.letterSpacing='0.07em';
  ctx.font='400 13px "JetBrains Mono",monospace';
  ctx.fillStyle='rgba(155,109,255,0.4)';
  ctx.fillText('@blink_aimatch_bot', W/2, H-35);
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function downloadPoster(){
  const cv = document.getElementById('posterCanvas');
  if(!cv) return;
  const a=document.createElement('a');
  a.href=cv.toDataURL('image/png');
  a.download=`blink-${APP.mbti.toLowerCase()}.png`;
  a.click();
}


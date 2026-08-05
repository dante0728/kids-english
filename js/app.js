/* =====================================================
   主程式 — 畫面流程與三種遊戲
   聲音策略：
     1. 優先播放預先合成好的 mp3（assets/voice、assets/sfx）
     2. 檔案載入失敗時（例如直接雙擊開檔），自動改用
        瀏覽器內建語音(TTS) 與 Web Audio 即時合成
   ===================================================== */
const $ = id => document.getElementById(id);
const shuffled = a => [...a].sort(() => Math.random() - .5);

let currentTheme = THEMES[0];
let chainId = 0;                 // 中斷舊的語音串接用

/* ================= PIN 碼閘門 ================= */
const PIN = '0916';
let pinInput = '', pinCallback = null;
function showPin(title, cb) {
  pinInput = ''; pinCallback = cb;
  $('pinTitle').textContent = title;
  $('pinDots').textContent = '○○○○';
  $('pinGate').classList.add('show');
}
function pinPress(d) {
  if (d === 'C') { pinInput = ''; }
  else if (pinInput.length < 4) pinInput += d;
  $('pinDots').textContent = '●'.repeat(pinInput.length) + '○'.repeat(4 - pinInput.length);
  if (pinInput.length === 4) {
    if (pinInput === PIN) {
      $('pinGate').classList.remove('show');
      AudioEngine.playSfx('ding');
      const cb = pinCallback; pinCallback = null;
      if (cb) cb();
    } else {
      AudioEngine.playSfx('wrong');
      const dots = $('pinDots');
      dots.classList.add('shake');
      setTimeout(() => { dots.classList.remove('shake'); pinInput = ''; dots.textContent = '○○○○'; }, 450);
    }
  }
}
(function buildPinPad() {
  const pad = $('pinPad');
  ['1','2','3','4','5','6','7','8','9','C','0','🆗'].forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    b.onclick = () => { if (k !== '🆗') pinPress(k); };
    pad.appendChild(b);
  });
})();
// 每次開啟網頁（新分頁/新工作階段）都要輸入一次
if (sessionStorage.getItem('abc-pin') !== 'ok') {
  showPin('🔒 請輸入通關密碼', () => sessionStorage.setItem('abc-pin', 'ok'));
}

/* ================= 自訂內容（家長模式，存 localStorage） ================= */
const Custom = {
  data: (() => { try { return JSON.parse(localStorage.getItem('abc-custom')) || { words: {}, over: {} }; }
                 catch (e) { return { words: {}, over: {} }; } })(),
  save() { localStorage.setItem('abc-custom', JSON.stringify(this.data)); Cloud.schedule(); },
};
// 內建單字（套用家長改過的例句文字）+ 家長新增的單字（_custom 標記）
function allWords(theme) {
  const base = theme.words.map((w, i) => {
    const ov = Custom.data.over[theme.id + '_' + i];
    if (ov && (ov.sen !== undefined || ov.szh !== undefined)) {
      return { ...w, sen: ov.sen !== undefined ? ov.sen : w.sen,
                     szh: ov.szh !== undefined ? ov.szh : w.szh };
    }
    return w;
  });
  const extra = (Custom.data.words[theme.id] || []).map(w => ({ ...w, _custom: true }));
  return base.concat(extra);
}
// 家長自訂類別（單字都存在 Custom.data.words[類別id]）
function customThemes() {
  return (Custom.data.themes || []).map(ct => ({ ...ct, words: [], _customTheme: true }));
}
function allThemes() { return THEMES.concat(customThemes()); }
// 綜合挑戰：把所有類別的單字混在一起玩
const MIX_THEME = { id: 'mix', name: '綜合挑戰', emoji: '🌈', color: '#845ec2', words: [] };
// 遊戲牌組：一般主題＝該主題所有字；綜合＝全部
function poolFor(theme) {
  const list = theme.id === 'mix' ? allThemes() : [theme];
  const out = [];
  list.forEach(t => allWords(t).forEach((w, i) => out.push({ t, i, w })));
  return out;
}
// 圖片來源：家長換的圖 > 自訂單字的圖 > 內建卡通圖 > emoji
function imgSrcFor(theme, i) {
  const ov = Custom.data.over[theme.id + '_' + i];
  if (ov && ov.img) return ov.img;
  const w = allWords(theme)[i];
  if (w._custom) return w.img || null;
  return `assets/img/${theme.id}_${i}.${theme.id === 'heroes' ? 'svg' : 'png'}`;
}
// 語音來源：家長錄音 > 自訂單字錄音 > 內建音檔 > TTS（回傳 null 表示直接用 TTS）
function audioSrcFor(theme, i, kind) {   // kind: 'w' 單字 | 's' 例句
  const ov = Custom.data.over[theme.id + '_' + i];
  if (ov && ov['a' + kind]) return ov['a' + kind];
  const w = allWords(theme)[i];
  if (w._custom) return w['a' + kind] || null;
  // 例句文字被家長改過但沒錄新音檔 → 不能再用內建音檔，改用 TTS 唸新句子
  if (kind === 's' && ov && (ov.sen !== undefined || ov.szh !== undefined)) return null;
  return `assets/voice/${theme.id}_${i}_${kind}.mp3`;
}

/* ================= TTS 備援 ================= */
let enVoice = null, zhVoice = null;
function pickVoices() {
  const vs = speechSynthesis.getVoices();
  enVoice = vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang.startsWith('en')) || null;
  zhVoice = vs.find(v => v.lang === 'zh-TW') || vs.find(v => v.lang.startsWith('zh')) || null;
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = pickVoices;
  pickVoices();
}
function ttsSpeak(text, voice, lang, cb) {
  if (!('speechSynthesis' in window)) { cb && cb(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if (voice) u.voice = voice;
  u.rate = 0.85; u.pitch = 1.1;
  window.__ttsSpeaking = true;
  AudioEngine.duck(true);
  u.onend = u.onerror = () => { window.__ttsSpeaking = false; AudioEngine.duck(false); cb && cb(); };
  speechSynthesis.speak(u);
}
const speakEn = (t, cb) => ttsSpeak(t, enVoice, 'en-US', cb);
const speakZh = (t, cb) => ttsSpeak(t, zhVoice, 'zh-TW', cb);
function stopSpeech() {
  chainId++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  Object.values(audioCache).forEach(a => { a.pause(); });
  AudioEngine.duck(false);
  hideSentence();
}

/* ================= 預合成音檔播放 ================= */
const audioCache = {};
function playFile(path, onend, onfail) {
  let a = audioCache[path];
  if (!a) { a = new Audio(path); a.preload = 'auto'; audioCache[path] = a; }
  a.onended = () => { AudioEngine.duck(false); onend && onend(); };
  AudioEngine.duck(true);
  a.currentTime = 0;
  const p = a.play();
  if (p && p.catch) p.catch(() => { AudioEngine.duck(false); onfail && onfail(); });
}
function playWordAudio(theme, i, cb) {
  const id = chainId;
  const w = allWords(theme)[i];
  const done = () => { if (id === chainId && cb) cb(); };
  const tts = () => speakEn(w.en, done);
  const src = audioSrcFor(theme, i, 'w');
  if (src) playFile(src, done, tts); else tts();
}
function playSentenceAudio(theme, i, cb) {
  const id = chainId;
  const w = allWords(theme)[i];
  if (!w.sen) { if (cb) cb(); return; }   // 自訂單字可以沒有例句
  showSentence(w.sen, w.szh || '');
  const done = () => { setTimeout(hideSentence, 800); if (id === chainId && cb) cb(); };
  const tts = () => speakEn(w.sen, () => { if (id === chainId && w.szh) speakZh(w.szh, done); else done(); });
  const src = audioSrcFor(theme, i, 's');
  if (src) playFile(src, done, tts); else tts();
}
const PRAISES = ['Great job!', 'Wonderful!', 'You did it!'];
function playPraise(cb) {
  const n = Math.floor(Math.random() * PRAISES.length);
  playFile(`assets/voice/praise_${n}.mp3`, cb, () => speakEn(PRAISES[n], cb));
}
function playTryAgain() {
  playFile('assets/voice/try_again.mp3', null, () => speakEn('Try again!'));
}

/* 單字完整流程：音效 → 英文單字 → 英文例句 → 中文例句 */
function playWordSequence(theme, i, onDone) {
  stopSpeech();
  const id = ++chainId;
  const dur = AudioEngine.playSfx(allWords(theme)[i].sfx || 'pop');
  setTimeout(() => {
    if (id !== chainId) return;
    playWordAudio(theme, i, () => {
      if (id !== chainId) return;
      playSentenceAudio(theme, i, () => { if (id === chainId && onDone) onDone(); });
    });
  }, Math.max(dur * 1000, 300) + 150);
}

/* ================= 記憶追蹤（間隔重複的簡化版） ================= */
const Mem = {
  data: (() => { try { return JSON.parse(localStorage.getItem('abc-mem')) || {}; } catch (e) { return {}; } })(),
  key(theme, i) { return theme.id + '_' + i; },
  rec(theme, i, ok) {
    const k = this.key(theme, i);
    const m = this.data[k] = this.data[k] || { ok: 0, ng: 0 };
    ok ? m.ok++ : m.ng++;
    localStorage.setItem('abc-mem', JSON.stringify(this.data));
    if (ok) recordDay();
    Cloud.schedule();
  },
  // 沒看過的字最優先，常錯的字次之，熟的字降頻
  weight(theme, i) {
    const m = this.data[this.key(theme, i)];
    if (!m) return 2.2;
    return Math.max(0.35, 1 + m.ng * 0.8 - m.ok * 0.35);
  },
};
// 依權重從牌組挑「該練的字」；excludeKeys＝本輪已出過的（不重複，出完自動重新一輪）
function pickWeightedRef(pool, excludeKeys) {
  let cands = pool;
  if (excludeKeys && excludeKeys.size) {
    cands = pool.filter(r => !excludeKeys.has(Mem.key(r.t, r.i)));
    if (!cands.length) { excludeKeys.clear(); cands = pool; }
  }
  const ws = cands.map(r => Mem.weight(r.t, r.i));
  let x = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let k = 0; k < cands.length; k++) { x -= ws[k]; if (x <= 0) return cands[k]; }
  return cands[cands.length - 1];
}
// 出題：1 個加權答案 + 3 個隨機干擾（干擾不會跟答案同字）
function pickQuizPool(pool, excludeKeys) {
  const ans = pickWeightedRef(pool, excludeKeys);
  const ansKey = Mem.key(ans.t, ans.i);
  const others = shuffled(pool.filter(r => Mem.key(r.t, r.i) !== ansKey)).slice(0, 3);
  return { answer: ans, choices: shuffled([ans, ...others]) };
}
// 連續學習天數
function recordDay() {
  const d = new Date().toISOString().slice(0, 10);
  const days = JSON.parse(localStorage.getItem('abc-days') || '[]');
  if (!days.includes(d)) { days.push(d); localStorage.setItem('abc-days', JSON.stringify(days)); }
}
function streakDays() {
  const days = new Set(JSON.parse(localStorage.getItem('abc-days') || '[]'));
  let n = 0;
  const t = new Date();
  if (!days.has(t.toISOString().slice(0, 10))) t.setDate(t.getDate() - 1);  // 今天還沒學，從昨天往回數
  while (days.has(t.toISOString().slice(0, 10))) { n++; t.setDate(t.getDate() - 1); }
  return n;
}

/* ================= 英雄收藏與商店 ================= */
// 免費：鋼鐵人0/蜘蛛人1/超人13；熱門 30⭐；其他 15⭐
const HERO_COST = [0, 0, 30, 30, 30, 15, 15, 15, 15, 15, 15, 15, 15, 0, 30, 30, 30, 15, 15, 15];
const Heroes = {
  data: (() => { try { return JSON.parse(localStorage.getItem('abc-heroes')) || { owned: [0, 1, 13], active: 1 }; }
                 catch (e) { return { owned: [0, 1, 13], active: 1 }; } })(),
  save() { localStorage.setItem('abc-heroes', JSON.stringify(this.data)); Cloud.schedule(); },
  owns(i) { return this.data.owned.includes(i); },
};
const heroTheme = () => THEMES.find(t => t.id === 'heroes');

function renderShop() {
  const grid = $('shopGrid');
  grid.innerHTML = '';
  heroTheme().words.forEach((w, i) => {
    const owned = Heroes.owns(i);
    const isActive = Heroes.data.active === i;
    const card = document.createElement('div');
    card.className = 'shop-card ' + (isActive ? 'active-hero' : owned ? 'owned' : 'locked');
    card.innerHTML = `
      ${isActive ? '<span class="badge">⚔️</span>' : owned ? '<span class="badge">✅</span>' : ''}
      <img src="assets/img/hero_full_${i}.svg" alt="${w.en}">
      <div class="sname">${w.zh}</div>
      <div class="sprice">${owned ? (isActive ? '出戰中！' : '點我出戰') : '⭐ ' + HERO_COST[i]}</div>`;
    card.onclick = () => {
      if (owned) {
        Heroes.data.active = i; Heroes.save();
        AudioEngine.playSfx('ding');
        renderShop();
      } else if (stars >= HERO_COST[i]) {
        stars -= HERO_COST[i];
        localStorage.setItem('abc-stars', stars);
        $('starCount').textContent = stars;
        Heroes.data.owned.push(i);
        Heroes.data.active = i; Heroes.save();
        AudioEngine.playSfx('fanfare');
        celebrate(true);
        playPraise(null);
        renderShop();
      } else {
        AudioEngine.playSfx('wrong');
        card.classList.add('nostars');
        const p = card.querySelector('.sprice');
        p.textContent = '星星不夠，繼續加油！';
        setTimeout(() => { card.classList.remove('nostars'); p.textContent = '⭐ ' + HERO_COST[i]; }, 1400);
      }
    };
    grid.appendChild(card);
  });
}

/* ================= 單字圖示（統一卡通圖庫、emoji 備援） ================= */
function visualHTML(theme, i) {
  const w = allWords(theme)[i];
  const src = imgSrcFor(theme, i);
  if (!src) return `<span class="pic noimg"><span class="emoji">${w.emoji || '⭐'}</span></span>`;
  return `<span class="pic"><img src="${src}" alt="${w.en}" loading="lazy"
            onerror="this.parentElement.classList.add('noimg')"><span class="emoji">${w.emoji || '⭐'}</span></span>`;
}

/* ================= 例句字幕 ================= */
function showSentence(en, zh) {
  const box = $('sentenceBox');
  box.querySelector('.sen-en').textContent = en;
  box.querySelector('.sen-zh').textContent = zh;
  box.classList.add('show');
}
function hideSentence() { $('sentenceBox').classList.remove('show'); }

/* ================= 星星與慶祝 ================= */
let stars = Number(localStorage.getItem('abc-stars') || 0);
$('starCount').textContent = stars;

function addStar(x, y, n = 1) {
  stars += n;
  localStorage.setItem('abc-stars', stars);
  Cloud.schedule();
  $('starCount').textContent = stars;
  const target = $('stars').getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'fly-star'; s.textContent = '⭐';
  s.style.left = x + 'px'; s.style.top = y + 'px';
  s.style.setProperty('--dx', (target.left - x) + 'px');
  s.style.setProperty('--dy', (target.top - y) + 'px');
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 900);
}
function celebrate(big = false) {
  const box = $('confetti');
  const emojis = ['🎉', '⭐', '🌈', '🎈', '✨'];
  const count = big ? 36 : 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.textContent = emojis[i % emojis.length];
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = '-40px';
    p.style.animationDelay = (Math.random() * .5) + 's';
    box.appendChild(p);
    setTimeout(() => p.remove(), 2300);
  }
}

/* ================= 畫面切換 ================= */
let currentScreen = 'menu';
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
  currentScreen = name;
  $('backBtn').style.display = name === 'home' ? 'none' : '';
}
$('homeBtn').onclick = () => { stopSpeech(); stopRecognition(); goHome(); };
$('backBtn').onclick = () => {
  stopSpeech(); stopRecognition();
  const map = { learn: 'home', lesson: 'learn', menu: 'home', battle: 'menu',
                care: 'home', dex: 'home', parent: 'home', shop: 'care', mode: 'menu' };
  const to = map[currentScreen] || 'home';
  if (to === 'home') goHome(); else showScreen(to);
};
function goHome() {
  showScreen('home');
  if (typeof renderHome === 'function') renderHome();
}
$('parentBtn').onclick = () => {
  stopSpeech(); stopRecognition();
  showPin('👨‍👩‍👧 家長模式密碼', () => { openParent(); });
};
$('bgmBtn').onclick = () => {
  const on = AudioEngine.toggleBgm();
  $('bgmBtn').classList.toggle('off', !on);
};

/* ================= 主題選單（動態：內建＋自訂＋綜合） ================= */
function renderThemeMenu() {
  const grid = $('themeGrid');
  grid.innerHTML = '';
  allThemes().concat([MIX_THEME]).forEach(t => {
    const count = poolFor(t).length;
    const c = document.createElement('div');
    c.className = 'menu-card' + (t.id === 'mix' ? ' mix' : '');
    c.style.setProperty('--c', t.color || '#4ecdc4');
    c.innerHTML = `<span class="emoji">${t.emoji}</span><span class="name">${t.name}</span>
                   <div class="count">${t.id === 'mix' ? '全部單字混著玩！' : count + ' 個單字'}</div>`;
    c.onclick = () => {
      if (count < 4) { alert('「' + t.name + '」至少要 4 個單字才能冒險，請先到家長模式新增！'); return; }
      currentTheme = t;
      startBattleGame();          // 冒險：選了主題直接開打
    };
    grid.appendChild(c);
  });
}
function openTheme(t) {
  currentTheme = t;
  $('modeTitle').textContent = `${t.emoji} ${t.name}`;
  showScreen('mode');
}
renderThemeMenu();
$('modeCards').onclick = () => startCardsGame();
$('modeListen').onclick = () => {
  if (poolFor(currentTheme).length < 4) { alert('這個類別至少要 4 個單字才能玩聽聽看喔！'); return; }
  listenCorrect = 0; listenAsked.clear(); startListenGame();
};
$('modeSpeak').onclick = () => startSpeakGame();
$('modeBattle').onclick = () => {
  if (poolFor(currentTheme).length < 4) { alert('這個類別至少要 4 個單字才能打怪獸喔！'); return; }
  startBattleGame();
};

/* ================= 遊戲一：點點聽 ================= */
function startCardsGame() {
  showScreen('cards');
  $('cardsTitle').textContent = `${currentTheme.emoji} 點點聽`;
  const grid = $('cardGrid');
  grid.innerHTML = '';
  poolFor(currentTheme).forEach(ref => {
    const c = document.createElement('div');
    c.className = 'word-card';
    c.style.setProperty('--c', ref.t.color || currentTheme.color || '#4ecdc4');
    c.innerHTML = `${visualHTML(ref.t, ref.i)}<div class="en">${ref.w.en}</div><div class="zh">${ref.w.zh}</div>`;
    c.onclick = () => {
      document.querySelectorAll('.word-card').forEach(x => x.classList.remove('speaking'));
      c.classList.add('speaking');
      playWordSequence(ref.t, ref.i, () => c.classList.remove('speaking'));
    };
    grid.appendChild(c);
  });
}

/* ================= 遊戲二：聽聽看（答對 5 題過關；同輪不重複出題） ================= */
let listenAnswer = null;               // 牌組 ref {t, i, w}
let listenCorrect = 0, listenLock = false;
const listenAsked = new Set();         // 這一輪出過的字
const LISTEN_GOAL = 5;

function updateListenProgress() {
  $('listenProgress').textContent =
    '⭐'.repeat(listenCorrect) + '⚪'.repeat(LISTEN_GOAL - listenCorrect);
}
function startListenGame() {
  showScreen('listen');
  listenLock = false;
  updateListenProgress();
  const quiz = pickQuizPool(poolFor(currentTheme), listenAsked);
  listenAnswer = quiz.answer;
  listenAsked.add(Mem.key(listenAnswer.t, listenAnswer.i));
  const grid = $('choiceGrid');
  grid.innerHTML = '';
  quiz.choices.forEach(ref => {
    const d = document.createElement('div');
    d.className = 'choice';
    d.innerHTML = visualHTML(ref.t, ref.i);
    d.onclick = (e) => {
      if (listenLock) return;
      if (ref === listenAnswer) {
        listenLock = true;
        Mem.rec(ref.t, ref.i, true);
        d.classList.add('correct');
        AudioEngine.playSfx('yay');
        addStar(e.clientX, e.clientY);
        celebrate();
        listenCorrect++;
        updateListenProgress();
        playPraise(null);
        if (listenCorrect >= LISTEN_GOAL) {
          setTimeout(levelClear, 1200);
        } else {
          setTimeout(startListenGame, 1600);
        }
      } else {
        d.classList.add('wrong');
        Mem.rec(listenAnswer.t, listenAnswer.i, false);
        AudioEngine.playSfx('wrong');
        setTimeout(() => playTryAgain(), 350);
        setTimeout(() => d.classList.remove('wrong'), 600);
      }
    };
    grid.appendChild(d);
  });
  setTimeout(() => { stopSpeech(); chainId++; playWordAudio(listenAnswer.t, listenAnswer.i, null); }, 500);
}
$('bigSpeaker').onclick = () => {
  if (listenAnswer) { stopSpeech(); chainId++; playWordAudio(listenAnswer.t, listenAnswer.i, null); }
};
function levelClear() {
  AudioEngine.playSfx('fanfare');
  celebrate(true);
  addStar(innerWidth / 2, innerHeight / 2, 3);
  $('clearMsg').textContent = `${currentTheme.name}關 過關了！你好棒！`;
  $('levelClear').classList.add('show');
}
$('clearNextBtn').onclick = () => {
  $('levelClear').classList.remove('show');
  listenCorrect = 0;
  listenAsked.clear();
  startListenGame();
};

/* ================= 遊戲三：跟著唸 ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, speakRef = null;
const micBtn = $('micBtn'), speakResult = $('speakResult');

function startSpeakGame() {
  showScreen('speak');
  if (!SR) {
    $('noMicNote').textContent = '這個瀏覽器不支援語音辨識（iPad 的 Safari 目前不支援）。小朋友唸完後，請爸爸媽媽按「我唸對了」給獎勵！';
    micBtn.style.display = 'none';
    $('selfOkBtn').style.display = '';
  } else {
    $('noMicNote').textContent = '';
    micBtn.style.display = '';
    $('selfOkBtn').style.display = 'none';
  }
  nextSpeakWord();
}
function nextSpeakWord() {
  stopRecognition(); stopSpeech();
  const pool = poolFor(currentTheme);
  speakRef = pool[Math.floor(Math.random() * pool.length)];
  $('speakTarget').innerHTML =
    `${visualHTML(speakRef.t, speakRef.i)}<div class="en">${speakRef.w.en}</div><div class="zh">${speakRef.w.zh}</div>`;
  speakResult.textContent = '';
  chainId++;
  playWordAudio(speakRef.t, speakRef.i, null);
}
function speakSuccess() {
  Mem.rec(speakRef.t, speakRef.i, true);
  const w = speakRef.w;
  speakResult.textContent = '🎉 太棒了！' + w.emoji;
  AudioEngine.playSfx('yay');
  playPraise(null);
  const r = micBtn.style.display === 'none' ? $('selfOkBtn').getBoundingClientRect() : micBtn.getBoundingClientRect();
  addStar(r.left + r.width / 2, r.top);
  celebrate();
  setTimeout(nextSpeakWord, 2000);
}
function stopRecognition() {
  if (recognition) { recognition.abort(); recognition = null; }
  micBtn.classList.remove('listening');
}
micBtn.onclick = () => {
  if (!SR || !speakRef) return;
  if (recognition) { stopRecognition(); return; }
  stopSpeech();
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;
  micBtn.classList.add('listening');
  speakResult.textContent = '👂 我在聽…';
  recognition.onresult = (e) => {
    const alts = [...e.results[0]].map(r => r.transcript.toLowerCase().trim());
    const target = speakRef.w.en.toLowerCase();
    if (alts.some(a => a.includes(target))) {
      speakSuccess();
    } else {
      speakResult.textContent = '再試一次！你說了「' + alts[0] + '」';
      playTryAgain();
    }
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') speakResult.textContent = '請允許使用麥克風喔！';
    else if (e.error !== 'aborted') speakResult.textContent = '沒聽清楚，再按一次麥克風試試！';
  };
  recognition.onend = () => { micBtn.classList.remove('listening'); recognition = null; };
  recognition.start();
};
$('selfOkBtn').onclick = speakSuccess;
$('replayBtn').onclick = () => { if (speakRef) { stopSpeech(); chainId++; playWordAudio(speakRef.t, speakRef.i, null); } };
$('nextWordBtn').onclick = nextSpeakWord;

/* ================= 遊戲四：英雄打怪獸 ================= */
const MONSTERS = ['👾', '🐲', '🦖', '👹', '🧌'];
const ULT_NEED = 3;                 // 連續答對幾題發動必殺技
let battle = { hp: 5, max: 5, answer: null, lock: false, energy: 0 };
const battleAsked = new Set();         // 這一場出過的字（不重複）

function startBattleGame() {
  showScreen('battle');
  battle.hp = battle.max = 5;
  battle.lock = false;
  battleAsked.clear();
  $('heroImg').src = `assets/img/hero_full_${Heroes.data.active}.svg`;   // 出戰中的英雄（全身動畫）
  $('monsterFace').textContent = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  AudioEngine.playSfx('growl');
  updateHp();
  nextBattleRound();
}
function updateHp() {
  $('monsterHp').textContent = '❤️'.repeat(Math.max(0, battle.hp)) +
                               '🖤'.repeat(Math.max(0, battle.max - battle.hp));
}
// 必殺技能量槽（答對集氣，滿了下一次答對就發動）
function updateUltGauge() {
  const g = $('ultGauge');
  if (!g) return;
  const ready = battle.energy >= ULT_NEED;
  g.textContent = ready ? '⚡⚡⚡ 必殺技準備好了！答對就發動！'
    : '集氣 ' + '⚡'.repeat(battle.energy) + '⚪'.repeat(ULT_NEED - battle.energy);
  g.classList.toggle('ready', ready);
  $('partyRow').classList.toggle('ult-ready', ready);
}
function nextBattleRound() {
  battle.lock = false;
  const quiz = pickQuizPool(poolFor(currentTheme), battleAsked);
  battle.answer = quiz.answer;
  battleAsked.add(Mem.key(battle.answer.t, battle.answer.i));
  const grid = $('battleChoices');
  grid.innerHTML = '';
  quiz.choices.forEach(ref => {
    const d = document.createElement('div');
    d.className = 'choice';
    d.innerHTML = visualHTML(ref.t, ref.i);
    d.onclick = () => battleAnswer(ref, d);
    grid.appendChild(d);
  });
  setTimeout(() => { stopSpeech(); chainId++; playWordAudio(battle.answer.t, battle.answer.i, null); }, 450);
}
function battleAnswer(ref, el) {
  if (battle.lock) return;
  if (ref !== battle.answer) {
    el.classList.add('wrong');
    Mem.rec(battle.answer.t, battle.answer.i, false);
    AudioEngine.playSfx('wrong');
    $('monsterFace').classList.add('taunt');
    setTimeout(() => { el.classList.remove('wrong'); $('monsterFace').classList.remove('taunt'); }, 550);
    playTryAgain();
    return;
  }
  battle.lock = true;
  Mem.rec(battle.answer.t, battle.answer.i, true);
  el.classList.add('correct');
  // 集氣 → 放技能 → 怪獸受傷
  const hero = $('heroImg');
  hero.classList.add('charge');
  AudioEngine.playSfx('power');
  setTimeout(() => {
    const bolt = document.createElement('span');
    bolt.className = 'bolt fly';
    bolt.textContent = '⚡';
    $('battleFx').appendChild(bolt);
    AudioEngine.playSfx('zap');
    setTimeout(() => {
      bolt.remove();
      hero.classList.remove('charge');
      const m = $('monsterFace');
      m.classList.add('hurt');
      AudioEngine.playSfx('growl');
      setTimeout(() => m.classList.remove('hurt'), 550);
      battle.hp--;
      updateHp();
      if (battle.hp <= 0) {
        m.textContent = '😵';
        setTimeout(battleVictory, 600);
      } else {
        playPraise(null);
        setTimeout(nextBattleRound, 1400);
      }
    }, 430);
  }, 500);
}
function battleVictory() {
  AudioEngine.playSfx('fanfare');
  celebrate(true);
  addStar(innerWidth / 2, innerHeight / 2, 5);
  $('battleWin').classList.add('show');
}
$('battleAgainBtn').onclick = () => { $('battleWin').classList.remove('show'); startBattleGame(); };
$('battleSpeaker').onclick = () => { if (battle.answer) { stopSpeech(); chainId++; playWordAudio(battle.answer.t, battle.answer.i, null); } };

/* ================= 家長模式 ================= */
let parentTheme = THEMES[0];

function openParent() {
  showScreen('parent');
  switchPTab('edit');
}
// 分頁切換：教材編輯 / 資料總覽 / 學習報告 / 系統
function switchPTab(p) {
  document.querySelectorAll('#ptabs .ptab').forEach(x => x.classList.toggle('on', x.dataset.p === p));
  ['edit', 'pets', 'overview', 'report', 'system'].forEach(x => {
    $('panel-' + x).style.display = (x === p) ? '' : 'none';
  });
  if (p === 'edit') { renderParentThemes(); renderParentAdd(); renderParentList(); }
  if (p === 'pets' && typeof renderPetEditor === 'function') renderPetEditor();
  if (p === 'overview') renderOverview();
  if (p === 'report') renderReport();
  if (p === 'system') {
    renderCloudBox();
    if (typeof renderProgressCtrl === 'function') renderProgressCtrl();
  }
}
document.querySelectorAll('.ptab').forEach(b => { b.onclick = () => switchPTab(b.dataset.p); });

function renderParentThemes() {
  const box = $('parentThemes');
  box.innerHTML = '';
  allThemes().forEach(t => {
    const b = document.createElement('button');
    b.className = 'ptheme-chip' + (t.id === parentTheme.id ? ' on' : '');
    b.textContent = `${t.emoji} ${t.name}`;
    b.onclick = () => { parentTheme = t; switchPTab('edit'); };
    box.appendChild(b);
  });
  // 新增自訂類別
  const add = document.createElement('button');
  add.className = 'ptheme-chip';
  add.style.borderStyle = 'dashed';
  add.textContent = '➕ 新增類別';
  add.onclick = () => {
    const name = prompt('新類別的名稱（例如：顏色、數字、身體部位）');
    if (!name || !name.trim()) return;
    const emoji = (prompt('代表 emoji（例如 🎨），可留空', '📦') || '📦').trim();
    const ct = { id: 'c' + Date.now(), name: name.trim(), emoji, color: '#ff9f1c' };
    (Custom.data.themes = Custom.data.themes || []).push(ct);
    Custom.save();
    parentTheme = allThemes().find(t => t.id === ct.id);
    renderThemeMenu();
    switchPTab('edit');
  };
  box.appendChild(add);
}
function renderParentAdd() {
  const delBtn = parentTheme._customTheme
    ? `<button class="pbtn del" id="delThemeBtn" style="float:right">🗑️ 刪除這個類別</button>` : '';
  $('parentAdd').innerHTML = `
    ${delBtn}<b>➕ 新增「${parentTheme.name}」單字</b>
    <div class="row" style="margin-top:8px">
      <input type="text" id="naEn" placeholder="英文（必填）如 grape">
      <input type="text" id="naZh" placeholder="中文（必填）如 葡萄">
      <input type="text" id="naEmoji" placeholder="emoji（選填）" style="max-width:110px">
    </div>
    <div class="row">
      <input type="text" id="naSen" placeholder="英文例句（選填）">
      <input type="text" id="naSzh" placeholder="中文例句（選填）">
    </div>
    <div class="row">
      <label class="pbtn">📷 選圖片<input type="file" id="naImg" accept="image/*" hidden></label>
      <span id="naImgName" style="align-self:center;color:#888;font-size:.9rem"></span>
      <button class="pbtn" style="border-color:#2ecc71;font-weight:bold" id="naAddBtn">✅ 新增</button>
    </div>`;
  let imgData = null;
  $('naImg').onchange = async (e) => {
    if (e.target.files[0]) {
      imgData = await fileToThumb(e.target.files[0]);
      $('naImgName').textContent = '已選圖 ✓';
    }
  };
  $('naAddBtn').onclick = () => {
    const en = $('naEn').value.trim(), zh = $('naZh').value.trim();
    if (!en || !zh) { alert('英文和中文是必填的喔'); return; }
    const w = { en, zh, emoji: $('naEmoji').value.trim() || '⭐',
                sen: $('naSen').value.trim(), szh: $('naSzh').value.trim(), sfx: 'pop' };
    if (imgData) w.img = imgData;
    (Custom.data.words[parentTheme.id] = Custom.data.words[parentTheme.id] || []).push(w);
    Custom.save();
    renderThemeMenu();
    switchPTab('edit');
  };
  const dt = $('delThemeBtn');
  if (dt) dt.onclick = () => {
    if (!confirm(`確定刪除類別「${parentTheme.name}」和裡面的 ${(Custom.data.words[parentTheme.id] || []).length} 個單字？`)) return;
    const id = parentTheme.id;
    Custom.data.themes = (Custom.data.themes || []).filter(t => t.id !== id);
    delete Custom.data.words[id];
    Object.keys(Custom.data.over).forEach(k => { if (k.startsWith(id + '_')) delete Custom.data.over[k]; });
    Custom.save();
    parentTheme = THEMES[0];
    renderThemeMenu();
    switchPTab('edit');
  };
}
let expandedIdx = null;   // 目前展開編輯的單字（一次一個）

function renderParentList() {
  const list = $('parentList');
  list.innerHTML = '';
  allWords(parentTheme).forEach((w, i) => {
    const key = parentTheme.id + '_' + i;
    const row = document.createElement('div');
    row.className = 'prow' + (expandedIdx === i ? ' open' : '');
    const src = imgSrcFor(parentTheme, i);
    const head = document.createElement('div');
    head.className = 'prow-head';
    head.innerHTML = `
      ${src ? `<img class="thumb" src="${src}" onerror="this.outerHTML='<span class=thumb>${w.emoji || '⭐'}</span>'">`
            : `<span class="thumb">${w.emoji || '⭐'}</span>`}
      <div class="ptxt"><div class="p-en">${w.en} ${w._custom ? '<span class="badge-custom">自訂</span>' : ''}</div>
      <div class="p-zh">${w.zh}</div></div>
      <span class="p-arrow">${expandedIdx === i ? '▲' : '▼'}</span>`;
    head.onclick = () => { expandedIdx = (expandedIdx === i ? null : i); renderParentList(); };
    row.appendChild(head);
    if (expandedIdx === i) row.appendChild(buildEditor(w, i, key));
    list.appendChild(row);
  });
}

// 展開的編輯面板：改文字、換圖、錄音/上傳音檔、試聽
function buildEditor(w, i, key) {
  const box = document.createElement('div');
  box.className = 'pedit';
  const textRows = w._custom ? `
    <div class="row"><input type="text" id="peEn" value="${w.en}" placeholder="英文">
      <input type="text" id="peZh" value="${w.zh}" placeholder="中文">
      <input type="text" id="peEmoji" value="${w.emoji || ''}" placeholder="emoji" style="max-width:90px"></div>` : '';
  box.innerHTML = `
    ${textRows}
    <div class="sec-label">📝 例句（改完按儲存，會改用新句子朗讀）</div>
    <div class="row"><input type="text" id="peSen" value="${(w.sen || '').replace(/"/g, '&quot;')}" placeholder="英文例句">
      <input type="text" id="peSzh" value="${(w.szh || '').replace(/"/g, '&quot;')}" placeholder="中文例句"></div>
    <div class="row"><button class="pbtn" id="peSave" style="border-color:#2ecc71;font-weight:bold">💾 儲存文字</button>
      <label class="pbtn">📷 換圖片<input type="file" id="peImg" accept="image/*" hidden></label>
      <button class="pbtn" id="peDraw">🎨 自己畫</button></div>
    <div class="sec-label">🔊 單字聲音</div>
    <div class="row">
      <button class="pbtn rec" id="peRecW" data-k="w">🎙️ 錄音</button>
      <label class="pbtn">📁 上傳音檔<input type="file" id="peUpW" accept="audio/*" hidden></label>
      <button class="pbtn" id="pePlayW">▶ 試聽單字</button></div>
    <div class="sec-label">🔊 例句聲音</div>
    <div class="row">
      <button class="pbtn rec" id="peRecS" data-k="s">🎙️ 錄音</button>
      <label class="pbtn">📁 上傳音檔<input type="file" id="peUpS" accept="audio/*" hidden></label>
      <button class="pbtn" id="pePlayS">▶ 試聽例句</button></div>
    <div class="row">
      <button class="pbtn" id="pePlayAll">▶▶ 完整試聽</button>
      ${w._custom ? '<button class="pbtn del" id="peDel">🗑️ 刪除這個單字</button>'
                  : (Custom.data.over[key] ? '<button class="pbtn del" id="peReset">♻️ 還原預設</button>' : '')}
    </div>`;

  const setAudio = (k, dataUrl) => {
    if (w._custom) getCustomWord(i)['a' + k] = dataUrl;
    else (Custom.data.over[key] = Custom.data.over[key] || {})['a' + k] = dataUrl;
    Custom.save();
  };
  const fileToDataUrl = (file, cb) => {
    const fr = new FileReader();
    fr.onload = () => cb(fr.result);
    fr.readAsDataURL(file);
  };

  box.querySelector('#peSave').onclick = () => {
    if (w._custom) {
      const cw = getCustomWord(i);
      cw.en = box.querySelector('#peEn').value.trim() || cw.en;
      cw.zh = box.querySelector('#peZh').value.trim() || cw.zh;
      cw.emoji = box.querySelector('#peEmoji').value.trim() || cw.emoji;
      cw.sen = box.querySelector('#peSen').value.trim();
      cw.szh = box.querySelector('#peSzh').value.trim();
    } else {
      const ov = Custom.data.over[key] = Custom.data.over[key] || {};
      ov.sen = box.querySelector('#peSen').value.trim();
      ov.szh = box.querySelector('#peSzh').value.trim();
    }
    Custom.save();
    AudioEngine.playSfx('ding');
    renderParentList();
  };
  box.querySelector('#peImg').onchange = async (e) => {
    if (!e.target.files[0]) return;
    const data = await fileToThumb(e.target.files[0]);
    if (w._custom) getCustomWord(i).img = data;
    else (Custom.data.over[key] = Custom.data.over[key] || {}).img = data;
    Custom.save(); renderParentList();
  };
  box.querySelector('#peDraw').onclick = () => Paint.open(data => {
    if (w._custom) getCustomWord(i).img = data;
    else (Custom.data.over[key] = Custom.data.over[key] || {}).img = data;
    Custom.save(); renderParentList();
  });
  box.querySelector('#peRecW').onclick = () => toggleRecord(box.querySelector('#peRecW'), d => setAudio('w', d));
  box.querySelector('#peRecS').onclick = () => toggleRecord(box.querySelector('#peRecS'), d => setAudio('s', d));
  box.querySelector('#peUpW').onchange = (e) => {
    if (e.target.files[0]) fileToDataUrl(e.target.files[0], d => { setAudio('w', d); AudioEngine.playSfx('ding'); });
  };
  box.querySelector('#peUpS').onchange = (e) => {
    if (e.target.files[0]) fileToDataUrl(e.target.files[0], d => { setAudio('s', d); AudioEngine.playSfx('ding'); });
  };
  box.querySelector('#pePlayW').onclick = () => { stopSpeech(); chainId++; playWordAudio(parentTheme, i, null); };
  box.querySelector('#pePlayS').onclick = () => { stopSpeech(); chainId++; playSentenceAudio(parentTheme, i, null); };
  box.querySelector('#pePlayAll').onclick = () => playWordSequence(parentTheme, i, null);
  const del = box.querySelector('#peDel');
  if (del) del.onclick = () => {
    if (confirm(`確定刪除「${w.en}」？`)) {
      Custom.data.words[parentTheme.id].splice(i - parentTheme.words.length, 1);
      Custom.save(); expandedIdx = null; renderThemeMenu(); switchPTab('edit');
    }
  };
  const reset = box.querySelector('#peReset');
  if (reset) reset.onclick = () => {
    if (confirm('還原這個單字的預設圖片、聲音與例句？')) {
      delete Custom.data.over[key];
      Custom.save(); renderParentList();
    }
  };
  return box;
}
function getCustomWord(mergedIdx) {
  return Custom.data.words[parentTheme.id][mergedIdx - parentTheme.words.length];
}
// 圖片縮成 320px 方形 dataURL（存 localStorage）
function fileToThumb(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 320;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 320);
      const s = Math.min(320 / img.width, 320 / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.drawImage(img, (320 - w) / 2, (320 - h) / 2, w, h);
      res(cv.toDataURL('image/jpeg', 0.82));
    };
    img.src = URL.createObjectURL(file);
  });
}
// 麥克風錄音（再按一次停止）
let activeRecorder = null;
async function toggleRecord(btn, onDone) {
  if (activeRecorder) { activeRecorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      btn.classList.remove('recording');
      btn.textContent = btn.dataset.k === 'w' ? '🎙️ 錄單字 ✓' : '🎙️ 錄例句 ✓';
      activeRecorder = null;
      const blob = new Blob(chunks, { type: rec.mimeType });
      const fr = new FileReader();
      fr.onload = () => onDone(fr.result);
      fr.readAsDataURL(blob);
    };
    activeRecorder = rec;
    btn.classList.add('recording');
    btn.textContent = '⏹ 停止';
    rec.start();
  } catch (e) {
    alert('無法使用麥克風：' + e.message);
  }
}
// 學習報告（分頁）
function renderReport() {
  const box = $('parentReport');
  let mastered = 0, learning = 0, trouble = 0, unseen = 0;
  let themeHtml = '';
  allThemes().forEach(t => {
    const goods = [], bads = [];
    allWords(t).forEach((w, i) => {
      const m = Mem.data[Mem.key(t, i)];
      if (!m) { unseen++; return; }
      if (m.ok >= 3 && m.ok > m.ng) { mastered++; goods.push(w.en); }
      else if (m.ng >= 2 && m.ng >= m.ok) { trouble++; bads.push(w.en); }
      else learning++;
    });
    if (goods.length || bads.length) {
      themeHtml += `<div class="rp-theme"><b>${t.emoji} ${t.name}</b><div class="rp-chips">
        ${goods.map(x => `<span class="rp-chip good">✓ ${x}</span>`).join('')}
        ${bads.map(x => `<span class="rp-chip bad">✗ ${x}</span>`).join('')}
      </div></div>`;
    }
  });
  box.innerHTML = `
    <h3>📊 學習報告</h3>
    <div class="rp-stats">
      <div class="rp-stat"><div class="num">${streakDays()}</div><div class="lab">連續學習天數</div></div>
      <div class="rp-stat"><div class="num">${mastered}</div><div class="lab">已掌握</div></div>
      <div class="rp-stat"><div class="num">${learning}</div><div class="lab">學習中</div></div>
      <div class="rp-stat"><div class="num">${trouble}</div><div class="lab">常錯字</div></div>
      <div class="rp-stat"><div class="num">${unseen}</div><div class="lab">還沒學</div></div>
    </div>
    ${themeHtml || '<div style="color:#999">還沒有學習紀錄，玩過「聽聽看」或「打怪獸」就會開始記錄囉！</div>'}
    <div style="color:#999;font-size:.85rem;margin-top:10px">✓ 已掌握（答對 3 次以上）　✗ 常錯（建議多練）；「聽聽看」和「打怪獸」會自動優先出還沒學和常錯的字。</div>`;
}

// 資料總覽（分頁）：全部教材內容一頁看完
function renderOverview() {
  // 統計
  let total = 0, customCount = 0, editedCount = 0, recCount = 0;
  allThemes().forEach(t => {
    allWords(t).forEach((w, i) => {
      total++;
      if (w._custom) customCount++;
      const ov = Custom.data.over[t.id + '_' + i];
      if (ov && (ov.sen !== undefined || ov.szh !== undefined || ov.img)) editedCount++;
      if ((ov && (ov.aw || ov.as)) || (w._custom && (w.aw || w.as))) recCount++;
    });
  });
  const usedKB = Math.round(['abc-custom', 'abc-mem', 'abc-heroes', 'abc-days']
    .reduce((s, k) => s + (localStorage.getItem(k) || '').length, 0) / 1024);
  $('ovSummary').innerHTML = `
    <div class="ov-stat"><div class="num">${total}</div><div class="lab">單字總數</div></div>
    <div class="ov-stat"><div class="num">${customCount}</div><div class="lab">自訂單字</div></div>
    <div class="ov-stat"><div class="num">${editedCount}</div><div class="lab">改過的內建字</div></div>
    <div class="ov-stat"><div class="num">${recCount}</div><div class="lab">有自訂聲音</div></div>
    <div class="ov-stat"><div class="num">${usedKB}<span style="font-size:.8rem">KB</span></div><div class="lab">本機用量(約5MB可用)</div></div>
    <div class="ov-stat"><div class="num">${Cloud.enabled() && Cloud.getCode() ? '☁️✓' : '—'}</div><div class="lab">雲端同步</div></div>`;
  // 全部單字列表
  const list = $('ovList');
  list.innerHTML = '';
  allThemes().forEach(t => {
    const head = document.createElement('div');
    head.className = 'ov-theme-head';
    head.textContent = `${t.emoji} ${t.name}（${allWords(t).length} 個）`;
    list.appendChild(head);
    allWords(t).forEach((w, i) => {
      const ov = Custom.data.over[t.id + '_' + i];
      const m = Mem.data[Mem.key(t, i)];
      const src = imgSrcFor(t, i);
      const badges = [];
      if (w._custom) badges.push('<span class="ov-badge c">自訂</span>');
      if (ov && ov.img) badges.push('<span class="ov-badge">換過圖</span>');
      if (ov && (ov.sen !== undefined || ov.szh !== undefined)) badges.push('<span class="ov-badge">例句已改</span>');
      if ((ov && ov.aw) || (w._custom && w.aw)) badges.push('<span class="ov-badge">自訂單字音</span>');
      if ((ov && ov.as) || (w._custom && w.as)) badges.push('<span class="ov-badge">自訂例句音</span>');
      if (m) {
        if (m.ok >= 3 && m.ok > m.ng) badges.push('<span class="ov-badge m">已掌握</span>');
        else if (m.ng >= 2 && m.ng >= m.ok) badges.push(`<span class="ov-badge x">常錯 ${m.ng}次</span>`);
        else badges.push(`<span class="ov-badge">練習中 ✓${m.ok} ✗${m.ng}</span>`);
      }
      const row = document.createElement('div');
      row.className = 'ov-row';
      row.innerHTML = `
        ${src ? `<img class="ov-thumb" src="${src}" loading="lazy" onerror="this.outerHTML='<span class=ov-thumb>${w.emoji || '⭐'}</span>'">`
              : `<span class="ov-thumb">${w.emoji || '⭐'}</span>`}
        <div class="ov-main">
          <span class="ov-en">${w.en}</span> <span class="ov-zh">${w.zh}</span>
          <div class="ov-sen">${w.sen || ''}${w.szh ? '｜' + w.szh : ''}</div>
          <div class="ov-badges">${badges.join('')}</div>
        </div>
        <button class="ov-play" data-k="w">🔊</button>
        <button class="ov-play" data-k="s">💬</button>`;
      row.querySelectorAll('.ov-play').forEach(b => {
        b.onclick = () => {
          stopSpeech(); chainId++;
          if (b.dataset.k === 'w') playWordAudio(t, i, null);
          else playSentenceAudio(t, i, null);
        };
      });
      list.appendChild(row);
    });
  });
}

// 匯出 / 匯入備份
$('exportBtn').onclick = () => {
  const bundle = {
    custom: Custom.data, mem: Mem.data, heroes: Heroes.data, stars,
    days: JSON.parse(localStorage.getItem('abc-days') || '[]'),
    pet: JSON.parse(localStorage.getItem('abc-pet') || 'null'),
    lessons: JSON.parse(localStorage.getItem('abc-lessons') || '{}'),
  };
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'abc-backup.json';
  a.click();
};
$('importFile').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (d.words && d.over) {           // 舊版備份（只有自訂內容）
        Custom.data = d; Custom.save();
      } else if (d.custom) {             // 完整備份
        Custom.data = d.custom; Custom.save();
        if (d.mem) { Mem.data = d.mem; localStorage.setItem('abc-mem', JSON.stringify(d.mem)); }
        if (d.heroes) { Heroes.data = d.heroes; Heroes.save(); }
        if (typeof d.stars === 'number') { stars = d.stars; localStorage.setItem('abc-stars', stars); $('starCount').textContent = stars; }
        if (d.days) localStorage.setItem('abc-days', JSON.stringify(d.days));
        if (d.pet) localStorage.setItem('abc-pet', JSON.stringify(d.pet));
        if (d.lessons) localStorage.setItem('abc-lessons', JSON.stringify(d.lessons));
      } else throw new Error('格式不對');
      alert('匯入成功！'); openParent();
    } catch (err) { alert('匯入失敗：' + err.message); }
  };
  fr.readAsText(f);
};

/* ================= 雲端備份 UI ================= */
function renderCloudBox() {
  const on = Cloud.enabled();
  $('cloudOff').style.display = on ? 'none' : '';
  $('cloudSetup').style.display = on ? '' : 'none';
  if (!on) return;
  const code = Cloud.getCode();
  $('familyCode').value = code;
  $('cloudActions').style.display = code ? 'flex' : 'none';
  $('cloudStatus').textContent = code ? '同步中的家庭代碼：' + code : '輸入家庭代碼後啟用，全家裝置輸入同一組代碼即可同步。';
}
Cloud.onStatus((msg) => { $('cloudStatus').textContent = msg; });
$('cloudEnableBtn').onclick = async () => {
  const code = $('familyCode').value.trim();
  if (code.length < 4) { alert('代碼至少 4 個字，建議加上不易猜到的數字'); return; }
  Cloud.setCode(code);
  // 雲端已有這組代碼的備份 → 問要下載還是覆蓋
  try {
    const d = await Cloud.pull();
    if (d && confirm('雲端已有這組代碼的備份，要下載到這台裝置嗎？\n（取消 = 改用這台裝置的資料覆蓋雲端）')) {
      Cloud.apply(d); location.reload(); return;
    }
  } catch (e) {}
  await Cloud.push();
  renderCloudBox();
};
$('cloudPushBtn').onclick = () => Cloud.push();
$('cloudPullBtn').onclick = async () => {
  try {
    const d = await Cloud.pull();
    if (!d) { alert('雲端沒有這組代碼的備份'); return; }
    if (confirm('用雲端備份覆蓋這台裝置的資料？')) { Cloud.apply(d); location.reload(); }
  } catch (e) { alert('下載失敗：' + e.message); }
};
$('cloudOffBtn').onclick = () => {
  if (confirm('停用這台裝置的自動同步？（雲端備份不會被刪除）')) {
    Cloud.setCode(''); renderCloudBox();
  }
};

/* ================= 首次觸控解鎖音訊（iPad 必要） ================= */
function firstTouch() {
  AudioEngine.unlock();
  pickVoices();
  document.removeEventListener('pointerdown', firstTouch);
}
document.addEventListener('pointerdown', firstTouch);
Cloud.autoRestore();   // 雲端有更新的備份就自動還原

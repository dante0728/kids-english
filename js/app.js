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
  save() { localStorage.setItem('abc-custom', JSON.stringify(this.data)); },
};
// 內建單字 + 家長新增的單字（_custom 標記）
function allWords(theme) {
  const extra = (Custom.data.words[theme.id] || []).map(w => ({ ...w, _custom: true }));
  return theme.words.concat(extra);
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
  $('backBtn').style.display = name === 'menu' ? 'none' : '';
}
$('homeBtn').onclick = () => { stopSpeech(); stopRecognition(); showScreen('menu'); };
$('backBtn').onclick = () => {
  stopSpeech(); stopRecognition();
  showScreen(currentScreen === 'mode' || currentScreen === 'parent' ? 'menu' : 'mode');
};
$('parentBtn').onclick = () => {
  stopSpeech(); stopRecognition();
  showPin('👨‍👩‍👧 家長模式密碼', () => { openParent(); });
};
$('bgmBtn').onclick = () => {
  const on = AudioEngine.toggleBgm();
  $('bgmBtn').classList.toggle('off', !on);
};

/* ================= 主題選單 ================= */
THEMES.forEach(t => {
  const c = document.createElement('div');
  c.className = 'menu-card';
  c.style.setProperty('--c', t.color);
  c.innerHTML = `<span class="emoji">${t.emoji}</span><span class="name">${t.name}</span>
                 <div class="count">${t.words.length} 個單字</div>`;
  c.onclick = () => openTheme(t);
  $('themeGrid').appendChild(c);
});
function openTheme(t) {
  currentTheme = t;
  $('modeTitle').textContent = `${t.emoji} ${t.name}`;
  showScreen('mode');
}
$('modeCards').onclick = () => startCardsGame();
$('modeListen').onclick = () => { listenCorrect = 0; startListenGame(); };
$('modeSpeak').onclick = () => startSpeakGame();
$('modeBattle').onclick = () => startBattleGame();

/* ================= 遊戲一：點點聽 ================= */
function startCardsGame() {
  showScreen('cards');
  $('cardsTitle').textContent = `${currentTheme.emoji} 點點聽`;
  const grid = $('cardGrid');
  grid.innerHTML = '';
  allWords(currentTheme).forEach((w, i) => {
    const c = document.createElement('div');
    c.className = 'word-card';
    c.style.setProperty('--c', currentTheme.color);
    c.innerHTML = `${visualHTML(currentTheme, i)}<div class="en">${w.en}</div><div class="zh">${w.zh}</div>`;
    c.onclick = () => {
      document.querySelectorAll('.word-card').forEach(x => x.classList.remove('speaking'));
      c.classList.add('speaking');
      playWordSequence(currentTheme, i, () => c.classList.remove('speaking'));
    };
    grid.appendChild(c);
  });
}

/* ================= 遊戲二：聽聽看（答對 5 題過關） ================= */
let listenAnswer = null, listenAnswerIdx = 0, listenCorrect = 0, listenLock = false;
const LISTEN_GOAL = 5;

function updateListenProgress() {
  $('listenProgress').textContent =
    '⭐'.repeat(listenCorrect) + '⚪'.repeat(LISTEN_GOAL - listenCorrect);
}
function startListenGame() {
  showScreen('listen');
  listenLock = false;
  updateListenProgress();
  const merged = allWords(currentTheme);
  const idxs = shuffled(merged.map((_, i) => i)).slice(0, 4);
  listenAnswerIdx = idxs[Math.floor(Math.random() * idxs.length)];
  listenAnswer = merged[listenAnswerIdx];
  const grid = $('choiceGrid');
  grid.innerHTML = '';
  idxs.forEach(i => {
    const w = merged[i];
    const d = document.createElement('div');
    d.className = 'choice';
    d.innerHTML = visualHTML(currentTheme, i);
    d.onclick = (e) => {
      if (listenLock) return;
      if (i === listenAnswerIdx) {
        listenLock = true;
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
        AudioEngine.playSfx('wrong');
        setTimeout(() => playTryAgain(), 350);
        setTimeout(() => d.classList.remove('wrong'), 600);
      }
    };
    grid.appendChild(d);
  });
  setTimeout(() => { stopSpeech(); chainId++; playWordAudio(currentTheme, listenAnswerIdx, null); }, 500);
}
$('bigSpeaker').onclick = () => {
  if (listenAnswer) { stopSpeech(); chainId++; playWordAudio(currentTheme, listenAnswerIdx, null); }
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
  startListenGame();
};

/* ================= 遊戲三：跟著唸 ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, speakIdx = 0;
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
  const merged = allWords(currentTheme);
  speakIdx = Math.floor(Math.random() * merged.length);
  const w = merged[speakIdx];
  $('speakTarget').innerHTML =
    `${visualHTML(currentTheme, speakIdx)}<div class="en">${w.en}</div><div class="zh">${w.zh}</div>`;
  speakResult.textContent = '';
  chainId++;
  playWordAudio(currentTheme, speakIdx, null);
}
function speakSuccess() {
  const w = allWords(currentTheme)[speakIdx];
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
  if (!SR) return;
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
    const target = allWords(currentTheme)[speakIdx].en.toLowerCase();
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
$('replayBtn').onclick = () => { stopSpeech(); chainId++; playWordAudio(currentTheme, speakIdx, null); };
$('nextWordBtn').onclick = nextSpeakWord;

/* ================= 遊戲四：英雄打怪獸 ================= */
const MONSTERS = ['👾', '🐲', '🦖', '👹', '🧌'];
let battle = { hp: 5, max: 5, answerIdx: 0, lock: false };

function startBattleGame() {
  showScreen('battle');
  battle.hp = battle.max = 5;
  battle.lock = false;
  $('heroImg').src = `assets/img/heroes_${Math.floor(Math.random() * 20)}.svg`;
  $('monsterFace').textContent = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  AudioEngine.playSfx('growl');
  updateHp();
  nextBattleRound();
}
function updateHp() {
  $('monsterHp').textContent = '❤️'.repeat(battle.hp) + '🖤'.repeat(battle.max - battle.hp);
}
function nextBattleRound() {
  battle.lock = false;
  const merged = allWords(currentTheme);
  const idxs = shuffled(merged.map((_, i) => i)).slice(0, 4);
  battle.answerIdx = idxs[Math.floor(Math.random() * idxs.length)];
  const grid = $('battleChoices');
  grid.innerHTML = '';
  idxs.forEach(i => {
    const d = document.createElement('div');
    d.className = 'choice';
    d.innerHTML = visualHTML(currentTheme, i);
    d.onclick = () => battleAnswer(i, d);
    grid.appendChild(d);
  });
  setTimeout(() => { stopSpeech(); chainId++; playWordAudio(currentTheme, battle.answerIdx, null); }, 450);
}
function battleAnswer(i, el) {
  if (battle.lock) return;
  if (i !== battle.answerIdx) {
    el.classList.add('wrong');
    AudioEngine.playSfx('wrong');
    $('monsterFace').classList.add('taunt');
    setTimeout(() => { el.classList.remove('wrong'); $('monsterFace').classList.remove('taunt'); }, 550);
    playTryAgain();
    return;
  }
  battle.lock = true;
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
$('battleSpeaker').onclick = () => { stopSpeech(); chainId++; playWordAudio(currentTheme, battle.answerIdx, null); };

/* ================= 家長模式 ================= */
let parentTheme = THEMES[0];

function openParent() {
  showScreen('parent');
  renderParentThemes();
  renderParentAdd();
  renderParentList();
}
function renderParentThemes() {
  const box = $('parentThemes');
  box.innerHTML = '';
  THEMES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'ptheme-chip' + (t === parentTheme ? ' on' : '');
    b.textContent = `${t.emoji} ${t.name}`;
    b.onclick = () => { parentTheme = t; openParent(); };
    box.appendChild(b);
  });
}
function renderParentAdd() {
  $('parentAdd').innerHTML = `
    <b>➕ 新增「${parentTheme.name}」單字</b>
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
    openParent();
  };
}
function renderParentList() {
  const list = $('parentList');
  list.innerHTML = '';
  const merged = allWords(parentTheme);
  merged.forEach((w, i) => {
    const key = parentTheme.id + '_' + i;
    const row = document.createElement('div');
    row.className = 'prow';
    const src = imgSrcFor(parentTheme, i);
    row.innerHTML = `
      ${src ? `<img class="thumb" src="${src}" onerror="this.outerHTML='<span class=thumb>${w.emoji || '⭐'}</span>'">`
            : `<span class="thumb">${w.emoji || '⭐'}</span>`}
      <div class="ptxt"><div class="p-en">${w.en} ${w._custom ? '<span class="badge-custom">自訂</span>' : ''}</div>
      <div class="p-zh">${w.zh}</div></div>
      <label class="pbtn">📷 換圖<input type="file" accept="image/*" hidden></label>
      <button class="pbtn rec" data-k="w">🎙️ 錄單字</button>
      <button class="pbtn rec" data-k="s">🎙️ 錄例句</button>
      <button class="pbtn">▶ 試聽</button>
      ${w._custom ? '<button class="pbtn del">🗑️</button>' : ''}`;
    // 換圖
    row.querySelector('input[type=file]').onchange = async (e) => {
      if (!e.target.files[0]) return;
      const data = await fileToThumb(e.target.files[0]);
      if (w._custom) { getCustomWord(i).img = data; }
      else { (Custom.data.over[key] = Custom.data.over[key] || {}).img = data; }
      Custom.save(); renderParentList();
    };
    // 錄音（單字 / 例句）
    row.querySelectorAll('.pbtn.rec').forEach(btn => {
      btn.onclick = () => toggleRecord(btn, async (dataUrl) => {
        const k = 'a' + btn.dataset.k;
        if (w._custom) { getCustomWord(i)[k] = dataUrl; }
        else { (Custom.data.over[key] = Custom.data.over[key] || {})[k] = dataUrl; }
        Custom.save();
      });
    });
    // 試聽與刪除
    row.querySelectorAll('.pbtn').forEach(b => {
      if (b.textContent.includes('試聽')) b.onclick = () => playWordSequence(parentTheme, i, null);
      if (b.classList.contains('del')) b.onclick = () => {
        if (confirm(`確定刪除「${w.en}」？`)) {
          Custom.data.words[parentTheme.id].splice(i - parentTheme.words.length, 1);
          Custom.save(); openParent();
        }
      };
    });
    list.appendChild(row);
  });
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
// 匯出 / 匯入備份
$('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(Custom.data)], { type: 'application/json' });
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
      if (!d.words || !d.over) throw new Error('格式不對');
      Custom.data = d; Custom.save();
      alert('匯入成功！'); openParent();
    } catch (err) { alert('匯入失敗：' + err.message); }
  };
  fr.readAsText(f);
};

/* ================= 首次觸控解鎖音訊（iPad 必要） ================= */
function firstTouch() {
  AudioEngine.unlock();
  pickVoices();
  document.removeEventListener('pointerdown', firstTouch);
}
document.addEventListener('pointerdown', firstTouch);

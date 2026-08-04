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
const voicePath = (t, i, kind) => `assets/voice/${t.id}_${i}_${kind}.mp3`;

function playWordAudio(theme, i, cb) {
  const id = chainId;
  const done = () => { if (id === chainId && cb) cb(); };
  playFile(voicePath(theme, i, 'w'), done, () => speakEn(theme.words[i].en, done));
}
function playSentenceAudio(theme, i, cb) {
  const id = chainId;
  const w = theme.words[i];
  showSentence(w.sen, w.szh);
  const done = () => { setTimeout(hideSentence, 800); if (id === chainId && cb) cb(); };
  playFile(voicePath(theme, i, 's'), done,
    () => speakEn(w.sen, () => { if (id === chainId) speakZh(w.szh, done); }));
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
  const dur = AudioEngine.playSfx(theme.words[i].sfx);
  setTimeout(() => {
    if (id !== chainId) return;
    playWordAudio(theme, i, () => {
      if (id !== chainId) return;
      playSentenceAudio(theme, i, () => { if (id === chainId && onDone) onDone(); });
    });
  }, Math.max(dur * 1000, 300) + 150);
}

/* ================= 單字圖示（照片優先、emoji 備援） ================= */
// 英雄關沒有照片（官方角色圖有版權），直接用 emoji
function visualHTML(theme, i) {
  const w = theme.words[i];
  if (theme.id === 'heroes') return `<span class="emoji">${w.emoji}</span>`;
  return `<span class="pic"><img src="assets/img/${theme.id}_${i}.jpg" alt="${w.en}" loading="lazy"
            onerror="this.parentElement.classList.add('noimg')"><span class="emoji">${w.emoji}</span></span>`;
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
  showScreen(currentScreen === 'mode' ? 'menu' : 'mode');
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

/* ================= 遊戲一：點點聽 ================= */
function startCardsGame() {
  showScreen('cards');
  $('cardsTitle').textContent = `${currentTheme.emoji} 點點聽`;
  const grid = $('cardGrid');
  grid.innerHTML = '';
  currentTheme.words.forEach((w, i) => {
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
  const idxs = shuffled(currentTheme.words.map((_, i) => i)).slice(0, 4);
  listenAnswerIdx = idxs[Math.floor(Math.random() * idxs.length)];
  listenAnswer = currentTheme.words[listenAnswerIdx];
  const grid = $('choiceGrid');
  grid.innerHTML = '';
  idxs.forEach(i => {
    const w = currentTheme.words[i];
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
  speakIdx = Math.floor(Math.random() * currentTheme.words.length);
  const w = currentTheme.words[speakIdx];
  $('speakTarget').innerHTML =
    `${visualHTML(currentTheme, speakIdx)}<div class="en">${w.en}</div><div class="zh">${w.zh}</div>`;
  speakResult.textContent = '';
  chainId++;
  playWordAudio(currentTheme, speakIdx, null);
}
function speakSuccess() {
  const w = currentTheme.words[speakIdx];
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
    const target = currentTheme.words[speakIdx].en.toLowerCase();
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

/* ================= 首次觸控解鎖音訊（iPad 必要） ================= */
function firstTouch() {
  AudioEngine.unlock();
  pickVoices();
  document.removeEventListener('pointerdown', firstTouch);
}
document.addEventListener('pointerdown', firstTouch);

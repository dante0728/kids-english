/* =====================================================
   音效引擎（雙層架構）
   第一層：預先合成好的 mp3（assets/sfx/*.mp3、assets/bgm.mp3）
           部署到網站後走這層，音質固定、跨裝置一致
   第二層：Web Audio 即時合成備援
           直接雙擊開 index.html（file://）抓不到檔案時自動切換
   對外介面：
     AudioEngine.unlock()        第一次觸控時呼叫（iPad 必要）
     AudioEngine.playSfx(name)   播放音效，回傳長度(秒)
     AudioEngine.toggleBgm()     開關背景音樂
     AudioEngine.duck(true/false) 朗讀時壓低背景音樂
   ===================================================== */
const AudioEngine = (() => {
  let ctx = null, sfxGain = null, bgmGain = null;
  let bgmTimer = null, bgmStep = 0, bgmEnabled = true;
  let bgmBuffer = null, bgmSource = null;
  const buffers = {};          // 預合成音效 name -> AudioBuffer | null(載入失敗)
  let preloadStarted = false;

  const BGM_VOL = 0.14, BGM_DUCK = 0.04;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = BGM_VOL; bgmGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  /* ---------- 第一層：載入預合成音檔 ---------- */
  async function loadBuffer(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url);
    return await ctx.decodeAudioData(await r.arrayBuffer());
  }
  async function preload() {
    if (preloadStarted || !ensure()) return;
    preloadStarted = true;
    if (location.protocol === 'file:') return;   // file:// 無法 fetch，直接用合成
    const names = Object.keys(SFX);
    await Promise.all(names.map(async n => {
      try { buffers[n] = await loadBuffer(`assets/sfx/${n}.mp3`); }
      catch (e) { buffers[n] = null; }
    }));
    try {
      bgmBuffer = await loadBuffer('assets/bgm.wav');   // wav 可無縫循環（mp3 開頭有空白）
      if (bgmEnabled) { stopBgm(); startBgm(); }   // 換成無縫循環的音檔版
    } catch (e) { bgmBuffer = null; }
  }
  function playBuffer(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(sfxGain);
    src.start();
    return buf.duration;
  }

  /* ---------- 第二層：即時合成 ---------- */
  function tone({ f0, f1, t = 0.2, type = 'sine', v = 0.25, delay = 0, vib = 0, vr = 8 }) {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1 || f0, 1), now + t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(v, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    if (vib) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = vr;
      const lg = ctx.createGain(); lg.gain.value = vib;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(now); lfo.stop(now + t);
    }
    osc.connect(g); g.connect(sfxGain);
    osc.start(now); osc.stop(now + t + 0.05);
  }
  function noiseBurst({ t = 0.2, f = 1000, f1, q = 1, v = 0.3, delay = 0, hp = false }) {
    const now = ctx.currentTime + delay;
    const len = Math.ceil(ctx.sampleRate * t);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = hp ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(f, now);
    if (f1) filter.frequency.exponentialRampToValueAtTime(f1, now + t);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(v, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    src.connect(filter); filter.connect(g); g.connect(sfxGain);
    src.start(now); src.stop(now + t);
  }

  const SFX = {
    /* 交通工具 */
    horn()   { tone({ f0: 440, t: .25, type: 'square', v: .2 }); tone({ f0: 349, t: .25, type: 'square', v: .2 });
               tone({ f0: 440, t: .3, type: 'square', v: .2, delay: .35 }); tone({ f0: 349, t: .3, type: 'square', v: .2, delay: .35 }); return .8; },
    engine() { tone({ f0: 85, t: .9, type: 'sawtooth', v: .3, vib: 18, vr: 28 }); noiseBurst({ t: .9, f: 220, q: 2, v: .12 }); return 1; },
    train()  { for (let i = 0; i < 4; i++) noiseBurst({ t: .1, f: 500, q: 1.5, v: .25, delay: i * .18 });
               tone({ f0: 660, t: .45, type: 'triangle', v: .22, delay: .8, vib: 12, vr: 10 });
               tone({ f0: 550, t: .45, type: 'triangle', v: .18, delay: .8 }); return 1.3; },
    plane()  { noiseBurst({ t: 1.1, f: 350, f1: 1400, q: 2, v: .28 }); tone({ f0: 200, f1: 500, t: 1.1, type: 'sawtooth', v: .12 }); return 1.2; },
    boat()   { tone({ f0: 110, t: .8, type: 'sawtooth', v: .28 }); tone({ f0: 92, t: .8, type: 'sawtooth', v: .22 }); return .9; },
    bell()   { tone({ f0: 1400, t: .12, type: 'triangle', v: .3 }); tone({ f0: 1400, t: .18, type: 'triangle', v: .3, delay: .16 }); return .5; },
    siren()  { tone({ f0: 700, f1: 1000, t: .35, type: 'sine', v: .25 }); tone({ f0: 1000, f1: 700, t: .35, type: 'sine', v: .25, delay: .35 });
               tone({ f0: 700, f1: 1000, t: .35, type: 'sine', v: .25, delay: .7 }); return 1.1; },
    heli()   { for (let i = 0; i < 9; i++) noiseBurst({ t: .05, f: 300, q: 2, v: .3, delay: i * .1 }); return 1; },
    rocket() { noiseBurst({ t: 1, f: 200, f1: 2200, q: 1, v: .3 }); tone({ f0: 120, f1: 900, t: 1, type: 'sawtooth', v: .12 }); return 1.1; },

    /* 動物 */
    woof()   { noiseBurst({ t: .13, f: 320, f1: 150, q: 4, v: .4 }); tone({ f0: 220, f1: 120, t: .13, type: 'sawtooth', v: .25 });
               noiseBurst({ t: .13, f: 320, f1: 150, q: 4, v: .4, delay: .25 }); tone({ f0: 220, f1: 120, t: .13, type: 'sawtooth', v: .25, delay: .25 }); return .6; },
    meow()   { tone({ f0: 500, f1: 950, t: .22, type: 'sawtooth', v: .16, vib: 25, vr: 14 });
               tone({ f0: 950, f1: 420, t: .32, type: 'sawtooth', v: .16, vib: 25, vr: 14, delay: .22 }); return .7; },
    moo()    { tone({ f0: 190, f1: 120, t: .75, type: 'sawtooth', v: .25, vib: 12, vr: 9 }); return .9; },
    oink()   { noiseBurst({ t: .09, f: 420, q: 6, v: .35 }); tone({ f0: 210, f1: 140, t: .09, type: 'square', v: .12 });
               noiseBurst({ t: .09, f: 420, q: 6, v: .35, delay: .2 }); tone({ f0: 210, f1: 140, t: .09, type: 'square', v: .12, delay: .2 }); return .5; },
    neigh()  { tone({ f0: 900, f1: 380, t: .6, type: 'sawtooth', v: .16, vib: 70, vr: 22 }); return .7; },
    baa()    { tone({ f0: 520, f1: 460, t: .55, type: 'sawtooth', v: .16, vib: 45, vr: 16 }); return .7; },
    quack()  { tone({ f0: 360, f1: 240, t: .12, type: 'square', v: .2 }); tone({ f0: 360, f1: 240, t: .12, type: 'square', v: .2, delay: .2 }); return .5; },
    cluck()  { for (let i = 0; i < 3; i++) tone({ f0: 620, f1: 380, t: .07, type: 'square', v: .16, delay: i * .14 }); return .5; },
    tweet()  { tone({ f0: 2100, f1: 2700, t: .09, v: .2 }); tone({ f0: 2500, f1: 3100, t: .09, v: .2, delay: .15 });
               tone({ f0: 2200, f1: 2900, t: .1, v: .2, delay: .3 }); return .5; },
    ribbit() { tone({ f0: 160, f1: 95, t: .16, type: 'sawtooth', v: .25, vib: 30, vr: 30 });
               tone({ f0: 160, f1: 95, t: .16, type: 'sawtooth', v: .25, vib: 30, vr: 30, delay: .25 }); return .5; },
    hiss()   { noiseBurst({ t: .7, f: 4200, q: .8, v: .2, hp: true }); return .8; },
    roar()   { noiseBurst({ t: .8, f: 260, q: .9, v: .35 }); tone({ f0: 130, f1: 80, t: .8, type: 'sawtooth', v: .28, vib: 15, vr: 12 }); return .9; },
    growl()  { noiseBurst({ t: .5, f: 200, q: 1.2, v: .3 }); tone({ f0: 100, f1: 70, t: .5, type: 'sawtooth', v: .25, vib: 10, vr: 15 }); return .6; },
    trumpet(){ tone({ f0: 320, f1: 650, t: .5, type: 'sawtooth', v: .22, vib: 35, vr: 12 }); tone({ f0: 640, f1: 900, t: .25, type: 'sawtooth', v: .18, delay: .5 }); return .8; },
    squeak() { for (let i = 0; i < 3; i++) tone({ f0: 1300, f1: 1900, t: .1, v: .2, delay: i * .16 }); return .6; },

    /* 通用趣味音效 */
    pop()    { tone({ f0: 420, f1: 160, t: .13, type: 'square', v: .22 }); return .3; },
    ding()   { tone({ f0: 880, t: .3, type: 'triangle', v: .25 }); tone({ f0: 1320, t: .3, type: 'triangle', v: .15, delay: .05 }); return .5; },
    boing()  { tone({ f0: 320, f1: 95, t: .4, type: 'sawtooth', v: .2, vib: 55, vr: 20 }); return .5; },
    whoosh() { noiseBurst({ t: .5, f: 500, f1: 3000, q: 1, v: .25 }); return .6; },
    magic()  { [800, 1050, 1320, 1680].forEach((f, i) => tone({ f0: f, t: .18, type: 'triangle', v: .18, delay: i * .1 })); return .7; },
    fanfare(){ [523, 659, 784, 1046].forEach((f, i) => tone({ f0: f, t: .22, type: 'triangle', v: .22, delay: i * .13 })); return .8; },
    zap()    { tone({ f0: 1300, f1: 90, t: .28, type: 'square', v: .2 }); return .4; },
    power()  { tone({ f0: 200, f1: 850, t: .4, type: 'sawtooth', v: .18 }); tone({ f0: 1100, t: .2, type: 'triangle', v: .2, delay: .4 }); return .7; },
    clang()  { tone({ f0: 920, t: .45, type: 'square', v: .16 }); tone({ f0: 1370, t: .3, type: 'square', v: .1 }); return .5; },
    robot()  { [320, 520, 410].forEach((f, i) => tone({ f0: f, t: .1, type: 'square', v: .18, delay: i * .15 })); return .6; },
    knock()  { noiseBurst({ t: .07, f: 160, q: 7, v: .4 }); noiseBurst({ t: .07, f: 160, q: 7, v: .4, delay: .2 }); return .4; },
    tick()   { tone({ f0: 1050, t: .04, type: 'square', v: .15 }); tone({ f0: 850, t: .04, type: 'square', v: .15, delay: .3 }); return .5; },
    jingle() { tone({ f0: 2000, t: .09, type: 'triangle', v: .2 }); tone({ f0: 2450, t: .09, type: 'triangle', v: .2, delay: .11 });
               tone({ f0: 2000, t: .12, type: 'triangle', v: .2, delay: .22 }); return .5; },
    ring()   { for (let i = 0; i < 6; i++) tone({ f0: i % 2 ? 1150 : 1350, t: .06, type: 'triangle', v: .18, delay: i * .07 });
               for (let i = 0; i < 6; i++) tone({ f0: i % 2 ? 1150 : 1350, t: .06, type: 'triangle', v: .18, delay: .6 + i * .07 }); return 1.1; },
    snip()   { noiseBurst({ t: .05, f: 3200, q: 3, v: .3 }); noiseBurst({ t: .05, f: 3200, q: 3, v: .3, delay: .15 }); return .3; },
    brush()  { for (let i = 0; i < 3; i++) noiseBurst({ t: .12, f: 2200, q: 1, v: .2, delay: i * .18 }); return .6; },
    bubble() { [300, 420, 560].forEach((f, i) => tone({ f0: f, f1: f * 1.6, t: .12, v: .2, delay: i * .15 })); return .6; },

    /* 遊戲回饋 */
    yay()    { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f0: f, t: .18, type: 'triangle', v: .22, delay: i * .09 })); return .7; },
    wrong()  { tone({ f0: 300, f1: 200, t: .3, type: 'square', v: .15 }); return .4; },
  };

  function playSfx(name) {
    if (!ensure()) return 0;
    duckSfxBgm();
    const buf = buffers[name];
    if (buf) return playBuffer(buf);          // 第一層：預合成檔
    const fn = SFX[name] || SFX.pop;
    return fn();                               // 第二層：即時合成
  }

  /* ---------- 背景音樂 ---------- */
  const MELODY = [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 587, 523, 440, 392];
  const BASS   = [131, 131, 175, 175, 196, 196, 147, 147];
  const STEP_MS = 280;

  function bgmTick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const m = MELODY[bgmStep % MELODY.length];
    const b = BASS[Math.floor(bgmStep / 2) % BASS.length];
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = m;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g); g.connect(bgmGain); osc.start(now); osc.stop(now + 0.3);
    if (bgmStep % 2 === 0) {
      const bo = ctx.createOscillator(); bo.type = 'sine'; bo.frequency.value = b;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, now);
      bg.gain.exponentialRampToValueAtTime(0.35, now + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      bo.connect(bg); bg.connect(bgmGain); bo.start(now); bo.stop(now + 0.55);
    }
    bgmStep++;
  }

  function startBgm() {
    if (!ensure()) return;
    if (bgmBuffer) {                        // 音檔無縫循環
      if (bgmSource) return;
      bgmSource = ctx.createBufferSource();
      bgmSource.buffer = bgmBuffer;
      bgmSource.loop = true;
      bgmSource.connect(bgmGain);
      bgmSource.start();
    } else if (!bgmTimer) {                 // 合成備援
      bgmTimer = setInterval(bgmTick, STEP_MS);
    }
  }
  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (bgmSource) { try { bgmSource.stop(); } catch (e) {} bgmSource = null; }
  }
  function toggleBgm() {
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled) startBgm(); else stopBgm();
    return bgmEnabled;
  }

  let duckTimer = null;
  function duck(on) {
    if (!ctx) return;
    const target = on ? BGM_DUCK : BGM_VOL;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.25);
  }
  function duckSfxBgm() {
    duck(true);
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => { if (!window.__ttsSpeaking) duck(false); }, 1500);
  }

  function unlock() {
    if (!ensure()) return;
    preload();
    if (bgmEnabled) startBgm();
  }

  return { unlock, playSfx, startBgm, stopBgm, toggleBgm, duck,
           get sfxNames() { return Object.keys(SFX); },
           get bgmEnabled() { return bgmEnabled; } };
})();

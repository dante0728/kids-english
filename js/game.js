/* =====================================================
   養成遊戲核心（載入於 app.js 之後，可覆寫其函式）
   系統：寵物之家 / 學習(4階段20步) / 冒險(3種題型) /
        培養(進化.食物.裝飾.夥伴) / 圖鑑 / 家長寵物編輯.分組編輯
   存檔：localStorage 'abc-pet'、'abc-lessons'，隨 Cloud 同步
   ===================================================== */

/* ================= 寵物資料 ================= */
const DEFAULT_PETS = [
  { id: 'dino', names: ['滾滾蛋', '小龍獸', '暴暴龍獸', '戰甲龍獸'] },
  { id: 'aqua', names: ['泡泡蛋', '企鵝寶', '鯊鯊獸', '海皇獸'] },
  { id: 'leaf', names: ['葉葉蛋', '芽芽兔', '花花狐', '森林王'] },
];
const PET_LINES = [
  '我好餓喔～給我點心吃嘛！', '陪我玩！我們去冒險吧！', '我想學英文！教教我嘛！',
  '嘿嘿，摸摸我～好舒服！', '今天也要一起加油喔！', '好開心！最喜歡你了！',
  '我要變得越來越強！', '哇！好好吃！謝謝你！', '耶！我升級了！',
  '哇！！我進化了！！好厲害！', '好想睡覺喔…呼嚕嚕…', '你答對好多題，好棒喔！',
];

const PetState = (() => {
  let d;
  try { d = JSON.parse(localStorage.getItem('abc-pet')); } catch (e) {}
  if (!d) d = { active: 'dino', pets: {}, hearts: 6, deco: { owned: [], placed: [] }, comp: [1] };
  d.hearts = Math.min(10, d.hearts || 0);   // 舊存檔的愛心轉為飽足度（上限 10）
  return d;
})();

/* ---- 飽足度：上限 10，每 90 分鐘自然 -1（離線時間也會計算） ---- */
const FULL_MAX = 10;
const FULL_DECAY_MS = 90 * 60 * 1000;
function fullnessTick() {
  const now = Date.now();
  if (!PetState.lastTick) { PetState.lastTick = now; savePet(); return; }
  const drop = Math.floor((now - PetState.lastTick) / FULL_DECAY_MS);
  if (drop > 0) {
    PetState.hearts = Math.max(0, PetState.hearts - drop);
    PetState.lastTick += drop * FULL_DECAY_MS;
    savePet();
  }
}
// 三種狀態：吃飽開心(7+) / 普通(4-6) / 肚子餓沒活力(0-3)
function moodOf() {
  return PetState.hearts >= 7 ? 'full' : PetState.hearts >= 4 ? 'ok' : 'hungry';
}
const MOOD_INFO = {
  full: { text: '😊 吃飽開心', cls: 'mood-full', sfx: '_f' },
  ok: { text: '😌 普通', cls: '', sfx: '' },
  hungry: { text: '😫 肚子餓…', cls: 'mood-hungry', sfx: '_h' },
};
// 目前心情對應的圖片後綴
function moodSuffix() { return MOOD_INFO[moodOf()].sfx; }
function savePet() {
  localStorage.setItem('abc-pet', JSON.stringify(PetState));
  Cloud.schedule();
}
function petCfg() { return Custom.data.petCfg || (Custom.data.petCfg = { over: {}, customs: [] }); }
// 全部寵物（內建套用家長改名/換圖 + 家長自建）
function petList() {
  const cfg = petCfg();
  const base = DEFAULT_PETS.map(p => {
    const ov = cfg.over[p.id] || {};
    return { id: p.id, names: p.names.map((n, s) => (ov.names && ov.names[s]) || n),
             imgs: ov.imgs || [], _default: true };
  });
  const customs = (cfg.customs || []).map(p => ({ ...p, _customPet: true }));
  return base.concat(customs);
}
function petDef(id) { return petList().find(p => p.id === id) || petList()[0]; }
// mood: '' 普通 / '_h' 肚子餓 / '_f' 吃飽開心（家長自訂圖沒有心情變化，直接沿用）
function petImgSrc(id, stage, mood) {
  const def = petDef(id);
  if (def.imgs && def.imgs[stage]) return def.imgs[stage];
  if (def._default) return `assets/img/pet_${id}_${stage}${mood || ''}.svg`;
  return null;   // 自建寵物沒圖 → 用 emoji
}
function petData(id) {
  return PetState.pets[id] || (PetState.pets[id] = { exp: 0, stage: 0 });
}
const petLevel = exp => Math.floor(exp / 10) + 1;
const targetStage = lv => lv >= 30 ? 3 : lv >= 20 ? 2 : lv >= 10 ? 1 : 0;
const canEvolve = pd => targetStage(petLevel(pd.exp)) > pd.stage;

function updateCurrency() {
  $('starCount').textContent = stars;
  $('heartCount').textContent = PetState.hearts + '/' + FULL_MAX;
}
// 寵物說話：家長/小朋友自己錄的優先，其次內建語音，最後才用瀏覽器合成
function petLineSrc(i) {
  const rec = (Custom.data.petLines || {})[i];
  return rec || ('assets/voice/pet_line_' + i + '.mp3');
}
function playPetLine(i) {
  playFile(petLineSrc(i), null, () => speakZh(PET_LINES[i]));
}
let bubbleTimer = null;
function showBubble(text, ms = 2600) {
  const b = $('petBubble');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
}
function gainExp(n) {
  const pd = petData(PetState.active);
  const before = petLevel(pd.exp);
  pd.exp += n;
  const after = petLevel(pd.exp);
  savePet();
  if (after > before) {
    AudioEngine.playSfx('yay');
    showBubble(PET_LINES[8]);
    playPetLine(8);
    if (canEvolve(pd)) setTimeout(() => showBubble('我可以進化了！快去「培養」！', 3200), 3000);
  }
  return after > before;
}

/* ================= 寵物之家（大房間可拖曳參觀） ================= */
const WORLD = { w: 1200, h: 640 };
// 內建家具（世界座標，yb = 底部貼地位置；地板線約 y=400）
// 左半＝客廳（門、沙發、電視），右半＝臥室（床、櫃子）
const FURNITURE = [
  { icon: '🚪', x: 25, yb: 440, s: 175 },    // 門（最左）
  { icon: '🛋️', x: 205, yb: 508, s: 140 },   // 沙發（客廳，靠門）
  { icon: '📺', x: 365, yb: 470, s: 100 },   // 電視
  { icon: '🪟', x: 520, yb: 250, s: 120 },   // 窗（牆上）
  { icon: '🕰️', x: 700, yb: 145, s: 70 },    // 時鐘（牆上）
  { icon: '🖼️', x: 815, yb: 238, s: 88 },    // 掛畫（牆上）
  { icon: '🪑', x: 760, yb: 552, s: 85 },    // 椅子
  { icon: '🛏️', x: 880, yb: 518, s: 150 },   // 床（右邊臥室）
  { icon: '🗄️', x: 1050, yb: 472, s: 125 },  // 收納櫃
  { icon: '🧺', x: 1120, yb: 612, s: 58 },   // 籃子
];
// 買來的裝飾品的擺放位置（世界座標，底部貼地；四排造出前後景深）
const DECO_SIZE = 50;
const DECO_SLOTS = [
  { x: 160, yb: 482 }, { x: 300, yb: 482 }, { x: 445, yb: 482 }, { x: 620, yb: 482 },
  { x: 905, yb: 482 }, { x: 1000, yb: 482 }, { x: 1150, yb: 482 },
  { x: 95, yb: 524 }, { x: 235, yb: 524 }, { x: 375, yb: 524 }, { x: 505, yb: 524 },
  { x: 645, yb: 524 }, { x: 790, yb: 524 }, { x: 1058, yb: 524 },
  { x: 130, yb: 572 }, { x: 275, yb: 572 }, { x: 415, yb: 572 }, { x: 725, yb: 572 },
  { x: 865, yb: 572 }, { x: 1000, yb: 572 }, { x: 1130, yb: 572 },
  { x: 60, yb: 622 }, { x: 195, yb: 622 }, { x: 330, yb: 622 }, { x: 455, yb: 622 },
  { x: 700, yb: 622 }, { x: 835, yb: 622 }, { x: 965, yb: 622 }, { x: 1090, yb: 622 },
  { x: 560, yb: 645 },
];
// 房間拖曳（拖了就不觸發點寵物）
let roomMoved = false;
(function setupRoomPan() {
  const room = $('petRoom'), world = $('roomWorld');
  let px = 0, py = 0, sx = 0, sy = 0, bx = 0, by = 0, dragging = false;
  function apply() {
    px = Math.min(0, Math.max(room.clientWidth - WORLD.w, px));
    py = Math.min(0, Math.max(room.clientHeight - WORLD.h, py));
    world.style.transform = `translate(${px}px, ${py}px)`;
  }
  room.addEventListener('pointerdown', e => {
    dragging = true; roomMoved = false;
    sx = e.clientX; sy = e.clientY; bx = px; by = py;
    try { room.setPointerCapture(e.pointerId); } catch (err) {}
  });
  room.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 8) roomMoved = true;
    px = bx + dx; py = by + dy;
    apply();
  });
  const end = () => { dragging = false; };
  room.addEventListener('pointerup', end);
  room.addEventListener('pointercancel', end);
  window.centerOnPet = () => {   // 進首頁時把視角對準寵物
    px = room.clientWidth / 2 - 590; py = room.clientHeight - WORLD.h;
    apply();
  };
})();
const DECO_ITEMS = [
  { id: 'plant', icon: '🪴', name: '小盆栽', cost: 20 }, { id: 'bear', icon: '🧸', name: '熊熊', cost: 25 },
  { id: 'ball', icon: '⚽', name: '足球', cost: 15 }, { id: 'art', icon: '🖼️', name: '掛畫', cost: 30 },
  { id: 'train', icon: '🚂', name: '小火車', cost: 35 }, { id: 'balloon', icon: '🎈', name: '氣球', cost: 10 },
  { id: 'piano', icon: '🎹', name: '小鋼琴', cost: 50 }, { id: 'mirror', icon: '🪞', name: '鏡子', cost: 30 },
  { id: 'slide', icon: '🛝', name: '溜滑梯', cost: 55 }, { id: 'tent', icon: '⛺', name: '帳篷', cost: 45 },
  { id: 'kite', icon: '🪁', name: '風箏', cost: 15 }, { id: 'puzzle', icon: '🧩', name: '拼圖', cost: 20 },
  { id: 'yoyo', icon: '🪀', name: '溜溜球', cost: 12 }, { id: 'easel', icon: '🎨', name: '畫架', cost: 35 },
  { id: 'books', icon: '📚', name: '書堆', cost: 25 }, { id: 'game', icon: '🕹️', name: '遊戲機', cost: 50 },
  { id: 'cactus', icon: '🌵', name: '仙人掌', cost: 18 }, { id: 'sunflower', icon: '🌻', name: '向日葵', cost: 18 },
  { id: 'fishtank', icon: '🐠', name: '魚缸', cost: 40 }, { id: 'tub', icon: '🛁', name: '浴缸', cost: 60 },
  { id: 'bike', icon: '🚲', name: '腳踏車', cost: 40 }, { id: 'scooter', icon: '🛴', name: '滑板車', cost: 30 },
  { id: 'guitar', icon: '🎸', name: '吉他', cost: 45 }, { id: 'drum', icon: '🥁', name: '小鼓', cost: 35 },
  { id: 'basketball', icon: '🏀', name: '籃球', cost: 15 }, { id: 'dart', icon: '🎯', name: '飛鏢靶', cost: 25 },
  { id: 'fridge', icon: '🧊', name: '冰箱', cost: 55 }, { id: 'umbrella', icon: '☂️', name: '雨傘架', cost: 20 },
  { id: 'candle', icon: '🕯️', name: '蠟燭', cost: 12 }, { id: 'gift', icon: '🎁', name: '禮物盒', cost: 30 },
];
function renderHome() {
  fullnessTick();
  const pd = petData(PetState.active);
  const def = petDef(PetState.active);
  const src = petImgSrc(PetState.active, pd.stage, moodSuffix());
  const img = $('petImg');
  if (src) { img.src = src; img.style.display = ''; }
  else { img.style.display = 'none'; }
  $('petName').textContent = def.names[pd.stage];
  $('petLevel').textContent = 'Lv.' + petLevel(pd.exp);
  $('expBar').style.width = (pd.exp % 10) * 10 + '%';
  // 依飽足度切換狀態外觀
  const mood = moodOf();
  const sp = $('petSprite');
  sp.classList.remove('mood-full', 'mood-hungry');
  if (MOOD_INFO[mood].cls) sp.classList.add(MOOD_INFO[mood].cls);
  $('petMood').textContent = MOOD_INFO[mood].text;
  // 內建家具
  const fb = $('roomFurniture');
  if (!fb.childElementCount) {
    FURNITURE.forEach(f => {
      const s = document.createElement('span');
      s.className = 'furn';
      s.textContent = f.icon;
      s.style.cssText = `left:${f.x}px;top:${f.yb - f.s}px;font-size:${f.s}px`;
      fb.appendChild(s);
    });
  }
  // 買來的裝飾
  const box = $('roomDeco');
  box.innerHTML = '';
  PetState.deco.placed.slice(0, DECO_SLOTS.length).forEach((id, k) => {
    const item = DECO_ITEMS.find(x => x.id === id);
    if (!item) return;
    const s = document.createElement('span');
    s.className = 'deco-item';
    s.textContent = item.icon;
    s.style.cssText = `left:${DECO_SLOTS[k].x}px;top:${DECO_SLOTS[k].yb - DECO_SIZE}px;font-size:${DECO_SIZE}px`;
    box.appendChild(s);
  });
  if (window.centerOnPet) centerOnPet();
  updateCurrency();
}
// 點寵物：隨機互動語音
const TAP_LINES = [0, 1, 2, 3, 4, 5, 6, 10];
$('petSprite').onclick = () => {
  if (roomMoved) return;   // 拖曳結束的誤觸不算點寵物
  // 肚子餓時大多喊餓；吃飽時偏向開心的話
  let i;
  const mood = moodOf();
  if (mood === 'hungry' && Math.random() < 0.7) i = 0;
  else if (mood === 'full' && Math.random() < 0.5) i = [5, 4, 3][Math.floor(Math.random() * 3)];
  else i = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)];
  const sp = $('petSprite');
  sp.classList.remove('happy'); void sp.offsetWidth;
  sp.classList.add('happy');
  AudioEngine.playSfx('pop');
  showBubble(PET_LINES[i]);
  stopSpeech(); chainId++;
  playPetLine(i);
};
// 主選單導覽
document.querySelectorAll('.nav-btn').forEach(b => {
  b.onclick = () => {
    AudioEngine.playSfx('ding');
    const go = b.dataset.go;
    if (go === 'learn') { showScreen('learn'); renderLearnMenu(); }
    else if (go === 'adventure') { showScreen('menu'); renderThemeMenu(); }
    else if (go === 'dex') { showScreen('dex'); renderDex(); }
    else { showScreen('care'); renderCare(go); }   // 進化 / 餵食 / 裝飾 / 夥伴
  };
});

/* ================= 學習：分組選單 ================= */
let learnTheme = null;
function groupNoOf(theme, i) {
  const map = (Custom.data.groups || {})[theme.id] || {};
  return map[i] !== undefined ? map[i] : Math.floor(i / 5);
}
function groupsFor(theme) {
  const groups = {};
  allWords(theme).forEach((w, i) => {
    const no = groupNoOf(theme, i);
    (groups[no] = groups[no] || []).push({ t: theme, i, w });
  });
  return Object.keys(groups).map(Number).sort((a, b) => a - b)
    .map(no => ({ no, refs: groups[no] }));
}
const lessonsDone = (() => { try { return JSON.parse(localStorage.getItem('abc-lessons')) || {}; } catch (e) { return {}; } })();
function renderLearnMenu() {
  const themes = allThemes().filter(t => allWords(t).length > 0);
  if (!learnTheme || !themes.find(t => t.id === learnTheme.id)) learnTheme = themes[0];
  const chips = $('learnThemes');
  chips.innerHTML = '';
  themes.forEach(t => {
    const b = document.createElement('button');
    b.className = 'ptheme-chip' + (t.id === learnTheme.id ? ' on' : '');
    b.textContent = `${t.emoji} ${t.name}`;
    b.onclick = () => { learnTheme = t; renderLearnMenu(); };
    chips.appendChild(b);
  });
  const grid = $('learnGroups');
  grid.innerHTML = '';
  groupsFor(learnTheme).forEach(g => {
    const key = learnTheme.id + '_g' + g.no;
    const done = lessonsDone[key] || 0;
    const card = document.createElement('div');
    card.className = 'group-card';
    card.innerHTML = `
      <div class="g-title">${learnTheme.name} ${g.no + 1}</div>
      <div class="g-done">${done ? '✓ 完成過 ' + done + ' 次' : '還沒學過'}</div>
      <div class="g-thumbs">${g.refs.slice(0, 5).map(r => {
        const src = imgSrcFor(r.t, r.i);
        return src ? `<img src="${src}" loading="lazy" onerror="this.outerHTML='<span>${r.w.emoji || '⭐'}</span>'">`
                   : `<span>${r.w.emoji || '⭐'}</span>`;
      }).join('')}</div>`;
    card.onclick = () => startLesson(learnTheme, g);
    grid.appendChild(card);
  });
}

/* ================= 學習：20 步課程 ================= */
const STAGE_NAMES = ['📖 學習', '🎤 練習', '📚 應用', '🎤 複習'];
const STAGE_TIPS = ['聽一次英文和中文', '看圖大聲唸英文！', '聽聽完整的例句', '再唸一次，你一定行！'];
let lesson = null, lessonToken = 0;

function startLesson(theme, group) {
  if (!group.refs.length) return;
  // 交錯洗牌：每個字的 4 階段順序不變
  const remaining = group.refs.map(r => ({ ref: r, next: 0 }));
  const tasks = [];
  while (remaining.length) {
    const k = Math.floor(Math.random() * remaining.length);
    tasks.push({ ref: remaining[k].ref, stage: remaining[k].next });
    if (++remaining[k].next >= 4) remaining.splice(k, 1);
  }
  lesson = { tasks, idx: 0, key: theme.id + '_g' + group.no, refs: group.refs };
  showScreen('lesson');
  renderTask();
}
function lessonNext() {
  if (!lesson) return;
  lesson.idx++;
  if (lesson.idx >= lesson.tasks.length) finishLesson();
  else renderTask();
}
function renderTask() {
  const token = ++lessonToken;
  stopSpeech();
  const { ref, stage } = lesson.tasks[lesson.idx];
  const w = ref.w;
  $('lessonBar').style.setProperty('--p', (lesson.idx / lesson.tasks.length * 100) + '%');
  $('lessonStep').textContent = (lesson.idx + 1) + ' / ' + lesson.tasks.length;
  $('lessonStage').textContent = STAGE_NAMES[stage] + '：' + STAGE_TIPS[stage];
  $('lessonCard').innerHTML = `
    ${visualHTML(ref.t, ref.i)}
    <div class="l-en">${w.en}</div>
    <div class="l-zh">${w.zh}</div>
    ${stage === 2 && w.sen ? `<div class="l-sen">${w.sen}<br>${w.szh || ''}</div>` : ''}`;
  const ctl = $('lessonControls');
  ctl.innerHTML = '';
  const addBtn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'small-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.onclick = fn;
    ctl.appendChild(b);
    return b;
  };
  // 播完不自動跳題：由小朋友自己按「下一步」，才有時間看圖與跟讀
  const playPrompt = () => {
    stopSpeech(); chainId++;
    if (stage === 0) {
      playWordAudio(ref.t, ref.i, () => {
        if (token === lessonToken) playZhWord(ref, null);
      });
    } else if (stage === 2 && w.sen) {
      playSentenceAudio(ref.t, ref.i, null);
    } else {
      playWordAudio(ref.t, ref.i, null);
    }
  };
  if (stage === 0 || stage === 2) {
    addBtn('🔊 再聽一次', '', playPrompt);
    addBtn('下一步 ▶', 'pink', () => lessonNext());
  } else {
    if (SR) {
      const mic = addBtn('🎤 開始唸', 'pink', () => {
        recognizeOnce(w.en, mic, ok => {
          if (token !== lessonToken) return;
          if (ok) lessonSpeakOk(token);
          else { AudioEngine.playSfx('wrong'); playTryAgain(); }
        });
      });
    }
    addBtn('✋ 唸對了', '', () => lessonSpeakOk(token));   // iPad / 家長判定
    addBtn('🔊 聽一次', '', () => { stopSpeech(); chainId++; playWordAudio(ref.t, ref.i, null); });
  }
  setTimeout(playPrompt, 350);
}
function playZhWord(ref, cb) {
  const src = ref.w._custom ? null : `assets/voice/${ref.t.id}_${ref.i}_z.mp3`;
  const tts = () => speakZh(ref.w.zh, cb);
  if (src) playFile(src, cb, tts); else tts();
}
function lessonSpeakOk(token) {
  if (token !== lessonToken) return;
  AudioEngine.playSfx('ding');
  playPraise(null);
  celebrate();
  setTimeout(() => { if (token === lessonToken) lessonNext(); }, 1100);
}
function finishLesson() {
  const refs = lesson.refs, key = lesson.key;
  lesson = null;
  refs.forEach(r => Mem.rec(r.t, r.i, true));
  lessonsDone[key] = (lessonsDone[key] || 0) + 1;
  localStorage.setItem('abc-lessons', JSON.stringify(lessonsDone));
  const leveled = gainExp(5);
  AudioEngine.playSfx('fanfare');
  celebrate(true);
  $('clearMsg').textContent = '完成學習！寵物獲得 5 點經驗' + (leveled ? '，還升級了！' : '！');
  $('clearNextBtn').textContent = '回家看寵物 ▶';
  $('clearNextBtn').onclick = () => { $('levelClear').classList.remove('show'); goHome(); };
  $('levelClear').classList.add('show');
  playPetLine(11);
}
// 簡易一次性語音辨識（課程與冒險共用）
let onceRec = null;
function recognizeOnce(target, btn, cb) {
  if (!SR) { cb(false); return; }
  if (onceRec) { try { onceRec.abort(); } catch (e) {} onceRec = null; }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  onceRec = rec;
  if (btn) { btn.classList.add('recording'); btn.textContent = '👂 我在聽…'; }
  const done = (ok) => {
    if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤 開始唸'; }
    onceRec = null;
    cb(ok);
  };
  rec.onresult = e => {
    const alts = [...e.results[0]].map(r => r.transcript.toLowerCase().trim());
    done(alts.some(a => a.includes(target.toLowerCase())));
  };
  rec.onerror = () => done(false);
  rec.start();
}

/* ================= 冒險：三種題型（覆寫 app.js 戰鬥） ================= */
function startBattleGame() {
  showScreen('battle');
  battle.hp = battle.max = MONSTER_HP;
  battle.lock = false;
  battle.energy = 0;
  battleAsked.clear();
  updateUltGauge();
  const pd = petData(PetState.active);
  const src = petImgSrc(PetState.active, pd.stage, moodSuffix());
  $('heroImg').src = src || 'assets/img/pet_dino_0.svg';
  // 夥伴英雄：勇者鬥惡龍式站一排（寵物打頭陣）
  const row = $('partyRow');
  [...row.querySelectorAll('img:not(#heroImg)')].forEach(x => x.remove());
  PetState.comp.slice(0, 3).forEach(h => {
    if (!Heroes.owns(h)) return;
    const im = document.createElement('img');
    im.src = `assets/img/hero_full_${h}.svg`;
    row.appendChild(im);
  });
  $('monsterFace').textContent = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  AudioEngine.playSfx('growl');
  Fx.mount($('battleStage'));   // 特效畫布掛在戰鬥舞台上
  Fx.clear();
  updateHp();
  nextBattleRound();
}
function nextBattleRound() {
  battle.lock = false;
  battle.explainZh = null;
  ['battleAsk', 'battleBig', 'battleChoices', 'battleControls'].forEach(id => { $(id).innerHTML = ''; });
  const quiz = pickQuizPool(poolFor(currentTheme), battleAsked);
  battle.answer = quiz.answer;
  battleAsked.add(Mem.key(battle.answer.t, battle.answer.i));
  const r = Math.random();
  battle.qtype = r < 0.5 ? 'pick' : r < 0.75 ? 'speak' : 'sentence';
  const w = battle.answer.w;
  if (battle.qtype === 'sentence' && !w.sen) battle.qtype = 'speak';

  if (battle.qtype === 'pick') {
    $('battleAsk').textContent = '👂 聽聲音，點出正確的圖片！';
    const grid = $('battleChoices');
    quiz.choices.forEach(ref => {
      const d = document.createElement('div');
      d.className = 'choice';
      d.innerHTML = visualHTML(ref.t, ref.i);
      d.onclick = () => {
        if (battle.lock) return;
        if (ref === battle.answer) { Mem.rec(ref.t, ref.i, true); battleHit(d); }
        else battleWrong(d);
      };
      grid.appendChild(d);
    });
    setTimeout(() => { stopSpeech(); chainId++; playWordAudio(battle.answer.t, battle.answer.i, null); }, 450);
  } else {
    const isSen = battle.qtype === 'sentence';
    $('battleAsk').textContent = isSen ? '📢 跟著唸一次英文句子，就能攻擊怪獸！'
                                       : '🗣 這是什麼？大聲說英文，攻擊怪獸！';
    $('battleBig').innerHTML = `${visualHTML(battle.answer.t, battle.answer.i)}
      ${isSen ? `<div style="font-size:1.2rem;color:#333;margin-top:6px">${w.sen}</div>` : ''}`;
    const ctl = $('battleControls');
    const addBtn = (label, cls, fn) => {
      const b = document.createElement('button');
      b.className = 'small-btn' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.onclick = fn;
      ctl.appendChild(b);
      return b;
    };
    // 例句題答對後要說明中文意思：交給 battleHit 在攻擊結束後依序播完再進下一題
    battle.explainZh = isSen && w.szh ? w.szh : null;
    if (SR) {
      const mic = addBtn('🎤 開始唸', 'pink', () => {
        recognizeOnce(w.en, mic, ok => {
          if (ok) {
            Mem.rec(battle.answer.t, battle.answer.i, true);
            battleHit(null);
          } else { AudioEngine.playSfx('wrong'); playTryAgain(); $('monsterFace').classList.add('taunt'); setTimeout(() => $('monsterFace').classList.remove('taunt'), 550); }
        });
      });
    }
    addBtn('✋ 唸對了', '', () => {
      Mem.rec(battle.answer.t, battle.answer.i, true);
      battleHit(null);
    });
    if (isSen) setTimeout(() => { stopSpeech(); chainId++; speakEn(w.sen); }, 450);
  }
}
$('battleSpeaker').onclick = () => {
  if (!battle.answer) return;
  stopSpeech(); chainId++;
  if (battle.qtype === 'sentence') speakEn(battle.answer.w.sen);
  else playWordAudio(battle.answer.t, battle.answer.i, null);
};
function battleWrong(el) {
  if (el) el.classList.add('wrong');
  Mem.rec(battle.answer.t, battle.answer.i, false);
  AudioEngine.playSfx('wrong');
  $('monsterFace').classList.add('taunt');
  setTimeout(() => { if (el) el.classList.remove('wrong'); $('monsterFace').classList.remove('taunt'); }, 550);
  playTryAgain();
}
// 組出這一回合的出手順序：寵物打頭陣，接著出戰的英雄夥伴
function battleParty() {
  const pd = petData(PetState.active);
  const list = [{ el: $('heroImg'), skill: Fx.skillOf('pet', PetState.active, pd.stage) }];
  const imgs = [...$('partyRow').querySelectorAll('img:not(#heroImg)')];
  PetState.comp.slice(0, 3).filter(h => Heroes.owns(h)).forEach((h, i) => {
    if (imgs[i]) list.push({ el: imgs[i], skill: Fx.skillOf('hero', h) });
  });
  return list;
}
function battleHit(el) {
  battle.lock = true;
  if (el) el.classList.add('correct');
  const m = $('monsterFace');
  const ult = battle.energy >= ULT_NEED;      // 集滿氣 → 這一擊是必殺技
  const damage = ult ? 2 : 1;

  const onHit = () => {
    m.classList.add('hurt');
    AudioEngine.playSfx('growl');
    setTimeout(() => m.classList.remove('hurt'), 550);
    battle.hp -= damage;
    if (ult) { battle.energy = 0; } else { battle.energy = Math.min(ULT_NEED, battle.energy + 1); }
    updateHp();
    updateUltGauge();

    const win = battle.hp <= 0;
    if (win) m.textContent = '😵';
    let moved = false;
    const proceed = () => {
      if (moved) return;                     // 只會前進一次
      moved = true;
      if (win) setTimeout(battleVictory, ult ? 900 : 600);
      else setTimeout(nextBattleRound, 500);
    };
    // 例句題：先把中文意思完整講完，再進下一題或結算（不再被 stopSpeech 切斷）
    const zh = battle.explainZh;
    battle.explainZh = null;
    if (zh) {
      playPraise(() => speakZh(zh, proceed));
      setTimeout(proceed, 9000);             // 保險：音訊沒回報結束也不會卡住
    } else {
      playPraise(null);
      setTimeout(proceed, ult ? 1300 : 900);
    }
  };

  if (ult) Fx.ultimate(battleParty(), m, onHit);
  else Fx.partyAttack(battleParty(), m, onHit);
}
function battleVictory() {
  AudioEngine.playSfx('fanfare');
  celebrate(true);
  let gain = 15;
  let msg = '打敗怪獸了！獲得 15 金幣';
  if (Math.random() < 0.3) { gain += 10; msg += '＋寶箱 10 金幣！🎁'; AudioEngine.playSfx('jingle'); }
  addStar(innerWidth / 2, innerHeight / 2, gain);
  savePet();
  $('battleWin').querySelector('.msg').textContent = msg;
  $('battleWin').classList.add('show');
  playPetLine(11);
}

/* ================= 培養 ================= */
const FOODS = [
  { icon: '🍎', name: '蘋果', cost: 5, h: 1 }, { icon: '🥛', name: '牛奶', cost: 8, h: 2 },
  { icon: '🍰', name: '蛋糕', cost: 15, h: 3 }, { icon: '🍗', name: '大餐', cost: 30, h: 5 },
];
document.querySelectorAll('#careTabs .ptab').forEach(b => { b.onclick = () => renderCare(b.dataset.c); });
function renderCare(tab) {
  document.querySelectorAll('#careTabs .ptab').forEach(x => x.classList.toggle('on', x.dataset.c === tab));
  const p = $('carePanel');
  p.innerHTML = '';
  updateCurrency();
  if (tab === 'evolve') {
    const pd = petData(PetState.active);
    const def = petDef(PetState.active);
    const lv = petLevel(pd.exp);
    const nextAt = pd.stage >= 3 ? null : [10, 20, 30][pd.stage];
    const src = petImgSrc(PetState.active, pd.stage, moodSuffix());
    p.innerHTML = `<div id="evolveBox">
      ${src ? `<img src="${src}">` : '<div style="font-size:5rem">🥚</div>'}
      <h2>${def.names[pd.stage]}　Lv.${lv}</h2>
      <div style="color:#888;margin:6px 0">經驗 ${pd.exp}｜${nextAt ? `Lv.${nextAt} 可以進化成「${def.names[pd.stage + 1]}」` : '已是最終型態！'}</div>
      ${canEvolve(pd) ? '<button class="small-btn pink" id="evolveBtn" style="font-size:1.4rem">✨ 進化！！ ✨</button>'
        : nextAt ? `<div style="color:#4ecdc4">繼續學習就能進化！（還差 ${nextAt - lv} 等）</div>` : ''}
    </div>`;
    const eb = $('evolveBtn');
    if (eb) eb.onclick = doEvolve;
  }
  if (tab === 'food') {
    fullnessTick();
    const pd = petData(PetState.active);
    const src = petImgSrc(PetState.active, pd.stage, moodSuffix());
    const stage = document.createElement('div');
    stage.id = 'feedStage';
    stage.innerHTML = `
      <div id="feedBubble"></div>
      <div id="feedPet">${src ? `<img id="feedPetImg" src="${src}" alt="pet">`
                              : '<div style="font-size:5rem">🥚</div>'}</div>
      <div id="feedGauge"></div>`;
    p.appendChild(stage);
    updateFeedGauge();
    const grid = document.createElement('div');
    grid.className = 'care-grid';
    FOODS.forEach(f => {
      const c = document.createElement('div');
      c.className = 'care-card';
      c.innerHTML = `<div class="c-icon">${f.icon}</div><div class="c-name">${f.name}</div>
                     <div class="c-price">🪙 ${f.cost}｜🍖 +${f.h}</div>`;
      c.onclick = () => {
        if (feeding) return;
        if (PetState.hearts >= FULL_MAX) {
          AudioEngine.playSfx('pop');
          feedSay('我吃不下了啦～肚子好撐！');
          return;
        }
        if (stars < f.cost) {
          AudioEngine.playSfx('wrong');
          feedSay('金幣不夠，去冒險賺金幣吧！');
          return;
        }
        stars -= f.cost;
        localStorage.setItem('abc-stars', stars);
        updateCurrency();
        feedAnim(f, c);
      };
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
  if (tab === 'deco') {
    // 上方：房間即時預覽（看得到擺設效果）
    const prev = document.createElement('div');
    prev.id = 'decoPreview';
    prev.innerHTML = '<div id="decoWorld"></div>';
    p.appendChild(prev);
    const tip = document.createElement('div');
    tip.id = 'decoTip';
    p.appendChild(tip);
    paintDecoPreview();
    // 下方：可買/可擺的物品（30 種）
    const grid = document.createElement('div');
    grid.className = 'care-grid deco-grid';
    DECO_ITEMS.forEach(item => {
      const owned = PetState.deco.owned.includes(item.id);
      const placed = PetState.deco.placed.includes(item.id);
      const c = document.createElement('div');
      c.className = 'care-card deco-card' + (placed ? ' placed' : owned ? ' owned' : '');
      c.innerHTML = `<div class="c-icon">${item.icon}</div><div class="c-name">${item.name}</div>
        <div class="c-price">${owned ? (placed ? '✓ 已擺出' : '點我擺出') : '🪙 ' + item.cost}</div>`;
      c.onclick = () => {
        if (!owned) {
          if (stars < item.cost) { AudioEngine.playSfx('wrong'); decoTip('金幣不夠，去冒險賺金幣吧！'); return; }
          stars -= item.cost;
          localStorage.setItem('abc-stars', stars);
          PetState.deco.owned.push(item.id);
          if (PetState.deco.placed.length < DECO_SLOTS.length) PetState.deco.placed.push(item.id);
          AudioEngine.playSfx('jingle');
          decoTip('買到「' + item.name + '」，擺進家裡囉！');
        } else if (placed) {
          PetState.deco.placed = PetState.deco.placed.filter(x => x !== item.id);
          AudioEngine.playSfx('pop');
          decoTip('把「' + item.name + '」收起來了');
        } else {
          if (PetState.deco.placed.length >= DECO_SLOTS.length) { decoTip('家裡放滿了，先收起一個吧！'); return; }
          PetState.deco.placed.push(item.id);
          AudioEngine.playSfx('ding');
          decoTip('「' + item.name + '」擺出來了！');
        }
        savePet();
        updateCurrency();
        renderCare('deco');
      };
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
  if (tab === 'comp') {
    // 上方固定：寵物＋三個出戰位置；下方橫向滑動選英雄替換
    const top = document.createElement('div');
    top.id = 'partyPicker';
    top.innerHTML = `
      <div class="pp-pet">
        <img src="${petImgSrc(PetState.active, petData(PetState.active).stage, moodSuffix()) || ''}" alt="pet">
        <div class="pp-label">${petDef(PetState.active).names[petData(PetState.active).stage]}</div>
      </div>
      <div class="pp-slots" id="ppSlots"></div>`;
    p.appendChild(top);
    const tip = document.createElement('div');
    tip.id = 'decoTip';
    p.appendChild(tip);
    const rowWrap = document.createElement('div');
    rowWrap.id = 'heroRowWrap';
    rowWrap.innerHTML = '<div id="heroRow"></div>';
    p.appendChild(rowWrap);
    renderPartySlots();
    renderHeroRow();
  }
}
/* ---- 餵食動畫：食物飛過去 → 寵物咀嚼 → 碎屑噴出 → 飽足度上升 ---- */
let feeding = false;
function updateFeedGauge() {
  const g = $('feedGauge');
  if (g) g.innerHTML = `🍖 <b>${PetState.hearts}</b> / ${FULL_MAX}　${MOOD_INFO[moodOf()].text}`;
}
function feedSay(text) {
  const b = $('feedBubble');
  if (!b) return;
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('show'), 2600);
}
function crumbs(box, icon) {
  const r = box.getBoundingClientRect(), pr = $('feedStage').getBoundingClientRect();
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('span');
    s.className = 'crumb';
    s.textContent = icon;
    s.style.left = (r.left - pr.left + r.width / 2 - 8) + 'px';
    s.style.top = (r.top - pr.top + r.height * 0.55) + 'px';
    s.style.setProperty('--cx', (Math.random() * 160 - 80) + 'px');
    s.style.setProperty('--cy', (Math.random() * -70 - 20) + 'px');
    s.style.setProperty('--cr', (Math.random() * 540 - 270) + 'deg');
    $('feedStage').appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}
function feedAnim(f, cardEl) {
  feeding = true;
  const petBox = $('feedPet');
  const pr = petBox.getBoundingClientRect(), cr = cardEl.getBoundingClientRect();
  // 食物從卡片飛向寵物嘴巴
  const fly = document.createElement('div');
  fly.className = 'feed-fly';
  fly.textContent = f.icon;
  fly.style.left = (cr.left + cr.width / 2 - 22) + 'px';
  fly.style.top = (cr.top + cr.height / 2 - 22) + 'px';
  document.body.appendChild(fly);
  const dx = (pr.left + pr.width / 2) - (cr.left + cr.width / 2);
  const dy = (pr.top + pr.height * 0.55) - (cr.top + cr.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(.45) rotate(25deg)`;
  });
  AudioEngine.playSfx('whoosh');
  setTimeout(() => {
    fly.remove();
    // 咀嚼＋碎屑＋音效
    petBox.classList.add('eating');
    AudioEngine.playSfx('pop');
    setTimeout(() => AudioEngine.playSfx('pop'), 230);
    setTimeout(() => AudioEngine.playSfx('ding'), 470);
    crumbs(petBox, f.icon);
    // 飽足度上升
    const before = moodOf();
    PetState.hearts = Math.min(FULL_MAX, PetState.hearts + f.h);
    PetState.lastTick = Date.now();
    savePet();
    const plus = document.createElement('div');
    plus.className = 'feed-plus';
    plus.textContent = '🍖 +' + f.h;
    $('feedStage').appendChild(plus);
    setTimeout(() => plus.remove(), 1000);
    setTimeout(() => {
      petBox.classList.remove('eating');
      updateFeedGauge();
      updateCurrency();
      // 心情改變 → 換成新表情
      const img = $('feedPetImg');
      if (img && moodOf() !== before) {
        img.src = petImgSrc(PetState.active, petData(PetState.active).stage, moodSuffix());
      }
      feedSay(PetState.hearts >= FULL_MAX ? '好飽好飽～謝謝你！' : PET_LINES[7]);
      playPetLine(7);
      feeding = false;
    }, 900);
  }, 620);
}

/* ---- 家長：寵物說話錄音（用真人聲音取代合成語音） ---- */
function renderPetLineRecorder(box) {
  const sec = document.createElement('div');
  sec.className = 'prow';
  sec.style.cssText = 'padding:14px;display:block';
  const custom = Custom.data.petLines || {};
  const done = Object.keys(custom).length;
  sec.innerHTML = `
    <b>🎙️ 寵物說話錄音</b>
    <div style="color:#888;font-size:.88rem;margin:6px 0 10px">
      讓小朋友自己錄這 12 句，寵物就會用他的聲音說話（最自然！）。
      已錄 ${done}/${PET_LINES.length} 句，沒錄的會用內建語音。
    </div>
    <div id="petLineList"></div>`;
  box.appendChild(sec);
  const list = sec.querySelector('#petLineList');
  PET_LINES.forEach((line, i) => {
    const has = !!custom[i];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 0;flex-wrap:wrap;'
                      + 'border-top:1px solid #f0f0f0';
    row.innerHTML = `
      <span style="flex:1;min-width:160px;font-size:.95rem">
        ${has ? '🎤' : '🔈'} ${line}
      </span>
      <button class="pbtn">▶ 試聽</button>
      <button class="pbtn rec" data-i="${i}">🎙️ ${has ? '重錄' : '錄音'}</button>
      ${has ? '<button class="pbtn del">↺ 用內建</button>' : ''}`;
    const [playBtn, recBtn] = row.querySelectorAll('.pbtn');
    playBtn.onclick = () => { stopSpeech(); chainId++; playPetLine(i); };
    recBtn.onclick = () => toggleRecord(recBtn, (dataUrl) => {
      (Custom.data.petLines = Custom.data.petLines || {})[i] = dataUrl;
      Custom.save();
      AudioEngine.playSfx('ding');
      renderPetEditor();
    });
    const del = row.querySelector('.pbtn.del');
    if (del) del.onclick = () => {
      delete Custom.data.petLines[i];
      Custom.save();
      AudioEngine.playSfx('pop');
      renderPetEditor();
    };
    list.appendChild(row);
  });
}

/* ---- 組隊：上方三個固定出戰位置 + 下方滑動英雄列 ---- */
let slotSel = 0;                       // 目前選中的出戰位置（點英雄會放進這格）
function heroName(i) { return heroTheme().words[i] ? heroTheme().words[i].zh : '?'; }
function renderPartySlots() {
  const box = $('ppSlots');
  if (!box) return;
  box.innerHTML = '';
  for (let s = 0; s < 3; s++) {
    const h = PetState.comp[s];
    const has = h !== undefined && Heroes.owns(h);
    const d = document.createElement('div');
    d.className = 'pp-slot' + (slotSel === s ? ' on' : '') + (has ? ' filled' : '');
    d.innerHTML = has
      ? `<img src="assets/img/hero_full_${h}.svg" alt="${heroName(h)}">
         <div class="pp-label">${heroName(h)}</div>
         <button class="pp-x" title="換下">✕</button>`
      : `<div class="pp-empty">＋</div><div class="pp-label">第 ${s + 1} 位</div>`;
    d.onclick = () => { slotSel = s; renderPartySlots(); renderHeroRow(); };
    const x = d.querySelector('.pp-x');
    if (x) x.onclick = (e) => {
      e.stopPropagation();
      PetState.comp.splice(s, 1);
      savePet();
      AudioEngine.playSfx('pop');
      slotSel = Math.min(slotSel, PetState.comp.length);
      renderPartySlots(); renderHeroRow();
    };
    box.appendChild(d);
  }
}
function renderHeroRow() {
  const row = $('heroRow');
  if (!row) return;
  row.innerHTML = '';
  heroTheme().words.forEach((w, i) => {
    const owned = Heroes.owns(i);
    const inParty = PetState.comp.indexOf(i);
    const cost = HERO_COST[i] * 3;
    const c = document.createElement('div');
    c.className = 'hero-card' + (inParty >= 0 ? ' sel' : owned ? ' owned' : ' locked');
    c.innerHTML = `
      ${inParty >= 0 ? `<span class="hc-badge">${inParty + 1}</span>` : ''}
      <img src="assets/img/hero_full_${i}.svg" alt="${w.zh}"
           onerror="this.outerHTML='<div class=hc-fallback>${w.emoji || '🦸'}</div>'">
      <div class="hc-name">${w.zh}</div>
      <div class="hc-price">${inParty >= 0 ? '出戰中' : owned ? '點我上場' : '🪙 ' + cost}</div>`;
    c.onclick = () => {
      if (!owned) {
        if (stars < cost) { AudioEngine.playSfx('wrong'); decoTip('金幣不夠，去冒險賺金幣吧！'); return; }
        stars -= cost;
        localStorage.setItem('abc-stars', stars);
        Heroes.data.owned.push(i);
        Heroes.save();
        updateCurrency();
        AudioEngine.playSfx('fanfare');
        celebrate();
        decoTip('解鎖「' + w.zh + '」！點一下讓他上場');
        renderHeroRow();
        return;
      }
      if (inParty >= 0) {                       // 已在隊上 → 收回
        PetState.comp.splice(inParty, 1);
        AudioEngine.playSfx('pop');
      } else {
        PetState.comp = PetState.comp.filter(x => Heroes.owns(x));
        if (slotSel < PetState.comp.length) PetState.comp[slotSel] = i;   // 替換該位置
        else PetState.comp.push(i);
        PetState.comp = PetState.comp.slice(0, 3);
        AudioEngine.playSfx('ding');
        decoTip(w.zh + ' 加入隊伍！');
        slotSel = Math.min(2, PetState.comp.length);
      }
      savePet();
      renderPartySlots(); renderHeroRow();
    };
    row.appendChild(c);
  });
}

/* ---- 裝飾：房間即時預覽 ---- */
function decoTip(msg) {
  const t = $('decoTip');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
function paintDecoPreview() {
  const box = $('decoWorld');
  if (!box) return;
  const pd = petData(PetState.active);
  const src = petImgSrc(PetState.active, pd.stage, moodSuffix());
  let html = '';
  FURNITURE.forEach(f => {
    html += `<span class="furn" style="left:${f.x}px;top:${f.yb - f.s}px;font-size:${f.s}px">${f.icon}</span>`;
  });
  PetState.deco.placed.slice(0, DECO_SLOTS.length).forEach((id, k) => {
    const item = DECO_ITEMS.find(x => x.id === id);
    if (!item) return;
    const s = DECO_SLOTS[k];
    html += `<span class="deco-item" style="left:${s.x}px;top:${s.yb - DECO_SIZE}px;font-size:${DECO_SIZE}px">${item.icon}</span>`;
  });
  if (src) html += `<img class="prev-pet" src="${src}" alt="pet">`;
  box.innerHTML = html;
  // 依容器寬度縮放整個 1200x640 房間
  const prev = $('decoPreview');
  const scale = prev.clientWidth / WORLD.w;
  box.style.transform = `scale(${scale})`;
  prev.style.height = (WORLD.h * scale) + 'px';
}

function doEvolve() {
  const pd = petData(PetState.active);
  if (!canEvolve(pd)) return;
  const flash = $('evolveFlash');
  AudioEngine.playSfx('magic');
  flash.classList.add('on');
  setTimeout(() => {
    pd.stage = targetStage(petLevel(pd.exp));
    savePet();
    flash.classList.remove('on');
    AudioEngine.playSfx('fanfare');
    celebrate(true);
    playPetLine(9);
    renderCare('evolve');
  }, 900);
}

/* ================= 圖鑑 ================= */
function renderDex() {
  const list = $('dexList');
  list.innerHTML = '';
  petList().forEach(p => {
    const pd = petData(p.id);
    const row = document.createElement('div');
    row.className = 'dex-row' + (p.id === PetState.active ? ' active-pet' : '');
    const stages = [0, 1, 2, 3].map(s => {
      const unlocked = s <= pd.stage;
      const src = petImgSrc(p.id, s);
      return `<div class="dex-stage ${unlocked ? '' : 'locked'}">
        ${src ? `<img src="${src}">` : '<div style="font-size:3rem">🥚</div>'}
        <div class="ds-name">${unlocked ? p.names[s] : '？？？'}</div></div>`;
    }).join('<div style="align-self:center;color:#bbb">▶</div>');
    row.innerHTML = `<div class="dex-head"><b>${p.names[pd.stage]}</b>
        <span style="color:#845ec2">Lv.${petLevel(pd.exp)}</span>
        ${p.id === PetState.active ? '<span class="badge-custom">目前夥伴</span>'
          : '<button class="pbtn" style="margin-left:auto">跟牠一起玩 ▶</button>'}</div>
      <div class="dex-stages">${stages}</div>`;
    const btn = row.querySelector('button');
    if (btn) btn.onclick = () => {
      PetState.active = p.id;
      savePet();
      AudioEngine.playSfx('yay');
      playPetLine(5);
      renderDex();
    };
    list.appendChild(row);
  });
}

/* ================= 家長：寵物編輯器 ================= */
function renderPetEditor() {
  const box = $('petEditor');
  box.innerHTML = '<div style="color:#888;margin-bottom:10px">改寵物名字、換每個階段的圖片（上傳照片或圖檔）</div>';
  petList().forEach(p => {
    const cfg = petCfg();
    const sec = document.createElement('div');
    sec.className = 'prow';
    sec.style.padding = '12px';
    let stagesHtml = '';
    for (let s = 0; s < 4; s++) {
      const src = petImgSrc(p.id, s);
      stagesHtml += `<div style="text-align:center">
        ${src ? `<img src="${src}" style="width:64px;height:64px;object-fit:contain">` : '<div style="font-size:2.4rem">🥚</div>'}
        <input type="text" data-s="${s}" value="${p.names[s]}" style="width:86px;padding:6px;border-radius:8px;border:2px solid #ddd;font-size:.85rem;text-align:center">
        <div style="display:flex;gap:4px;justify-content:center;margin-top:4px">
          <label class="pbtn" style="font-size:.8rem">📷<input type="file" data-img="${s}" accept="image/*" hidden></label>
          <button class="pbtn" data-draw="${s}" style="font-size:.8rem">🎨</button>
        </div>
      </div>`;
    }
    sec.innerHTML = `<div style="width:100%">
      <b>${p._customPet ? '（自建）' : ''}${p.names[0]} 系列</b>
      ${p._customPet ? '<button class="pbtn del" style="float:right">🗑️</button>' : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">${stagesHtml}</div>
      <button class="pbtn" style="margin-top:8px;border-color:#2ecc71">💾 儲存名字</button>
    </div>`;
    // 儲存名字
    sec.querySelector('.pbtn[style*="2ecc71"]').onclick = () => {
      const names = [...sec.querySelectorAll('input[type=text]')].map(x => x.value.trim() || '寶寶');
      if (p._customPet) {
        const cp = cfg.customs.find(x => x.id === p.id);
        cp.names = names;
      } else {
        (cfg.over[p.id] = cfg.over[p.id] || {}).names = names;
      }
      Custom.save();
      AudioEngine.playSfx('ding');
      renderPetEditor();
    };
    // 換圖
    sec.querySelectorAll('input[type=file]').forEach(inp => {
      inp.onchange = async (e) => {
        if (!e.target.files[0]) return;
        const data = await fileToThumb(e.target.files[0]);
        const s = Number(inp.dataset.img);
        if (p._customPet) {
          const cp = cfg.customs.find(x => x.id === p.id);
          (cp.imgs = cp.imgs || [])[s] = data;
        } else {
          const ov = cfg.over[p.id] = cfg.over[p.id] || {};
          (ov.imgs = ov.imgs || [])[s] = data;
        }
        Custom.save();
        renderPetEditor();
      };
    });
    // 用繪圖板畫造型
    sec.querySelectorAll('[data-draw]').forEach(btn => {
      btn.onclick = () => Paint.open(data => {
        const s = Number(btn.dataset.draw);
        if (p._customPet) {
          const cp = cfg.customs.find(x => x.id === p.id);
          (cp.imgs = cp.imgs || [])[s] = data;
        } else {
          const ov = cfg.over[p.id] = cfg.over[p.id] || {};
          (ov.imgs = ov.imgs || [])[s] = data;
        }
        Custom.save();
        renderPetEditor();
      });
    });
    // 刪自建寵物
    const del = sec.querySelector('.pbtn.del');
    if (del) del.onclick = () => {
      if (!confirm('刪除這隻自建寵物？')) return;
      cfg.customs = cfg.customs.filter(x => x.id !== p.id);
      if (PetState.active === p.id) { PetState.active = 'dino'; savePet(); }
      Custom.save();
      renderPetEditor();
    };
    box.appendChild(sec);
  });
  renderPetLineRecorder(box);
  const add = document.createElement('button');
  add.className = 'small-btn';
  add.textContent = '➕ 新增自建寵物';
  add.onclick = () => {
    const name = prompt('寵物系列名稱（例如：貓貓）');
    if (!name) return;
    petCfg().customs.push({ id: 'p' + Date.now(),
      names: [name + '蛋', '小' + name + '獸', '大' + name + '獸', '超' + name + '獸'], imgs: [] });
    Custom.save();
    renderPetEditor();
  };
  box.appendChild(add);
}

/* ================= 家長：學習分組編輯 ================= */
$('groupEditBtn').onclick = () => {
  const box = $('groupEditor');
  if (box.style.display !== 'none') { box.style.display = 'none'; return; }
  renderGroupEditor();
  box.style.display = '';
};
function renderGroupEditor() {
  const box = $('groupEditor');
  const words = allWords(parentTheme);
  const nGroups = Math.max(1, Math.ceil(words.length / 5)) + 1;   // 多給一組可分配
  let html = `<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:12px">
    <b>🧩「${parentTheme.name}」學習分組</b>
    <div style="color:#888;font-size:.85rem;margin:4px 0 8px">每組建議 5 個字；改下拉選單就能把字移到別組</div>`;
  words.forEach((w, i) => {
    const cur = groupNoOf(parentTheme, i);
    const opts = Array.from({ length: nGroups }, (_, g) =>
      `<option value="${g}" ${g === cur ? 'selected' : ''}>${parentTheme.name} ${g + 1}</option>`).join('');
    html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <span style="flex:1">${w.en}（${w.zh}）</span>
      <select data-i="${i}" style="padding:6px;border-radius:8px;border:2px solid #ddd">${opts}</select></div>`;
  });
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll('select').forEach(sel => {
    sel.onchange = () => {
      const g = Custom.data.groups = Custom.data.groups || {};
      const m = g[parentTheme.id] = g[parentTheme.id] || {};
      m[sel.dataset.i] = Number(sel.value);
      Custom.save();
    };
  });
}

/* ================= 家長：進度控制 ================= */
function renderProgressCtrl() {
  const box = $('progressBox');
  if (!box) return;
  const petOpts = petList().map(p =>
    `<option value="${p.id}">${p.names[0]} 系列（Lv.${petLevel(petData(p.id).exp)}）</option>`).join('');
  box.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:14px;margin-bottom:14px;border:3px dashed #e09600">
      <b>🎮 進度控制</b>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
        🪙 金幣 <input type="number" id="pcCoins" value="${stars}" min="0" style="width:90px;padding:8px;border-radius:8px;border:2px solid #ddd">
        🍖 飽足度 <input type="number" id="pcHearts" value="${PetState.hearts}" min="0" max="10" style="width:90px;padding:8px;border-radius:8px;border:2px solid #ddd">
        <button class="pbtn" id="pcMoneySave">套用</button>
      </div>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center">
        🐾 <select id="pcPet" style="padding:8px;border-radius:8px;border:2px solid #ddd">${petOpts}</select>
        等級 <input type="number" id="pcLevel" min="1" max="40" style="width:70px;padding:8px;border-radius:8px;border:2px solid #ddd">
        型態 <select id="pcStage" style="padding:8px;border-radius:8px;border:2px solid #ddd">
          <option value="0">第1型</option><option value="1">第2型</option>
          <option value="2">第3型</option><option value="3">第4型</option></select>
        <button class="pbtn" id="pcPetSave">套用</button>
      </div>
      <div style="margin-top:10px;color:#666;font-size:.9rem">🛋️ 裝飾擁有狀況（點擊切換）</div>
      <div id="pcDeco" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div>
      <div style="margin-top:10px;color:#666;font-size:.9rem">🦸 英雄擁有狀況（點擊切換）</div>
      <div id="pcHeroes" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="pbtn del" id="pcClearLearn">🧹 清除學習紀錄</button>
        <button class="pbtn del" id="pcResetGame">♻️ 重置遊戲進度</button>
        <button class="pbtn del" id="pcResetAll" style="font-weight:bold">⚠️ 恢復出廠（含自訂教材）</button>
      </div>
      <div style="color:#999;font-size:.8rem;margin-top:6px">重置後會自動同步到雲端；若只想還原單一裝置，請先停用雲端同步。</div>
    </div>`;
  // 帶入目前選中寵物的等級/型態
  const syncPetInputs = () => {
    const pd = petData($('pcPet').value);
    $('pcLevel').value = petLevel(pd.exp);
    $('pcStage').value = pd.stage;
  };
  syncPetInputs();
  $('pcPet').onchange = syncPetInputs;
  $('pcMoneySave').onclick = () => {
    stars = Math.max(0, Number($('pcCoins').value) || 0);
    localStorage.setItem('abc-stars', stars);
    PetState.hearts = Math.min(FULL_MAX, Math.max(0, Number($('pcHearts').value) || 0));
    PetState.lastTick = Date.now();
    savePet();
    updateCurrency();
    AudioEngine.playSfx('ding');
  };
  $('pcPetSave').onclick = () => {
    const pd = petData($('pcPet').value);
    const lv = Math.min(40, Math.max(1, Number($('pcLevel').value) || 1));
    pd.exp = (lv - 1) * 10;
    pd.stage = Number($('pcStage').value);
    savePet();
    AudioEngine.playSfx('ding');
    renderProgressCtrl();
  };
  // 裝飾切換
  const decoBox = $('pcDeco');
  DECO_ITEMS.forEach(item => {
    const b = document.createElement('button');
    const owned = PetState.deco.owned.includes(item.id);
    b.className = 'ptheme-chip' + (owned ? ' on' : '');
    b.textContent = item.icon + ' ' + item.name;
    b.onclick = () => {
      if (owned) {
        PetState.deco.owned = PetState.deco.owned.filter(x => x !== item.id);
        PetState.deco.placed = PetState.deco.placed.filter(x => x !== item.id);
      } else {
        PetState.deco.owned.push(item.id);
      }
      savePet();
      renderProgressCtrl();
    };
    decoBox.appendChild(b);
  });
  // 英雄切換
  const heroBox = $('pcHeroes');
  heroTheme().words.forEach((w, i) => {
    const b = document.createElement('button');
    const owned = Heroes.owns(i);
    b.className = 'ptheme-chip' + (owned ? ' on' : '');
    b.textContent = w.zh;
    b.onclick = () => {
      if (owned) {
        Heroes.data.owned = Heroes.data.owned.filter(x => x !== i);
        PetState.comp = PetState.comp.filter(x => x !== i);
        savePet();
      } else {
        Heroes.data.owned.push(i);
      }
      Heroes.save();
      renderProgressCtrl();
    };
    heroBox.appendChild(b);
  });
  $('pcClearLearn').onclick = () => {
    if (!confirm('清除所有學習紀錄（單字熟練度、連續天數、課程完成次數）？')) return;
    localStorage.removeItem('abc-mem');
    localStorage.removeItem('abc-days');
    localStorage.removeItem('abc-lessons');
    Mem.data = {};
    Object.keys(lessonsDone).forEach(k => delete lessonsDone[k]);
    Cloud.schedule();
    alert('已清除');
  };
  const resetGame = (includeCustom) => {
    ['abc-pet', 'abc-stars', 'abc-mem', 'abc-days', 'abc-lessons', 'abc-heroes']
      .forEach(k => localStorage.removeItem(k));
    if (includeCustom) localStorage.removeItem('abc-custom');
    // 重置後立刻覆蓋雲端（否則開頁又會拉回舊進度）
    if (Cloud.enabled() && Cloud.getCode()) {
      Custom.data = includeCustom ? { words: {}, over: {} } : Custom.data;
      Mem.data = {};
      Heroes.data = { owned: [0, 1, 13], active: 1 };
      Object.assign(PetState, { active: 'dino', pets: {}, hearts: 6, lastTick: Date.now(),
        deco: { owned: [], placed: [] }, comp: [1] });
      stars = 0;
      Cloud.push().then(() => location.reload());
    } else {
      location.reload();
    }
  };
  $('pcResetGame').onclick = () => {
    if (confirm('重置全部遊戲進度（寵物/金幣/英雄/學習紀錄）？自訂教材會保留。') &&
        confirm('真的確定嗎？此動作無法復原！')) resetGame(false);
  };
  $('pcResetAll').onclick = () => {
    if (confirm('恢復出廠：連自訂單字、圖片、錄音、寵物設定也會全部刪除！確定？') &&
        confirm('真的確定嗎？此動作無法復原！')) resetGame(true);
  };
}

/* ================= 簡易繪圖板（家長模式：畫單字圖/寵物造型） ================= */
const Paint = (() => {
  const modal = $('paintModal'), cv = $('paintCanvas'), ctx = cv.getContext('2d');
  const COLORS = ['#1a1a1a', '#c8102e', '#ff9f1c', '#ffd60a', '#2a9d3f', '#1446a0',
                  '#845ec2', '#ff6b9d', '#8b5e3c', '#ffffff'];
  let color = COLORS[0], size = 14, erasing = false, cb = null, drawing = false;
  const undoStack = [];
  // 色盤
  const colorBox = $('paintColors');
  COLORS.forEach(c => {
    const b = document.createElement('span');
    b.className = 'paint-color' + (c === color ? ' on' : '');
    b.style.background = c;
    b.onclick = () => {
      color = c; erasing = false;
      $('paintEraser').classList.remove('on');
      colorBox.querySelectorAll('.paint-color').forEach(x => x.classList.toggle('on', x === b));
    };
    colorBox.appendChild(b);
  });
  document.querySelectorAll('#paintTools [data-size]').forEach(b => {
    b.onclick = () => {
      size = Number(b.dataset.size);
      document.querySelectorAll('#paintTools [data-size]').forEach(x => x.classList.toggle('on', x === b));
    };
  });
  $('paintEraser').onclick = () => { erasing = !erasing; $('paintEraser').classList.toggle('on', erasing); };
  $('paintUndo').onclick = () => {
    if (undoStack.length) ctx.putImageData(undoStack.pop(), 0, 0);
  };
  $('paintClear').onclick = () => { snap(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
  function snap() {
    undoStack.push(ctx.getImageData(0, 0, cv.width, cv.height));
    if (undoStack.length > 20) undoStack.shift();
  }
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height };
  }
  cv.addEventListener('pointerdown', e => {
    drawing = true; snap();
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y);
    stroke();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    stroke();
  });
  cv.addEventListener('pointerup', () => { drawing = false; });
  function stroke() {
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.stroke();
  }
  $('paintCancel').onclick = () => { modal.classList.remove('show'); cb = null; };
  $('paintSave').onclick = () => {
    modal.classList.remove('show');
    const fn = cb; cb = null;
    if (fn) fn(cv.toDataURL('image/jpeg', 0.85));
  };
  return {
    open(fn) {
      cb = fn;
      undoStack.length = 0;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      modal.classList.add('show');
    },
  };
})();

/* ================= 啟動 ================= */
fullnessTick();
renderHome();
// 開著網頁時每分鐘檢查一次飽足度衰減
setInterval(() => {
  fullnessTick();
  if (currentScreen === 'home') renderHome();
  updateCurrency();
}, 60000);

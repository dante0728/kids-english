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
  if (!d) d = { active: 'dino', pets: {}, hearts: 0, deco: { owned: [], placed: [] }, comp: [1] };
  return d;
})();
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
function petImgSrc(id, stage) {
  const def = petDef(id);
  if (def.imgs && def.imgs[stage]) return def.imgs[stage];
  if (def._default) return `assets/img/pet_${id}_${stage}.svg`;
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
  $('heartCount').textContent = PetState.hearts;
}
function playPetLine(i) {
  playFile('assets/voice/pet_line_' + i + '.mp3', null, () => speakZh(PET_LINES[i]));
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
// 內建家具（世界座標）
const FURNITURE = [
  { icon: '🚪', x: 18, y: 130, s: 110 }, { icon: '🛏️', x: 70, y: 330, s: 120 },
  { icon: '🪟', x: 330, y: 80, s: 96 }, { icon: '🕰️', x: 560, y: 60, s: 64 },
  { icon: '🖼️', x: 710, y: 95, s: 74 }, { icon: '🛋️', x: 920, y: 330, s: 112 },
  { icon: '📚', x: 1075, y: 200, s: 100 }, { icon: '🪑', x: 250, y: 400, s: 76 },
  { icon: '🧺', x: 1115, y: 500, s: 60 },
];
// 買來的裝飾品的擺放位置（世界座標）
const DECO_SLOTS = [
  { x: 200, y: 500 }, { x: 400, y: 530 }, { x: 660, y: 520 },
  { x: 830, y: 490 }, { x: 1000, y: 545 }, { x: 480, y: 130 },
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
    px = room.clientWidth / 2 - 580; py = room.clientHeight - WORLD.h;
    apply();
  };
})();
const DECO_ITEMS = [
  { id: 'plant', icon: '🪴', name: '小盆栽', cost: 20 }, { id: 'bear', icon: '🧸', name: '熊熊', cost: 25 },
  { id: 'ball', icon: '⚽', name: '足球', cost: 15 }, { id: 'art', icon: '🖼️', name: '掛畫', cost: 30 },
  { id: 'train', icon: '🚂', name: '小火車', cost: 35 }, { id: 'balloon', icon: '🎈', name: '氣球', cost: 10 },
  { id: 'piano', icon: '🎹', name: '小鋼琴', cost: 50 }, { id: 'mirror', icon: '🪞', name: '鏡子', cost: 30 },
];
function renderHome() {
  const pd = petData(PetState.active);
  const def = petDef(PetState.active);
  const src = petImgSrc(PetState.active, pd.stage);
  const img = $('petImg');
  if (src) { img.src = src; img.style.display = ''; }
  else { img.style.display = 'none'; }
  $('petName').textContent = def.names[pd.stage];
  $('petLevel').textContent = 'Lv.' + petLevel(pd.exp);
  $('expBar').style.width = (pd.exp % 10) * 10 + '%';
  // 內建家具
  const fb = $('roomFurniture');
  if (!fb.childElementCount) {
    FURNITURE.forEach(f => {
      const s = document.createElement('span');
      s.className = 'furn';
      s.textContent = f.icon;
      s.style.cssText = `left:${f.x}px;top:${f.y}px;font-size:${f.s}px`;
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
    s.style.left = DECO_SLOTS[k].x + 'px';
    s.style.top = DECO_SLOTS[k].y + 'px';
    box.appendChild(s);
  });
  if (window.centerOnPet) centerOnPet();
  updateCurrency();
}
// 點寵物：隨機互動語音
const TAP_LINES = [0, 1, 2, 3, 4, 5, 6, 10];
$('petSprite').onclick = () => {
  if (roomMoved) return;   // 拖曳結束的誤觸不算點寵物
  const i = TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)];
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
    if (go === 'adventure') { showScreen('menu'); renderThemeMenu(); }
    if (go === 'care') { showScreen('care'); renderCare('evolve'); }
    if (go === 'dex') { showScreen('dex'); renderDex(); }
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
  const playPrompt = () => {
    stopSpeech(); chainId++;
    if (stage === 0) {
      playWordAudio(ref.t, ref.i, () => {
        if (token !== lessonToken) return;
        playZhWord(ref, () => { if (token === lessonToken) autoNext(token); });
      });
    } else if (stage === 2) {
      if (w.sen) playSentenceAudio(ref.t, ref.i, () => { if (token === lessonToken) autoNext(token); });
      else playWordAudio(ref.t, ref.i, () => { if (token === lessonToken) autoNext(token); });
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
function autoNext(token) {
  setTimeout(() => { if (token === lessonToken && lesson) lessonNext(); }, 900);
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
  battle.hp = battle.max = 5;
  battle.lock = false;
  battleAsked.clear();
  const pd = petData(PetState.active);
  const src = petImgSrc(PetState.active, pd.stage);
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
  updateHp();
  nextBattleRound();
}
function nextBattleRound() {
  battle.lock = false;
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
    if (SR) {
      const mic = addBtn('🎤 開始唸', 'pink', () => {
        recognizeOnce(w.en, mic, ok => {
          if (ok) {
            Mem.rec(battle.answer.t, battle.answer.i, true);
            battleHit(null);
            if (isSen && w.szh) setTimeout(() => speakZh(w.szh), 1600);   // 說明中文
          } else { AudioEngine.playSfx('wrong'); playTryAgain(); $('monsterFace').classList.add('taunt'); setTimeout(() => $('monsterFace').classList.remove('taunt'), 550); }
        });
      });
    }
    addBtn('✋ 唸對了', '', () => {
      Mem.rec(battle.answer.t, battle.answer.i, true);
      battleHit(null);
      if (isSen && w.szh) setTimeout(() => speakZh(w.szh), 1600);
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
function battleHit(el) {
  battle.lock = true;
  if (el) el.classList.add('correct');
  const pet = $('heroImg');
  pet.classList.add('charge');
  AudioEngine.playSfx('power');
  setTimeout(() => {
    const bolt = document.createElement('span');
    bolt.className = 'bolt fly';
    bolt.textContent = '⚡';
    bolt.style.left = Math.min($('partyRow').offsetWidth + 6, 420) + 'px';
    $('battleFx').appendChild(bolt);
    AudioEngine.playSfx('zap');
    setTimeout(() => {
      bolt.remove();
      pet.classList.remove('charge');
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
        setTimeout(nextBattleRound, 1500);
      }
    }, 430);
  }, 500);
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
    const src = petImgSrc(PetState.active, pd.stage);
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
    const grid = document.createElement('div');
    grid.className = 'care-grid';
    FOODS.forEach(f => {
      const c = document.createElement('div');
      c.className = 'care-card';
      c.innerHTML = `<div class="c-icon">${f.icon}</div><div class="c-name">${f.name}</div>
                     <div class="c-price">🪙 ${f.cost}｜❤️ +${f.h}</div>`;
      c.onclick = () => {
        if (stars < f.cost) { AudioEngine.playSfx('wrong'); alert('金幣不夠，去冒險賺金幣吧！'); return; }
        stars -= f.cost;
        localStorage.setItem('abc-stars', stars);
        PetState.hearts += f.h;
        savePet();
        AudioEngine.playSfx('pop');
        playPetLine(7);
        updateCurrency();
      };
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
  if (tab === 'deco') {
    const grid = document.createElement('div');
    grid.className = 'care-grid';
    DECO_ITEMS.forEach(item => {
      const owned = PetState.deco.owned.includes(item.id);
      const placed = PetState.deco.placed.includes(item.id);
      const c = document.createElement('div');
      c.className = 'care-card' + (placed ? ' placed' : owned ? ' owned' : '');
      c.innerHTML = `<div class="c-icon">${item.icon}</div><div class="c-name">${item.name}</div>
        <div class="c-price">${owned ? (placed ? '已擺出來 ✓' : '點我擺出來') : '🪙 ' + item.cost}</div>`;
      c.onclick = () => {
        if (!owned) {
          if (stars < item.cost) { AudioEngine.playSfx('wrong'); alert('金幣不夠，去冒險賺金幣吧！'); return; }
          stars -= item.cost;
          localStorage.setItem('abc-stars', stars);
          PetState.deco.owned.push(item.id);
          if (PetState.deco.placed.length < DECO_SLOTS.length) PetState.deco.placed.push(item.id);
          AudioEngine.playSfx('jingle');
        } else if (placed) {
          PetState.deco.placed = PetState.deco.placed.filter(x => x !== item.id);
          AudioEngine.playSfx('pop');
        } else {
          if (PetState.deco.placed.length >= DECO_SLOTS.length) { alert('家裡放滿了，先收起一個吧！'); return; }
          PetState.deco.placed.push(item.id);
          AudioEngine.playSfx('ding');
        }
        savePet();
        renderCare('deco');
      };
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
  if (tab === 'comp') {
    const note = document.createElement('div');
    note.style.cssText = 'text-align:center;color:#888;margin-bottom:10px';
    note.textContent = `選最多 3 位英雄夥伴一起冒險（目前 ${PetState.comp.length}/3）`;
    p.appendChild(note);
    const grid = document.createElement('div');
    grid.className = 'care-grid';
    heroTheme().words.forEach((w, i) => {
      const owned = Heroes.owns(i);
      const sel = PetState.comp.includes(i);
      const cost = HERO_COST[i] * 3;
      const c = document.createElement('div');
      c.className = 'care-card' + (sel ? ' sel' : owned ? ' owned' : '');
      c.innerHTML = `<img src="assets/img/hero_full_${i}.svg" style="width:80px;height:100px;object-fit:contain">
        <div class="c-name">${w.zh}</div>
        <div class="c-price">${sel ? '出戰中 ⚔️' : owned ? '點我出戰' : cost === 0 ? '免費' : '🪙 ' + cost}</div>`;
      c.onclick = () => {
        if (!owned) {
          if (stars < cost) { AudioEngine.playSfx('wrong'); alert('金幣不夠，去冒險賺金幣吧！'); return; }
          stars -= cost;
          localStorage.setItem('abc-stars', stars);
          Heroes.data.owned.push(i);
          Heroes.save();
          AudioEngine.playSfx('fanfare');
          celebrate();
        } else if (sel) {
          PetState.comp = PetState.comp.filter(x => x !== i);
          AudioEngine.playSfx('pop');
        } else {
          if (PetState.comp.length >= 3) { alert('最多 3 位夥伴，先換下一位吧！'); return; }
          PetState.comp.push(i);
          AudioEngine.playSfx('ding');
        }
        savePet();
        renderCare('comp');
      };
      grid.appendChild(c);
    });
    p.appendChild(grid);
  }
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
renderHome();

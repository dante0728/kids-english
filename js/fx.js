/* =====================================================
   戰鬥特效引擎（Canvas 2D 粒子系統）
   - 每位英雄與寵物都有專屬技能：蓄力 → 發射 → 命中爆開
   - Fx.partyAttack(list, onEachHit, onDone) 隊伍依序出招
   對外：Fx.mount(container) / Fx.skillOf(kind, id, stage) / Fx.partyAttack(...)
   ===================================================== */
const Fx = (() => {
  let cv = null, ctx = null, host = null, W = 0, H = 0, dpr = 1;
  let parts = [], beams = [], running = false, shake = 0;

  function mount(container) {
    host = container;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'fxCanvas';
      ctx = cv.getContext('2d');
    }
    if (cv.parentElement !== container) container.appendChild(cv);
    resize();
    addEventListener('resize', resize);
  }
  const BLEED = 70;   // 畫布向外多留一圈，粒子飛出舞台才不會被裁掉
  function resize() {
    if (!host || !cv) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    W = host.clientWidth; H = host.clientHeight;
    cv.width = (W + BLEED * 2) * dpr; cv.height = (H + BLEED * 2) * dpr;
    cv.style.width = (W + BLEED * 2) + 'px'; cv.style.height = (H + BLEED * 2) + 'px';
    cv.style.left = -BLEED + 'px'; cv.style.top = -BLEED + 'px';
    setT();
  }
  // 座標系維持「host 內部座標」，畫布多出來的邊界由 translate 吸收
  function setT() { ctx.setTransform(dpr, 0, 0, dpr, BLEED * dpr, BLEED * dpr); }
  // 元素在特效畫布上的中心點
  function centerOf(el) {
    if (!el || !host) return { x: W * 0.3, y: H * 0.5 };
    const a = el.getBoundingClientRect(), b = host.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function add(p) {
    parts.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, size: 6, color: '#fff', shape: 'dot',
      life: 1, decay: 0.02, grav: 0, rot: 0, spin: 0, drag: 1,
    }, p));
  }

  /* ---------- 形狀繪製 ---------- */
  function drawShape(p) {
    const s = p.size * (p.shrink === false ? 1 : Math.max(0.25, p.life));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.lineCap = 'round';
    switch (p.shape) {
      case 'star': {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = -Math.PI / 2 + i * Math.PI * 2 / 5;
          const a2 = a1 + Math.PI / 5;
          ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
          ctx.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
        }
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'spark': {   // 四角星光
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
        ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
        ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
        ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
        ctx.fill();
        break;
      }
      case 'ring':
        ctx.lineWidth = Math.max(1.5, s * 0.24);
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.stroke();
        break;
      case 'line':
        ctx.lineWidth = Math.max(2, s * 0.5);
        ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
        break;
      case 'tri':
        ctx.beginPath();
        ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.7, -s * 0.7);
        ctx.closePath(); ctx.fill();
        break;
      case 'leaf':
        ctx.beginPath();
        ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.8, s, 0);
        ctx.quadraticCurveTo(0, s * 0.8, -s, 0);
        ctx.fill();
        break;
      case 'bubble':
        ctx.lineWidth = Math.max(1.5, s * 0.2);
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.stroke();
        ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, 7); ctx.fill();
        break;
      case 'bat':
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.3);
        ctx.quadraticCurveTo(s * 0.5, -s * 0.9, s, -s * 0.2);
        ctx.lineTo(s * 0.6, s * 0.1); ctx.lineTo(s * 0.3, s * 0.5);
        ctx.lineTo(0, s * 0.2); ctx.lineTo(-s * 0.3, s * 0.5);
        ctx.lineTo(-s * 0.6, s * 0.1); ctx.lineTo(-s, -s * 0.2);
        ctx.quadraticCurveTo(-s * 0.5, -s * 0.9, 0, -s * 0.3);
        ctx.fill();
        break;
      case 'shield':
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.66, 0, 7); ctx.fill();
        ctx.fillStyle = p.color2 || '#1446a0';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, 7); ctx.fill();
        break;
      default:
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 主迴圈 ---------- */
  function loop() {
    if (!ctx) return;
    setT();
    if (shake > 0) {
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
      shake *= 0.86;
      if (shake < 0.4) shake = 0;
    }
    ctx.clearRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2);
    // 光束
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life -= b.decay;
      if (b.life <= 0) { beams.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.strokeStyle = b.color;
      ctx.lineCap = 'round';
      const grow = Math.min(1, (1 - b.life) * 3);
      const ex = b.x1 + (b.x2 - b.x1) * (b.instant ? 1 : grow);
      const ey = b.y1 + (b.y2 - b.y1) * (b.instant ? 1 : grow);
      if (b.zig) {
        ctx.lineWidth = b.w;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
        const seg = 6;
        for (let k = 1; k <= seg; k++) {
          const t = k / seg;
          const nx = b.x1 + (ex - b.x1) * t, ny = b.y1 + (ey - b.y1) * t;
          ctx.lineTo(nx, ny + (k < seg ? rand(-16, 16) : 0));
        }
        ctx.stroke();
      } else {
        ctx.lineWidth = b.w * 2.2; ctx.globalAlpha *= 0.35;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.lineWidth = b.w;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.restore();
    }
    // 粒子
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.hold > 0) { p.hold--; continue; }   // 尚未登場
      if (p.par) {
        // 參數式飛行體：沿 起點→終點 前進（arc 為拋物線高度）
        p.t += p.dt;
        p.x = p.sx + (p.ex - p.sx) * p.t;
        p.y = p.sy + (p.ey - p.sy) * p.t + p.arc * Math.sin(Math.PI * p.t);
        p.rot += p.spin;
        if (p.trail) {
          const tr = p.trail;
          add({ x: p.x + rand(-3, 3), y: p.y + rand(-3, 3), vx: rand(-.5, .5), vy: rand(-.7, .3),
                size: tr.size * rand(.6, 1.1), color: pick(tr.colors), shape: tr.shape,
                decay: tr.decay, rot: rand(0, 7), spin: rand(-.2, .2), drag: .95 });
        }
        if (p.t >= 1) { parts.splice(i, 1); continue; }
        drawShape(p);
        continue;
      }
      p.vx *= p.drag; p.vy *= p.drag;
      p.vy += p.grav;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.spin;
      p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      drawShape(p);
    }
    if (parts.length || beams.length || shake) requestAnimationFrame(loop);
    else { running = false; setT(); ctx.clearRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2); }
  }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

  /* =========================================================
     技能定義
     proj: 飛行體外觀 / path: 'straight' | 'arc' | 'beam' | 'zig'
     burst: 命中爆開樣式
     ========================================================= */
  const SKILLS = {
    repulsor:  { name: '鋼鐵光束', c: ['#7fd8ff', '#ffffff', '#4ea8de'], proj: 'orb', path: 'beam', burst: 'ring', sfx: 'zap', shake: 9 },
    web:       { name: '蜘蛛絲網', c: ['#ffffff', '#dbe9ff'], proj: 'web', path: 'straight', burst: 'web', sfx: 'whoosh', shake: 5 },
    shieldthrow: { name: '飛盾攻擊', c: ['#c8102e', '#ffffff'], proj: 'shield', path: 'arc', burst: 'clang', sfx: 'clang', shake: 10 },
    smash:     { name: '浩克重擊', c: ['#4c9a2a', '#a7e05a', '#ffffff'], proj: 'fist', path: 'straight', burst: 'shock', sfx: 'roar', shake: 16 },
    thunder:   { name: '雷神之鎚', c: ['#ffd60a', '#ffffff', '#7fd8ff'], proj: 'bolt', path: 'zig', burst: 'zap', sfx: 'zap', shake: 13 },
    claw:      { name: '猛爪連擊', c: ['#c0c6cf', '#ffffff'], proj: 'claw', path: 'straight', burst: 'slash', sfx: 'snip', shake: 8 },
    starburst: { name: '星光爆發', c: ['#ffd60a', '#ff9f1c', '#ffffff'], proj: 'star', path: 'straight', burst: 'stars', sfx: 'power', shake: 11 },
    mandala:   { name: '魔法陣', c: ['#ffb703', '#ff9f1c', '#ffe08a'], proj: 'ring', path: 'straight', burst: 'rings', sfx: 'magic', shake: 7 },
    arrow:     { name: '神射之箭', c: ['#5f2a84', '#c0c6cf', '#ffffff'], proj: 'arrow', path: 'straight', burst: 'slash', sfx: 'whoosh', shake: 7 },
    swarm:     { name: '蟻群突擊', c: ['#c8102e', '#20232a', '#b0b7bf'], proj: 'swarm', path: 'straight', burst: 'dots', sfx: 'squeak', shake: 6 },
    vine:      { name: '藤蔓纏繞', c: ['#6a994e', '#8b5e3c', '#a7e05a'], proj: 'vine', path: 'straight', burst: 'leaves', sfx: 'boing', shake: 8 },
    rocketgun: { name: '火箭砲', c: ['#ff9f1c', '#ffd60a', '#e8590c'], proj: 'rocket', path: 'straight', burst: 'boom', sfx: 'rocket', shake: 14 },
    heatvision:{ name: '熱視線', c: ['#ff2d2d', '#ff9f1c', '#ffffff'], proj: 'orb', path: 'beam', burst: 'boom', sfx: 'zap', shake: 12 },
    batarang:  { name: '蝙蝠鏢', c: ['#20232a', '#f2a900'], proj: 'bat', path: 'arc', burst: 'clang', sfx: 'whoosh', shake: 8 },
    lasso:     { name: '真言套索', c: ['#ffd60a', '#ff9f1c'], proj: 'ring', path: 'arc', burst: 'rings', sfx: 'magic', shake: 9 },
    speedforce:{ name: '神速衝刺', c: ['#ffd60a', '#c8102e', '#ffffff'], proj: 'dash', path: 'straight', burst: 'zap', sfx: 'whoosh', shake: 12 },
    tidal:     { name: '海皇之潮', c: ['#1e88e5', '#7fd8ff', '#ffffff'], proj: 'wave', path: 'straight', burst: 'splash', sfx: 'bubble', shake: 11 },
    lantern:   { name: '綠光構裝', c: ['#2a9d3f', '#7ae582', '#ffffff'], proj: 'ring', path: 'straight', burst: 'rings', sfx: 'power', shake: 9 },
    plasma:    { name: '電漿砲', c: ['#7fd8ff', '#c8102e', '#ffffff'], proj: 'orb', path: 'beam', burst: 'boom', sfx: 'robot', shake: 13 },
    // 寵物系
    flame:     { name: '火焰吐息', c: ['#ff9f1c', '#ffd60a', '#e8590c'], proj: 'flame', path: 'straight', burst: 'boom', sfx: 'roar', shake: 10 },
    aqua:      { name: '泡泡水砲', c: ['#1e88e5', '#7fd8ff', '#ffffff'], proj: 'bubbles', path: 'straight', burst: 'splash', sfx: 'bubble', shake: 9 },
    leafblade: { name: '葉刃旋風', c: ['#2a9d3f', '#7ae582', '#a7e05a'], proj: 'leaves', path: 'straight', burst: 'leaves', sfx: 'whoosh', shake: 9 },
  };

  // 英雄索引 → 技能（對應 words.js 英雄關順序）
  const HERO_SKILL = ['repulsor', 'web', 'shieldthrow', 'smash', 'thunder', 'claw',
    'starburst', 'mandala', 'arrow', 'swarm', 'vine', 'rocketgun', 'claw',
    'heatvision', 'batarang', 'lasso', 'speedforce', 'tidal', 'lantern', 'plasma'];
  const PET_SKILL = { dino: 'flame', aqua: 'aqua', leaf: 'leafblade' };

  function skillOf(kind, id, stage) {
    if (kind === 'hero') return SKILLS[HERO_SKILL[id] || 'starburst'];
    const s = SKILLS[PET_SKILL[id] || 'flame'];
    return Object.assign({}, s, { power: 1 + (stage || 0) * 0.35 });   // 進化越高越華麗
  }

  /* ---------- 蓄力 ---------- */
  function charge(sk, at, ms) {
    const n = Math.round(14 * (sk.power || 1));
    for (let i = 0; i < n; i++) {
      const a = rand(0, 7), d = rand(40, 90);
      add({
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d,
        vx: -Math.cos(a) * d / (ms / 16), vy: -Math.sin(a) * d / (ms / 16),
        size: rand(3, 7), color: pick(sk.c), shape: pick(['dot', 'spark']),
        decay: 1 / (ms / 16), hold: Math.round(i * 0.6),
      });
    }
  }

  /* ---------- 飛行體 ---------- */
  function projectile(sk, from, to, travel, onArrive) {
    const p = sk.power || 1;
    const dx = to.x - from.x, dy = to.y - from.y;
    const ang = Math.atan2(dy, dx);
    const steps = Math.round(travel / 16);

    if (sk.path === 'beam') {
      beams.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, w: 9 * p,
                   color: sk.c[0], life: 1, decay: 0.05 });
      beams.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, w: 3,
                   color: '#ffffff', life: 1, decay: 0.06 });
      setTimeout(onArrive, Math.min(travel, 200));
      start();
      return;
    }
    if (sk.path === 'zig') {
      beams.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, w: 7 * p,
                   color: sk.c[0], life: 1, decay: 0.055, zig: true });
      beams.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, w: 3,
                   color: '#ffffff', life: 1, decay: 0.07, zig: true });
      setTimeout(onArrive, Math.min(travel, 220));
      start();
      return;
    }

    // 依飛行體種類決定同時飛幾顆、外觀
    let count = 1, shape = 'dot', size = 13 * p, spin = 0.25, spread = 0;
    switch (sk.proj) {
      case 'shield': shape = 'shield'; size = 20 * p; spin = 0.45; break;
      case 'bat': shape = 'bat'; size = 17 * p; spin = 0.5; break;
      case 'star': shape = 'star'; size = 17 * p; spin = 0.2; break;
      case 'ring': shape = 'ring'; size = 20 * p; spin = 0.12; break;
      case 'claw': shape = 'line'; size = 26 * p; count = 3; spread = 26; spin = 0; break;
      case 'arrow': shape = 'tri'; size = 13 * p; spin = 0; break;
      case 'swarm': shape = 'dot'; size = 6; count = 16; spread = 40; break;
      case 'leaves': shape = 'leaf'; size = 15 * p; count = 6; spread = 34; spin = 0.35; break;
      case 'bubbles': shape = 'bubble'; size = 15 * p; count = 7; spread = 34; break;
      case 'flame': shape = 'dot'; size = 17 * p; count = 8; spread = 26; break;
      case 'vine': shape = 'line'; size = 22 * p; count = 4; spread = 20; spin = 0.1; break;
      case 'rocket': shape = 'tri'; size = 17 * p; spin = 0; break;
      case 'web': shape = 'ring'; size = 18 * p; spin = 0.3; break;
      case 'fist': shape = 'dot'; size = 26 * p; break;
      case 'dash': shape = 'line'; size = 34 * p; count = 3; spread = 22; spin = 0; break;
      case 'wave': shape = 'ring'; size = 24 * p; count = 3; spread = 26; break;
      case 'bolt': shape = 'spark'; size = 20 * p; break;
    }

    // 面向目標的形狀（箭、爪、衝刺線）需要旋轉對齊
    const aimed = ['arrow', 'rocket', 'claw', 'dash', 'vine'].includes(sk.proj);
    const trailShape = sk.proj === 'leaves' ? 'leaf' : sk.proj === 'bubbles' ? 'bubble'
      : sk.proj === 'flame' ? 'dot' : 'spark';

    for (let c = 0; c < count; c++) {
      const off = count > 1 ? rand(-spread, spread) : 0;
      const delay = Math.round(c * (count > 4 ? 2.5 : 4));   // 錯開出手，形成連續的流
      add({
        par: true, t: 0, dt: 1 / steps,
        sx: from.x, sy: from.y + off, ex: to.x, ey: to.y + off * 0.35,
        arc: sk.path === 'arc' ? rand(-80, -45) : 0,
        x: from.x, y: from.y + off,
        size: size * (count > 4 ? 0.7 : 1), color: sk.c[c % sk.c.length],
        shape, rot: aimed ? ang : rand(0, 7), spin: aimed ? 0 : spin,
        hold: delay, shrink: false, life: 1,
        trail: { size: size * 0.42, colors: sk.c, shape: trailShape, decay: 0.11 },
      });
    }
    setTimeout(onArrive, travel);
    start();
  }

  /* ---------- 命中爆開 ---------- */
  function burst(sk, at) {
    const p = sk.power || 1;
    const B = sk.burst;
    const n = Math.round((B === 'shock' || B === 'boom' ? 46 : 30) * p);
    if (B === 'rings' || B === 'ring' || B === 'web' || B === 'clang') {
      for (let i = 0; i < 3; i++) {
        add({ x: at.x, y: at.y, size: 16 + i * 12, color: sk.c[i % sk.c.length],
              shape: 'ring', decay: 0.045, hold: i * 3, shrink: false,
              vx: 0, vy: 0, spin: 0.03 });
      }
    }
    if (B === 'slash') {
      for (let i = 0; i < 3; i++) {
        add({ x: at.x + rand(-14, 14), y: at.y + rand(-24, 24), size: 34,
              color: '#ffffff', shape: 'line', rot: rand(-0.9, -0.5),
              decay: 0.07, hold: i * 3, shrink: false });
      }
    }
    if (B === 'shock' || B === 'boom') {
      add({ x: at.x, y: at.y, size: 26 * p, color: '#ffffff', shape: 'dot', decay: 0.09 });
      for (let i = 0; i < 2; i++) {
        add({ x: at.x, y: at.y, size: 20 + i * 18, color: sk.c[i % sk.c.length],
              shape: 'ring', decay: 0.05, hold: i * 2, shrink: false });
      }
    }
    const shapes = B === 'stars' ? ['star', 'spark'] : B === 'leaves' ? ['leaf']
      : B === 'splash' ? ['bubble', 'dot'] : B === 'zap' ? ['spark', 'line'] : ['dot', 'spark'];
    for (let i = 0; i < n; i++) {
      const a = rand(0, 7), sp = rand(1.6, 7) * p;
      add({
        x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        size: rand(3, 9), color: pick(sk.c), shape: pick(shapes),
        decay: rand(0.02, 0.045), grav: 0.16, drag: 0.97,
        rot: rand(0, 7), spin: rand(-0.3, 0.3),
      });
    }
    shake = sk.shake * (sk.power || 1);
    start();
  }

  /* ---------- 一次攻擊：蓄力→發射→命中 ---------- */
  function attack(sk, fromEl, toEl, onHit) {
    const from = centerOf(fromEl), to = centerOf(toEl);
    const chargeMs = 260, travelMs = sk.path === 'beam' || sk.path === 'zig' ? 180 : 340;
    if (fromEl) fromEl.classList.add('charge');
    charge(sk, from, chargeMs);
    start();
    if (window.AudioEngine) AudioEngine.playSfx('power');
    showSkillName(sk.name);
    setTimeout(() => {
      if (window.AudioEngine) AudioEngine.playSfx(sk.sfx);
      projectile(sk, from, to, travelMs, () => {
        if (fromEl) fromEl.classList.remove('charge');
        burst(sk, to);
        if (onHit) onHit();
      });
    }, chargeMs);
    return chargeMs + travelMs;
  }

  function showSkillName(name) {
    if (!host) return;
    let el = host.querySelector('.skill-name');
    if (!el) {
      el = document.createElement('div');
      el.className = 'skill-name';
      host.appendChild(el);
    }
    el.textContent = name + '！';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  /* ---------- 必殺技：全隊合體攻擊 ---------- */
  function overlay(on) {
    let el = document.getElementById('ultDark');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ultDark';
      document.body.appendChild(el);
    }
    el.classList.toggle('on', !!on);
  }
  function ultTitle() {
    let el = document.getElementById('ultTitle');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ultTitle';
      document.body.appendChild(el);
    }
    el.textContent = '⚡ 必殺技 ⚡';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  function flashWhite() {
    const el = document.getElementById('ultDark');
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 260);
  }
  // 大範圍聚氣：粒子從四面八方吸進角色
  function chargeBig(sk, at, ms) {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 7), d = rand(70, 150);
      add({
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d,
        vx: -Math.cos(a) * d / (ms / 16), vy: -Math.sin(a) * d / (ms / 16),
        size: rand(4, 10), color: pick(sk.c), shape: pick(['spark', 'star', 'dot']),
        decay: 1 / (ms / 16), hold: Math.round(i * 0.8), rot: rand(0, 7), spin: rand(-.3, .3),
      });
    }
  }
  // 終結爆炸
  function megaBurst(colors, at) {
    add({ x: at.x, y: at.y, size: 70, color: '#ffffff', shape: 'dot', decay: 0.07 });
    for (let i = 0; i < 6; i++) {
      add({ x: at.x, y: at.y, size: 26 + i * 22, color: colors[i % colors.length],
            shape: 'ring', decay: 0.035, hold: i * 3, shrink: false, spin: 0.02 });
    }
    for (let i = 0; i < 120; i++) {
      const a = rand(0, 7), sp = rand(2.5, 13);
      add({
        x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
        size: rand(4, 13), color: pick(colors), shape: pick(['star', 'spark', 'dot']),
        decay: rand(0.014, 0.032), grav: 0.17, drag: 0.975,
        rot: rand(0, 7), spin: rand(-.4, .4),
      });
    }
    shake = 30;
    start();
  }
  function ultimate(list, targetEl, onHit) {
    const to = centerOf(targetEl);
    const colors = [...new Set(list.flatMap(m => m.skill.c))];
    overlay(true);
    ultTitle();
    if (window.AudioEngine) AudioEngine.playSfx('power');
    list.forEach(m => {
      if (m.el) m.el.classList.add('charge');
      chargeBig(m.skill, centerOf(m.el), 720);
    });
    start();
    setTimeout(() => {
      flashWhite();
      if (window.AudioEngine) AudioEngine.playSfx('fanfare');
      // 全員同時發射，威力放大
      list.forEach(m => {
        const sk = Object.assign({}, m.skill, {
          power: (m.skill.power || 1) * 2.2, shake: m.skill.shake * 1.5,
        });
        projectile(sk, centerOf(m.el), to, 300, () => {});
      });
      setTimeout(() => {
        list.forEach(m => m.el && m.el.classList.remove('charge'));
        if (window.AudioEngine) AudioEngine.playSfx('rocket');
        megaBurst(colors, to);
        if (onHit) onHit();
        setTimeout(() => overlay(false), 420);
      }, 330);
    }, 720);
  }

  /* ---------- 隊伍依序出招 ---------- */
  // list: [{el, skill}]；onDone 在最後一擊命中後呼叫
  function partyAttack(list, targetEl, onDone) {
    let done = 0;
    list.forEach((m, i) => {
      setTimeout(() => {
        attack(m.skill, m.el, targetEl, () => {
          done++;
          if (done >= list.length && onDone) onDone();
        });
      }, i * 330);
    });
  }

  function clear() {
    parts = []; beams = []; shake = 0;
    if (ctx) { setT(); ctx.clearRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2); }
  }

  return { mount, skillOf, attack, partyAttack, ultimate, clear, SKILLS };
})();

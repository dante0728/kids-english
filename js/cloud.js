/* =====================================================
   雲端自動備份（Firebase Firestore REST，免 SDK）
   - 家長模式輸入「家庭代碼」啟用；之後任何變動自動上傳（8 秒防抖）
   - 開啟網頁時檢查雲端是否比本機新，是的話自動還原
   - 資料量大時自動分片（Firestore 單文件上限 1MB）
   CFG 由 Firebase 專案開通後填入；未填時整個功能靜默停用
   ===================================================== */
const Cloud = (() => {
  const CFG = {
    projectId: 'kids-english-fd798',
    apiKey: 'AIzaSyD59y9uI5eqSpNjLJopY_nT7O02jhrgpuE',   // Firebase Web Key（公開性質，安全性由資料庫規則把關）
  };
  const CHUNK = 800000;   // 每片約 0.8MB，留餘裕給 Firestore 1MB 上限

  const enabled = () => !!(CFG.projectId && CFG.apiKey);
  const base = () => `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents`;

  let statusCb = null;
  const setStatus = (msg, ok = true) => { if (statusCb) statusCb(msg, ok); };

  const getCode = () => localStorage.getItem('abc-family') || '';
  function setCode(code) {
    localStorage.setItem('abc-family', code);
  }

  function bundle() {
    return JSON.stringify({
      custom: Custom.data,
      mem: Mem.data,
      heroes: Heroes.data,
      stars,
      days: JSON.parse(localStorage.getItem('abc-days') || '[]'),
      pet: JSON.parse(localStorage.getItem('abc-pet') || 'null'),
      lessons: JSON.parse(localStorage.getItem('abc-lessons') || '{}'),
      updated: Date.now(),
    });
  }

  async function fsWrite(docId, fields) {
    const r = await fetch(`${base()}/backups/${encodeURIComponent(docId)}?key=${CFG.apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }
  async function fsRead(docId) {
    const r = await fetch(`${base()}/backups/${encodeURIComponent(docId)}?key=${CFG.apiKey}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).fields || null;
  }

  async function push() {
    if (!enabled() || !getCode()) return;
    const code = getCode();
    const data = bundle();
    const parts = [];
    for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
    setStatus('上傳中…');
    try {
      for (let i = 0; i < parts.length; i++) {
        await fsWrite(`${code}_p${i}`, { data: { stringValue: parts[i] } });
      }
      await fsWrite(code, {
        updated: { integerValue: String(Date.now()) },
        parts: { integerValue: String(parts.length) },
      });
      localStorage.setItem('abc-cloud-ts', String(Date.now()));
      setStatus('✅ 已備份 ' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      setStatus('⚠️ 上傳失敗，稍後會再試', false);
      schedule();   // 失敗後重試
    }
  }

  async function pull() {
    if (!enabled() || !getCode()) return null;
    const code = getCode();
    const meta = await fsRead(code);
    if (!meta) return null;
    const n = Number(meta.parts.integerValue);
    let data = '';
    for (let i = 0; i < n; i++) {
      const p = await fsRead(`${code}_p${i}`);
      if (!p) throw new Error('備份不完整');
      data += p.data.stringValue;
    }
    return JSON.parse(data);
  }

  function apply(d) {
    localStorage.setItem('abc-custom', JSON.stringify(d.custom || { words: {}, over: {} }));
    localStorage.setItem('abc-mem', JSON.stringify(d.mem || {}));
    localStorage.setItem('abc-heroes', JSON.stringify(d.heroes || { owned: [0, 1, 13], active: 1 }));
    localStorage.setItem('abc-stars', d.stars || 0);
    localStorage.setItem('abc-days', JSON.stringify(d.days || []));
    if (d.pet) localStorage.setItem('abc-pet', JSON.stringify(d.pet));
    if (d.lessons) localStorage.setItem('abc-lessons', JSON.stringify(d.lessons));
    localStorage.setItem('abc-cloud-ts', String(d.updated || Date.now()));
  }

  // 變動後 8 秒自動上傳（多次變動合併成一次）
  let timer = null;
  function schedule() {
    if (!enabled() || !getCode()) return;
    clearTimeout(timer);
    timer = setTimeout(push, 8000);
  }
  document.addEventListener('visibilitychange', () => {   // 關頁前盡快送出
    if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); push(); }
  });

  // 開啟網頁時：雲端比本機新 → 自動還原（每工作階段最多一次，避免迴圈）
  async function autoRestore() {
    if (!enabled() || !getCode()) return;
    if (sessionStorage.getItem('abc-cloud-pulled')) return;
    sessionStorage.setItem('abc-cloud-pulled', '1');
    try {
      const meta = await fsRead(getCode());
      if (!meta) return;
      const cloudTs = Number(meta.updated.integerValue);
      const localTs = Number(localStorage.getItem('abc-cloud-ts') || 0);
      if (cloudTs > localTs) {
        const d = await pull();
        if (d) { apply(d); location.reload(); }
      }
    } catch (e) { /* 離線等情況，靜默略過 */ }
  }

  return { enabled, getCode, setCode, push, pull, apply, schedule, autoRestore,
           onStatus(cb) { statusCb = cb; } };
})();

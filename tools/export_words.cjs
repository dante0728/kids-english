// 把 js/words.js 轉成 words.json 給 PowerShell 語音合成腳本用
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'words.js'), 'utf8');
const tmp = path.join(__dirname, '_words_tmp.cjs');
fs.writeFileSync(tmp, src + '\nmodule.exports = THEMES;');
const THEMES = require(tmp);
fs.unlinkSync(tmp);
fs.writeFileSync(path.join(__dirname, 'words.json'), JSON.stringify(THEMES), 'utf8');
console.log('exported themes:', THEMES.map(t => `${t.id}(${t.words.length})`).join(', '));

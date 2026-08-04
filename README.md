# 🌈 ABC 樂園 — 幼兒英文學習遊戲

給 4 歲小朋友的英文學習網頁遊戲。純 HTML5，不需任何後端。

**線上遊玩：** https://dante0728.github.io/kids-english/

## 內容
- 5 個主題關卡（交通工具、動物、超級英雄、日用品、水果），各 20 個單字
- 每個單字：主題音效 → 英文單字 → 英文例句 → 中文例句（全部預先合成好的音檔）
- 三種玩法：點點聽單字、聽力選圖（答對 5 題過關）、跟著唸（語音辨識）
- 背景音樂、集星星獎勵、RWD 設計（手機/iPad/電腦都能玩）

## 結構
```
index.html          頁面
css/style.css       樣式（含 RWD）
js/words.js         單字庫（要加單字改這裡）
js/audio.js         音效引擎（優先播 mp3，失敗時即時合成備援）
js/app.js           遊戲邏輯
assets/sfx/         43 個音效 mp3
assets/voice/       204 個語音 mp3（單字＋例句）
assets/bgm.wav      背景音樂（wav 才能無縫循環）
tools/              素材重新產生腳本（Windows）
```

## 重新產生素材（改了單字之後）
```
python tools/gen_sfx.py
node tools/export_words.cjs
powershell tools/gen_voice.ps1
再用 ffmpeg 把 wav 轉 mp3（見部署歷史）
```

## 已知限制
- 「跟著唸」的語音辨識只支援桌機/Android 的 Chrome、Edge；iPad Safari 會自動改成家長按「我唸對了」給獎勵
- 語音是 Windows TTS 合成，之後可換成真人錄音（同檔名放進 assets/voice 即可）

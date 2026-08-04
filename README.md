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
assets/sfx/         43 個真實音效 mp3（含 credits.json 來源）
assets/voice/       204 個 Edge TTS 神經網路語音 mp3（單字＋例句）
assets/img/         80 張 CC0 真實照片縮圖（含 credits.json 來源）
assets/bgm.wav      背景音樂（wav 才能無縫循環）
tools/              素材產生腳本
```

## 素材來源與授權
- **語音**：Edge TTS 神經網路語音（en-US-JennyNeural / zh-TW-HsiaoChenNeural / 讚美語 en-US-AnaNeural）
- **音效**：Google Actions 音效庫（royalty-free）＋ Openverse CC0 音效，來源見 `assets/sfx/credits.json`
- **照片**：Openverse CC0（免版權）照片，來源見 `assets/img/credits.json`
- **超級英雄關**：角色圖像有版權，縮圖維持 emoji

## 重新產生素材（改了單字之後）
```
node tools/export_words.cjs      # 匯出單字資料
python tools/gen_voice_edge.py   # Edge TTS 語音（需網路）
python tools/fetch_sfx.py        # 真實音效下載
python tools/fetch_img.py        # CC0 照片下載
python tools/gen_sfx.py          # （備援）離線合成音效
```
語音合成後要把例句合併：`ffmpeg concat`（見 git 歷史），或直接請 Claude 代跑。

## 已知限制
- 「跟著唸」的語音辨識只支援桌機/Android 的 Chrome、Edge；iPad Safari 會自動改成家長按「我唸對了」給獎勵
- 縮圖是自動搜尋的 CC0 照片，個別可能不夠貼切，可手動換掉 `assets/img/{主題}_{編號}.jpg`

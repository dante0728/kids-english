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
- **縮圖**：[OpenMoji](https://openmoji.org)（CC BY-SA 4.0）統一扁平卡通圖庫
- **超級英雄縮圖**：本專案手繪原創卡通頭像（`tools/gen_hero_svg.py`），非官方素材
- **音效**：本專案合成引擎產生（`tools/gen_sfx.py`），43 個音效同一套風格
- 本專案僅供個人／家庭學習使用，非商業用途

## 重新產生素材（改了單字之後）
```
node tools/export_words.cjs      # 匯出單字資料
python tools/gen_voice_edge.py   # Edge TTS 語音（需網路）
python tools/fetch_openmoji.py   # OpenMoji 卡通縮圖
python tools/gen_hero_svg.py     # 英雄卡通頭像
python tools/gen_sfx.py          # 合成音效（wav，再用 ffmpeg 轉 mp3）
```
語音合成後要把例句合併：`ffmpeg concat`（見 git 歷史），或直接請 Claude 代跑。

## 已知限制
- 「跟著唸」的語音辨識只支援桌機/Android 的 Chrome、Edge；iPad Safari 會自動改成家長按「我唸對了」給獎勵
- 縮圖是自動搜尋的 CC0 照片，個別可能不夠貼切，可手動換掉 `assets/img/{主題}_{編號}.jpg`

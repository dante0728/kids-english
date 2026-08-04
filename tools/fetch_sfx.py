# -*- coding: utf-8 -*-
"""
下載真實音效取代合成音效。
來源：
  1. Google Actions 音效庫（royalty-free，可直接用於專案）
  2. Openverse API 搜尋 CC0 音效（freesound 等，無版權限制）
處理：每個檔案修剪到最長 2.6 秒、尾端淡出、響度正規化、轉 22050Hz 單聲道 mp3
輸出：assets/sfx/{name}.mp3（成功才覆蓋，失敗保留原本的合成版）
      assets/sfx/credits.json（來源紀錄）
用法：python tools/fetch_sfx.py
"""
import json, os, subprocess, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sfx')
TMP = os.path.join(ROOT, 'assets', '_sfx_tmp')
os.makedirs(TMP, exist_ok=True)

GOOGLE = 'https://actions.google.com/sounds/v1/'
# 音效 → Google 音效庫直連
DIRECT = {
    'horn':   GOOGLE + 'transportation/car_horn.ogg',
    'siren':  GOOGLE + 'emergency/ambulance_siren.ogg',
    'heli':   GOOGLE + 'transportation/helicopter_by.ogg',
    'plane':  GOOGLE + 'transportation/airplane_in_flight.ogg',
    'engine': GOOGLE + 'transportation/engine_start_up.ogg',
    'woof':   GOOGLE + 'animals/dog_barking.ogg',
    'squeak': GOOGLE + 'animals/mouse_squeaking.ogg',
    'tick':   GOOGLE + 'household/clock_ticking.ogg',
    'ring':   GOOGLE + 'household/telephone_ring.ogg',
    'brush':  GOOGLE + 'household/electric_tooth_brush.ogg',
    'boing':  GOOGLE + 'cartoon/cartoon_boing.ogg',
    'pop':    GOOGLE + 'cartoon/pop.ogg',
    'train':  GOOGLE + 'cartoon/wooden_train_whistle.ogg',
    'jingle': GOOGLE + 'cartoon/jingle_bells.ogg',
    'boat':   GOOGLE + 'transportation/ship_bell.ogg',
}
# 音效 → Openverse CC0 搜尋關鍵字
SEARCH = {
    'meow':   'cat meow',
    'moo':    'cow moo',
    'oink':   'pig oink',
    'neigh':  'horse neigh',
    'baa':    'sheep baa',
    'quack':  'duck quack',
    'cluck':  'chicken cluck',
    'tweet':  'bird chirp',
    'ribbit': 'frog croak',
    'hiss':   'snake hiss',
    'roar':   'lion roar',
    'growl':  'bear growl',
    'trumpet':'elephant trumpet',
    'bell':   'bicycle bell',
    'knock':  'knock on door',
    'ding':   'service bell ding',
    'whoosh': 'whoosh swoosh',
    'fanfare':'fanfare trumpet',
    'yay':    'children cheering yay',
    'wrong':  'wrong answer buzzer',
    'magic':  'magic chime sparkle',
    'zap':    'laser zap',
    'power':  'power up game',
    'clang':  'metal clang hit',
    'robot':  'robot beep',
    'rocket': 'rocket launch',
    'bubble': 'water bubbles',
    'snip':   'scissors cut',
}

def http_get(url, path):
    # 這台機器 Python 的 CA 憑證有問題，改用 curl 下載
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', 'kids-english-edu/1.0',
                        '-o', path, url])
    if r.returncode != 0 or not os.path.exists(path) or os.path.getsize(path) < 500:
        raise RuntimeError('curl failed: ' + url)

def openverse_pick(query):
    """回傳 (音檔URL, 出處URL, 標題)；挑 0.5~8 秒之間最短的"""
    q = urllib.parse.quote(query)
    url = f'https://api.openverse.org/v1/audio/?q={q}&license=cc0&page_size=12'
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', 'kids-english-edu/1.0', url],
                       capture_output=True, text=True)
    data = json.loads(r.stdout or '{}')
    cands = []
    for res in data.get('results', []):
        dur = res.get('duration') or 0
        if 400 <= dur <= 8000 and res.get('url'):
            cands.append((dur, res))
    if not cands:  # 放寬：8~20 秒也接受（反正會修剪）
        for res in data.get('results', []):
            dur = res.get('duration') or 0
            if 400 <= dur <= 20000 and res.get('url'):
                cands.append((dur, res))
    if not cands:
        return None
    cands.sort(key=lambda c: c[0])
    r0 = cands[0][1]
    return (r0['url'], r0.get('foreign_landing_url', ''), r0.get('title', ''))

def process(src, dst):
    """修剪 2.6 秒、淡出、響度正規化、轉 22050 單聲道 mp3"""
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
        '-t', '2.6', '-af', 'loudnorm=I=-18:TP=-1.5,afade=t=out:st=2.25:d=0.35',
        '-ar', '22050', '-ac', '1', '-codec:a', 'libmp3lame', '-qscale:a', '6', dst])
    return r.returncode == 0 and os.path.getsize(dst) > 1500

def main():
    credits, ok, fail = {}, [], []
    for name, url in DIRECT.items():
        try:
            raw = os.path.join(TMP, name + '.raw')
            http_get(url, raw)
            if process(raw, os.path.join(OUT, name + '.mp3')):
                credits[name] = {'source': 'Google Actions Sound Library', 'url': url}
                ok.append(name); print('google ok:', name)
            else:
                fail.append(name)
        except Exception as e:
            fail.append(name); print('google FAIL:', name, repr(e)[:60])
    for name, query in SEARCH.items():
        try:
            time.sleep(1.2)   # 尊重 Openverse 匿名流量限制
            pick = openverse_pick(query)
            if not pick:
                fail.append(name); print('openverse none:', name); continue
            audio_url, landing, title = pick
            raw = os.path.join(TMP, name + '.raw')
            http_get(audio_url, raw)
            if process(raw, os.path.join(OUT, name + '.mp3')):
                credits[name] = {'source': 'Openverse CC0', 'title': title, 'url': landing}
                ok.append(name); print('openverse ok:', name, '<-', title[:40])
            else:
                fail.append(name)
        except Exception as e:
            fail.append(name); print('openverse FAIL:', name, repr(e)[:60])
    with open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf-8') as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    print(f'\nreplaced {len(ok)}, kept-synth {len(fail)}: {fail}')

if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""
用 OpenMoji（CC BY-SA 4.0，統一扁平卡通風格）當四個一般主題的縮圖。
超級英雄主題另外用手繪 SVG（tools/gen_hero_svg.py）。
輸出：assets/img/{theme}_{i}.png（320px、透明背景）
用法：python tools/fetch_openmoji.py
"""
import json, os, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')
TMP = os.path.join(ROOT, 'assets', '_om_tmp')
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

RAW = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618/'

def candidates(emoji):
    """OpenMoji 檔名的碼位要補零到至少 4 位（例如鍵帽 0️⃣ 是 0030-FE0F-20E3）。
    不補零的寫法會讓數字鍵帽等低碼位 emoji 靜默抓不到，故兩種格式都試。"""
    cps = [ord(c) for c in emoji]
    out = []
    for fmt in ('04X', 'X'):
        full = '-'.join(format(c, fmt) for c in cps)
        nofe = '-'.join(format(c, fmt) for c in cps if c != 0xFE0F)
        for cand in (full, nofe):
            if cand not in out:
                out.append(cand)
    return out

def fetch(url, path):
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-o', path, url])
    return r.returncode == 0 and os.path.exists(path) and os.path.getsize(path) > 1000

def resize(src, dst):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                        '-vf', 'scale=320:320', dst])
    return r.returncode == 0 and os.path.getsize(dst) > 1000

def main():
    with open(os.path.join(ROOT, 'tools', 'words.json'), encoding='utf-8') as f:
        themes = json.load(f)
    ok, fail = 0, []
    for t in themes:
        if t['id'] == 'heroes':
            continue
        for i, w in enumerate(t['words']):
            name = f"{t['id']}_{i}"
            dst = os.path.join(OUT, name + '.png')
            got = False
            for cand in candidates(w['emoji']):
                raw = os.path.join(TMP, name + '.png')
                if fetch(RAW + cand + '.png', raw) and resize(raw, dst):
                    print('ok:', name, w['en'], cand)
                    got = True
                    break
            if got:
                ok += 1
            else:
                fail.append(f"{name}:{w['en']}({w['emoji']})")
            time.sleep(0.15)
    print(f'openmoji ok={ok} fail={len(fail)}: {fail}')

if __name__ == '__main__':
    main()

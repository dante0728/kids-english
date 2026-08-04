# -*- coding: utf-8 -*-
"""
用 Openverse API 抓 CC0（免版權）真實照片當單字縮圖。
超級英雄主題跳過（官方角色圖有版權，保留 emoji）。
輸出：assets/img/{theme}_{i}.jpg（512x512 方形裁切）
      assets/img/credits.json
用法：python tools/fetch_img.py
"""
import json, os, subprocess, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')
TMP = os.path.join(ROOT, 'assets', '_img_tmp')
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

# 搜尋字串微調（避免歧義）
QUERY_FIX = {
    'rocket': 'rocket spaceship launch',
    'van': 'van vehicle',
    'key': 'metal key',
    'juice': 'juice box drink',
    'melon': 'cantaloupe melon',
    'green apple': 'green apple fruit',
    'hot air balloon': 'hot air balloon sky',
}
SUFFIX = {'animals': ' animal', 'fruits': ' fruit', 'vehicles': '', 'daily': ''}

def search(query):
    q = urllib.parse.quote(query)
    url = f'https://api.openverse.org/v1/images/?q={q}&license=cc0&page_size=10'
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', 'kids-english-edu/1.0', url],
                       capture_output=True)
    data = json.loads(r.stdout.decode('utf-8', 'replace') or '{}')
    return data.get('results', [])

def fetch(url, path):
    r = subprocess.run(['curl', '-sL', '--max-time', '60', '-A', 'kids-english-edu/1.0',
                        '-o', path, url])
    return r.returncode == 0 and os.path.exists(path) and os.path.getsize(path) > 2000

def to_square(src, dst):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
        '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
        '-frames:v', '1', '-q:v', '4', dst])
    return r.returncode == 0 and os.path.getsize(dst) > 3000

def main():
    with open(os.path.join(ROOT, 'tools', 'words.json'), encoding='utf-8') as f:
        themes = json.load(f)
    credits, ok, fail = {}, 0, []
    for t in themes:
        if t['id'] == 'heroes':
            continue
        for i, w in enumerate(t['words']):
            name = f"{t['id']}_{i}"
            dst = os.path.join(OUT, name + '.jpg')
            query = QUERY_FIX.get(w['en'].lower(), w['en'] + SUFFIX.get(t['id'], ''))
            time.sleep(1.2)
            try:
                results = search(query)
                got = False
                for res in results:
                    thumb = res.get('thumbnail') or res.get('url')
                    if not thumb:
                        continue
                    raw = os.path.join(TMP, name + '.raw')
                    if fetch(thumb, raw) and to_square(raw, dst):
                        credits[name] = {'word': w['en'], 'title': res.get('title', ''),
                                         'creator': res.get('creator', ''),
                                         'url': res.get('foreign_landing_url', ''), 'license': 'cc0'}
                        ok += 1; got = True
                        print('ok:', name, w['en'], '<-', (res.get('title') or '')[:40])
                        break
                if not got:
                    fail.append(name + ':' + w['en'])
                    print('none:', name, w['en'])
            except Exception as e:
                fail.append(name + ':' + w['en'])
                print('FAIL:', name, w['en'], repr(e)[:60])
    with open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf-8') as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    print(f'\nimages ok={ok} fail={len(fail)}: {fail}')

if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""補抓失敗/不合適的縮圖，帶替代關鍵字與標題黑名單。用法：python tools/retry_img.py"""
import json, os, time, urllib.parse, subprocess
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_img import search, fetch, to_square, OUT, TMP

RETRY = {
    'vehicles_1':  ['city bus', 'school bus'],
    'vehicles_4':  ['sailboat', 'boat lake'],
    'vehicles_7':  ['delivery truck', 'lorry truck'],
    'vehicles_10': ['fire engine', 'fire truck red'],
    'vehicles_12': ['helicopter flying', 'helicopter'],
    'vehicles_14': ['space rocket', 'rocket launch pad'],
    'vehicles_18': ['minivan', 'camper van'],
    'daily_0':     ['mug cup', 'cup drink'],
    'daily_1':     ['metal spoon', 'spoon tableware'],
    'daily_2':     ['fork cutlery', 'fork tableware'],
    'daily_10':    ['bed bedroom', 'cozy bed'],
    'daily_12':    ['alarm clock', 'wall clock'],
    'daily_14':    ['door keys', 'keys metal'],
    'daily_16':    ['open book', 'story book'],
    'daily_18':    ['scissors', 'scissors craft'],
    'fruits_5':    ['strawberries', 'strawberry red fresh'],
    'fruits_13':   ['coconut half', 'coconut'],
    'fruits_17':   ['avocado half', 'avocado green'],
    'fruits_10':   ['ripe mango', 'mango yellow'],
    'fruits_19':   ['orange juice glass', 'apple juice glass'],
    'fruits_16':   ['red tomatoes', 'tomato fresh'],
}
BAD = ['disease', 'symptom', 'crack', 'meat', 'rotten', 'mold', 'dead', 'insect',
       'pest', 'blood', 'damage', 'larva', 'fungus']

credits = json.load(open(os.path.join(OUT, 'credits.json'), encoding='utf-8'))
ok, fail = 0, []
for name, queries in RETRY.items():
    got = False
    for q in queries:
        for attempt in range(2):
            time.sleep(2.5)
            try:
                results = search(q)
            except Exception:
                results = []
            for res in results:
                title = (res.get('title') or '').lower()
                if any(b in title for b in BAD):
                    continue
                thumb = res.get('thumbnail') or res.get('url')
                if not thumb:
                    continue
                raw = os.path.join(TMP, name + '.raw')
                if fetch(thumb, raw) and to_square(raw, os.path.join(OUT, name + '.jpg')):
                    credits[name] = {'title': res.get('title', ''), 'creator': res.get('creator', ''),
                                     'url': res.get('foreign_landing_url', ''), 'license': 'cc0'}
                    print('ok:', name, '<-', (res.get('title') or '')[:45])
                    got = True
                    break
            if got or results:
                break
        if got:
            break
    if got: ok += 1
    else: fail.append(name)
json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'retry ok={ok} fail={len(fail)}: {fail}')

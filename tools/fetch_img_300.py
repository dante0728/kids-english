# -*- coding: utf-8 -*-
"""
為「國小必學 300 單字」抓 OpenMoji（CC BY-SA 4.0）卡通縮圖。
作法完全沿用 tools/fetch_openmoji.py：
  - 用 curl subprocess 下載（本機 Python SSL 憑證有問題，不要用 urllib）
  - 碼位轉大寫十六進位、多碼位用 - 連接，同時試「含 FE0F」與「去 FE0F」
  - 用 ffmpeg 縮成 320x320 PNG
資料來源：tools/words300.json
輸出：assets/img/{themeId}_{i}.png
用法：python tools/fetch_img_300.py
"""
import json, os, shutil, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')
TMP = os.path.join(ROOT, 'assets', '_om300_tmp')
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

RAW = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618/'


def candidates(emoji):
    """OpenMoji 檔名為大寫十六進位碼位、以 - 連接。
    同時嘗試「含 FE0F」與「去 FE0F」，並各自嘗試「不補零」與「補到 4 位」
    （OpenMoji 對 <0x1000 的碼位補零，例如 0️⃣ 是 0030-FE0F-20E3.png）。"""
    cps = [ord(c) for c in emoji]
    nofe_cps = [c for c in cps if c != 0xFE0F]
    out = []
    for seq in (cps, nofe_cps):
        if not seq:
            continue
        for fmt in ('{:X}', '{:04X}'):
            name = '-'.join(fmt.format(c) for c in seq)
            if name not in out:
                out.append(name)
    return out


def fetch(url, path):
    r = subprocess.run(['curl', '-sL', '--max-time', '40', '-o', path, url])
    return r.returncode == 0 and os.path.exists(path) and os.path.getsize(path) > 1000


def resize(src, dst):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                        '-vf', 'scale=320:320', dst])
    return r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 1000


def main():
    with open(os.path.join(ROOT, 'tools', 'words300.json'), encoding='utf-8') as f:
        themes = json.load(f)
    ok, fail, total = 0, [], 0
    for t in themes:
        for i, w in enumerate(t['words']):
            total += 1
            name = f"{t['id']}_{i}"
            dst = os.path.join(OUT, name + '.png')
            got = False
            for cand in candidates(w['emoji']):
                raw = os.path.join(TMP, name + '.png')
                if fetch(RAW + cand + '.png', raw) and resize(raw, dst):
                    print('ok:', name, w['en'], cand, flush=True)
                    got = True
                    break
            if got:
                ok += 1
            else:
                # 抓不到就跳過（遊戲會自動退回顯示 emoji）
                if os.path.exists(dst):
                    os.remove(dst)
                cps = '-'.join(f'{ord(c):X}' for c in w['emoji'])
                fail.append(f"{name}:{w['en']}:{cps}")
                print('MISS:', name, w['en'], cps, flush=True)
            time.sleep(0.15)
    print(f'--- openmoji300 ok={ok}/{total} fail={len(fail)}')
    for x in fail:
        print('  fail', x)
    # 清掉暫存的 618px 原圖，避免留在 assets/ 被部署
    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == '__main__':
    main()

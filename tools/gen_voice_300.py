# -*- coding: utf-8 -*-
"""
為「國小必學 300 單字」(tools/words300.json) 產生語音檔。
每個單字產生 3 個檔案到 assets/voice/：
  {themeId}_{i}_w.mp3  英文單字        en-US-JennyNeural      rate -25%
  {themeId}_{i}_s.mp3  英文例句+停頓+中文例句（ffmpeg 合併）
  {themeId}_{i}_z.mp3  中文單字        zh-TW-HsiaoChenNeural  rate -10%

用法：
  python tools/gen_voice_300.py            # 只補缺少 / 過小的檔案
  python tools/gen_voice_300.py --force    # 全部重做

注意：本機已 pip uninstall aiodns（勿重裝，否則 edge-tts DNS 會失敗）。
"""
import asyncio
import json
import os
import re
import subprocess
import sys

EN_VOICE = 'en-US-JennyNeural'
ZH_VOICE = 'zh-TW-HsiaoChenNeural'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'words300.json')
OUT = os.path.join(ROOT, 'assets', 'voice')
TMP = os.path.join(OUT, '_tmp300')
MIN_SIZE = 1024
FORCE = '--force' in sys.argv

os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

# --------------------------------------------------------------------------
# 中文單字清理：把 zh 欄位整理成適合唸出來的文字（檔名不變）
# --------------------------------------------------------------------------
SPECIAL_ZH = {
    '在…地點': '在某個地點',
    '在…時刻': '在某個時刻',
    '在…地點；在…時刻': '在某個地點',
    '在…裡面': '在裡面',
    '在…上面': '在上面',
    '在…下面': '在下面',
    '在…旁邊': '在旁邊',
    '在…前面': '在前面',
    '在…後面': '在後面',
    '在…中間': '在中間',
    '你（你們）': '你',
    '他（男）': '他',
    '她（女）': '她',
    '它（牠）': '它',
    '你的（你們的）': '你的',
    '他的（男）': '他的',
    '她的（女）': '她的',
    '它的、牠的': '它的',
    '如何、怎麼': '如何',
    '花園、菜園': '花園',
    '浴室、廁所': '浴室',
    '老的、舊的': '老的',
    '瘦的、薄的': '瘦的',
}

_PAREN_RE = re.compile(r'[（(][^）)]*[）)]')


def clean_zh(text):
    """把中文單字整理成適合 TTS 唸出來的文字。"""
    s = (text or '').strip()
    if not s:
        return s
    if s in SPECIAL_ZH:
        return SPECIAL_ZH[s]
    orig = s
    # 1) 分號 / 頓號：只取第一個語義
    for sep in ('；', ';', '、'):
        if sep in s:
            s = s.split(sep)[0].strip()
    if s in SPECIAL_ZH:
        return SPECIAL_ZH[s]
    # 2) 去掉括號與其內容（全形、半形）
    s = _PAREN_RE.sub('', s)
    # 3) 「…點鐘」→「點鐘」等：移除省略號
    s = s.replace('……', '').replace('…', '').replace('...', '')
    s = s.strip(' 　,，。')
    return s or orig


# --------------------------------------------------------------------------
# TTS
# --------------------------------------------------------------------------
sem = asyncio.Semaphore(5)
_done = 0
_total = 0


async def synth(text, voice, rate, path, retries=12):
    """合成單一檔案；失敗持續重試到成功。"""
    global _done
    async with sem:
        if not FORCE and os.path.exists(path) and os.path.getsize(path) > MIN_SIZE:
            _done += 1
            return
        import edge_tts
        last = None
        for attempt in range(retries):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.exists(path) and os.path.getsize(path) > MIN_SIZE:
                    _done += 1
                    if _done % 50 == 0:
                        print(f'  ... {_done}/{_total}', flush=True)
                    return
                last = 'file too small'
            except Exception as e:  # noqa: BLE001
                last = repr(e)[:120]
            print(f'  retry {attempt + 1} {os.path.basename(path)} :: {last}', flush=True)
            await asyncio.sleep(min(2 * (attempt + 1), 15))
        raise RuntimeError(f'FAILED {path} :: {last}')


def merge(en_path, zh_path, out_path):
    """英文 + 0.45s 停頓 + 中文，合併為單一 mp3。"""
    cmd = [
        'ffmpeg', '-y', '-i', en_path, '-i', zh_path,
        '-filter_complex',
        '[0:a]apad=pad_dur=0.45[a0];[a0][1:a]concat=n=2:v=0:a=1[o]',
        '-map', '[o]', '-codec:a', 'libmp3lame', '-qscale:a', '4', out_path,
    ]
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) <= MIN_SIZE:
        raise RuntimeError(f'ffmpeg failed {out_path}: {r.stderr.decode(errors="ignore")[-300:]}')


async def main():
    global _total
    with open(SRC, encoding='utf-8') as f:
        themes = json.load(f)

    jobs = []
    merges = []  # (en_tmp, zh_tmp, out)
    for t in themes:
        tid = t['id']
        for i, w in enumerate(t['words']):
            base = f'{tid}_{i}'
            w_path = os.path.join(OUT, base + '_w.mp3')
            z_path = os.path.join(OUT, base + '_z.mp3')
            s_path = os.path.join(OUT, base + '_s.mp3')

            jobs.append(synth(w['en'], EN_VOICE, '-25%', w_path))
            jobs.append(synth(clean_zh(w['zh']), ZH_VOICE, '-10%', z_path))

            if FORCE or not (os.path.exists(s_path) and os.path.getsize(s_path) > MIN_SIZE):
                en_tmp = os.path.join(TMP, base + '_sen.mp3')
                zh_tmp = os.path.join(TMP, base + '_szh.mp3')
                jobs.append(synth(w['sen'], EN_VOICE, '-15%', en_tmp))
                jobs.append(synth(w['szh'], ZH_VOICE, '-15%', zh_tmp))
                merges.append((en_tmp, zh_tmp, s_path))

    _total = len(jobs)
    print(f'TTS jobs: {_total}  (merges: {len(merges)})', flush=True)

    results = await asyncio.gather(*jobs, return_exceptions=True)
    fails = [r for r in results if isinstance(r, Exception)]
    for f_ in fails[:20]:
        print('TTS FAIL:', f_, flush=True)
    if fails:
        print(f'TTS failed: {len(fails)}', flush=True)
        sys.exit(1)

    print('merging sentences ...', flush=True)
    merge_fail = []
    for n, (en_tmp, zh_tmp, out_path) in enumerate(merges, 1):
        try:
            merge(en_tmp, zh_tmp, out_path)
            for p in (en_tmp, zh_tmp):
                try:
                    os.remove(p)
                except OSError:
                    pass
        except Exception as e:  # noqa: BLE001
            merge_fail.append(str(e))
        if n % 50 == 0:
            print(f'  merged {n}/{len(merges)}', flush=True)

    for m in merge_fail[:10]:
        print('MERGE FAIL:', m, flush=True)

    # 清空暫存資料夾
    try:
        if not os.listdir(TMP):
            os.rmdir(TMP)
    except OSError:
        pass

    print(f'done. tts={_total} merges={len(merges)} merge_failed={len(merge_fail)}', flush=True)
    sys.exit(1 if merge_fail else 0)


if __name__ == '__main__':
    asyncio.run(main())

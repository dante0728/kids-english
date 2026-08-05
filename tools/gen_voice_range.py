# -*- coding: utf-8 -*-
"""
為指定主題的指定索引區間補產語音（新增單字後使用）。
沿用既有教學語音的聲音設定，確保與其他單字一致：
  英文單字 en-US-JennyNeural -25% / 英文例句 -15% / 中文例句、中文單字 zh-TW-HsiaoChenNeural
輸出：assets/voice/{theme}_{i}_w.mp3 / _s.mp3（英+停頓+中） / _z.mp3
用法：python tools/gen_voice_range.py <themeId> <startIndex> <endIndex>
      例：python tools/gen_voice_range.py heroes 30 35
"""
import asyncio, json, os, subprocess, sys
import edge_tts

EN, ZH = 'en-US-JennyNeural', 'zh-TW-HsiaoChenNeural'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')
TMP = os.path.join(ROOT, 'assets', '_voice_tmp')

sem = asyncio.Semaphore(4)

async def synth(text, voice, rate, path, retries=5):
    async with sem:
        for attempt in range(retries):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.getsize(path) > 1024:
                    return
            except Exception as e:
                print('retry', attempt + 1, os.path.basename(path), repr(e)[:60])
                await asyncio.sleep(2 * (attempt + 1))
        raise RuntimeError('FAILED: ' + path)

def merge(en_path, zh_path, out_path):
    """英文例句 + 0.45 秒停頓 + 中文例句"""
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', en_path, '-i', zh_path,
        '-filter_complex', '[0:a]apad=pad_dur=0.45[a0];[a0][1:a]concat=n=2:v=0:a=1[o]',
        '-map', '[o]', '-codec:a', 'libmp3lame', '-qscale:a', '4', out_path])
    if r.returncode != 0 or os.path.getsize(out_path) < 1024:
        raise RuntimeError('merge failed: ' + out_path)

async def main():
    theme_id, lo, hi = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    with open(os.path.join(ROOT, 'tools', 'words.json'), encoding='utf-8') as f:
        themes = json.load(f)
    theme = next(t for t in themes if t['id'] == theme_id)

    jobs, merges = [], []
    for i in range(lo, hi + 1):
        w = theme['words'][i]
        jobs.append(synth(w['en'], EN, '-25%', os.path.join(OUT, f'{theme_id}_{i}_w.mp3')))
        jobs.append(synth(w['zh'], ZH, '-10%', os.path.join(OUT, f'{theme_id}_{i}_z.mp3')))
        if w.get('sen'):
            en_p = os.path.join(TMP, f'{theme_id}_{i}_en.mp3')
            zh_p = os.path.join(TMP, f'{theme_id}_{i}_zh.mp3')
            jobs.append(synth(w['sen'], EN, '-15%', en_p))
            jobs.append(synth(w.get('szh') or w['zh'], ZH, '-15%', zh_p))
            merges.append((en_p, zh_p, os.path.join(OUT, f'{theme_id}_{i}_s.mp3')))

    await asyncio.gather(*jobs)
    for en_p, zh_p, out_p in merges:
        merge(en_p, zh_p, out_p)
        os.remove(en_p); os.remove(zh_p)
    try:
        os.rmdir(TMP)
    except OSError:
        pass
    print(f'done: {theme_id} [{lo}..{hi}] -> {len(jobs)} clips, {len(merges)} merged')

asyncio.run(main())

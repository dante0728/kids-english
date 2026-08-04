# -*- coding: utf-8 -*-
"""
用 Edge TTS 神經網路語音批次合成所有語音。
英文：en-US-JennyNeural（清晰友善）、讚美語用 en-US-AnaNeural（童聲）
中文：zh-TW-HsiaoChenNeural
輸出到 assets/voice_edge/（例句英中分開），之後由 ffmpeg 合併成 _s.mp3
用法：python tools/gen_voice_edge.py
"""
import asyncio, json, os, sys
import edge_tts

EN_VOICE = 'en-US-JennyNeural'
EN_KID   = 'en-US-AnaNeural'
ZH_VOICE = 'zh-TW-HsiaoChenNeural'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice_edge')
os.makedirs(OUT, exist_ok=True)

sem = asyncio.Semaphore(5)

async def synth(text, voice, rate, path, retries=3):
    async with sem:
        for attempt in range(retries):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.getsize(path) > 500:
                    print('ok:', os.path.basename(path))
                    return
            except Exception as e:
                print('retry', attempt + 1, os.path.basename(path), repr(e)[:80])
                await asyncio.sleep(2 * (attempt + 1))
        raise RuntimeError('FAILED: ' + path)

async def main():
    with open(os.path.join(ROOT, 'tools', 'words.json'), encoding='utf-8') as f:
        themes = json.load(f)
    jobs = []
    for t in themes:
        for i, w in enumerate(t['words']):
            base = f"{t['id']}_{i}"
            jobs.append(synth(w['en'],  EN_VOICE, '-25%', os.path.join(OUT, base + '_w.mp3')))
            jobs.append(synth(w['sen'], EN_VOICE, '-15%', os.path.join(OUT, base + '_sen.mp3')))
            jobs.append(synth(w['szh'], ZH_VOICE, '-15%', os.path.join(OUT, base + '_szh.mp3')))
    for i, p in enumerate(['Great job!', 'Wonderful!', 'You did it!']):
        jobs.append(synth(p, EN_KID, '-10%', os.path.join(OUT, f'praise_{i}.mp3')))
    jobs.append(synth("Almost! Let's try again!", EN_KID, '-10%', os.path.join(OUT, 'try_again.mp3')))
    results = await asyncio.gather(*jobs, return_exceptions=True)
    fails = [r for r in results if isinstance(r, Exception)]
    print(f'done. total={len(jobs)} failed={len(fails)}')
    for f_ in fails[:10]:
        print('FAIL:', f_)
    sys.exit(1 if fails else 0)

asyncio.run(main())

# -*- coding: utf-8 -*-
"""
用 Edge TTS 產生寵物語音與中文單字語音。
寵物臺詞：zh-TW-HsiaoYuNeural rate=+8% -> assets/voice/pet_line_{i}.mp3
單字中文：zh-TW-HsiaoChenNeural rate=-10% -> assets/voice/{themeId}_{index}_z.mp3
用法：python tools/gen_voice_pet.py
"""
import asyncio, json, os, sys
import edge_tts

PET_VOICE = 'zh-TW-HsiaoYuNeural'
ZH_VOICE = 'zh-TW-HsiaoChenNeural'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')
os.makedirs(OUT, exist_ok=True)

PET_LINES = [
    '我好餓喔～給我點心吃嘛！',
    '陪我玩！我們去冒險吧！',
    '我想學英文！教教我嘛！',
    '嘿嘿，摸摸我～好舒服！',
    '今天也要一起加油喔！',
    '好開心！最喜歡你了！',
    '我要變得越來越強！',
    '哇！好好吃！謝謝你！',
    '耶！我升級了！',
    '哇！！我進化了！！好厲害！',
    '好想睡覺喔…呼嚕嚕…',
    '你答對好多題，好棒喔！',
]

sem = asyncio.Semaphore(5)

async def synth(text, voice, rate, path, retries=5):
    async with sem:
        for attempt in range(retries):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.getsize(path) > 1024:
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
    for i, line in enumerate(PET_LINES):
        jobs.append(synth(line, PET_VOICE, '+8%', os.path.join(OUT, f'pet_line_{i}.mp3')))
    for t in themes:
        for i, w in enumerate(t['words']):
            jobs.append(synth(w['zh'], ZH_VOICE, '-10%', os.path.join(OUT, f"{t['id']}_{i}_z.mp3")))
    results = await asyncio.gather(*jobs, return_exceptions=True)
    fails = [r for r in results if isinstance(r, Exception)]
    print(f'done. total={len(jobs)} failed={len(fails)}')
    for f_ in fails[:20]:
        print('FAIL:', f_)
    sys.exit(1 if fails else 0)

asyncio.run(main())

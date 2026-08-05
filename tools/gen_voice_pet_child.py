# -*- coding: utf-8 -*-
"""
寵物臺詞改用「兒童聲」重新合成。
Edge TTS 的中文語音中，只有 zh-CN-YunxiaNeural（雲夏）是真正的童聲模型
（Azure 分類 Cartoon/Cute）；zh-TW 三個都是成人聲。
另外產生 zh-CN-XiaoyiNeural（曉伊，活潑卡通女聲）對照樣本供挑選。

輸出：
  assets/voice/pet_line_{i}.mp3           正式採用的童聲
  assets/voice/_sample_{voice}_{i}.mp3    對照樣本（不進版控）
用法：python tools/gen_voice_pet_child.py
"""
import asyncio, os, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')
SAMPLE = os.path.join(ROOT, 'assets', '_voice_sample')

# 童聲：不額外拉高音調，靠模型本身的音色才自然
CHILD = {'voice': 'zh-CN-YunxiaNeural', 'rate': '+6%', 'pitch': '+0Hz'}
ALT = {'voice': 'zh-CN-XiaoyiNeural', 'rate': '+4%', 'pitch': '+0Hz'}

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

sem = asyncio.Semaphore(4)

async def synth(text, cfg, path, retries=5):
    async with sem:
        for attempt in range(retries):
            try:
                await edge_tts.Communicate(text, cfg['voice'],
                                           rate=cfg['rate'], pitch=cfg['pitch']).save(path)
                if os.path.getsize(path) > 1024:
                    print('ok:', os.path.basename(path))
                    return
            except Exception as e:
                print('retry', attempt + 1, os.path.basename(path), repr(e)[:70])
                await asyncio.sleep(2 * (attempt + 1))
        raise RuntimeError('FAILED: ' + path)

async def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SAMPLE, exist_ok=True)
    jobs = []
    # 正式：全部 12 句童聲
    for i, line in enumerate(PET_LINES):
        jobs.append(synth(line, CHILD, os.path.join(OUT, f'pet_line_{i}.mp3')))
    # 對照樣本：兩種聲音各挑 3 句
    for i in (0, 8, 9):
        jobs.append(synth(PET_LINES[i], CHILD, os.path.join(SAMPLE, f'A_雲夏童聲_{i}.mp3')))
        jobs.append(synth(PET_LINES[i], ALT, os.path.join(SAMPLE, f'B_曉伊活潑_{i}.mp3')))
    results = await asyncio.gather(*jobs, return_exceptions=True)
    fails = [r for r in results if isinstance(r, Exception)]
    print(f'done. total={len(jobs)} failed={len(fails)}')
    for f in fails[:5]:
        print('FAIL:', f)
    sys.exit(1 if fails else 0)

asyncio.run(main())

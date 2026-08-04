# -*- coding: utf-8 -*-
"""
離線合成所有遊戲音效與背景音樂。
與 js/audio.js 的即時合成引擎參數一致，輸出：
  assets/sfx_wav/*.wav  →（由 gen_all.ps1 轉成）assets/sfx/*.mp3
  assets/bgm.wav        背景音樂無縫循環檔
用法：python tools/gen_sfx.py
"""
import math, wave, struct, os, random

SR = 22050
random.seed(42)

def new_buf(seconds):
    return [0.0] * int(SR * seconds)

def tone(buf, f0, f1=None, t=0.2, type='sine', v=0.25, delay=0.0, vib=0.0, vr=8.0, wrap=False):
    f1 = f1 if f1 else f0
    n0 = int(delay * SR); n = int(t * SR)
    ph = 0.0
    L = len(buf)
    for i in range(n):
        x = i / SR
        f = f0 * (max(f1, 1) / f0) ** (x / t) + vib * math.sin(2 * math.pi * vr * x)
        ph += f / SR
        if type == 'sine':
            s = math.sin(2 * math.pi * ph)
        elif type == 'square':
            s = 1.0 if math.sin(2 * math.pi * ph) >= 0 else -1.0
        elif type == 'sawtooth':
            s = 2.0 * (ph % 1.0) - 1.0
        else:  # triangle
            p = ph % 1.0
            s = 4 * p - 1 if p < 0.5 else 3 - 4 * p
        env = v * (x / 0.02) if x < 0.02 else v * (0.0001 / v) ** ((x - 0.02) / max(t - 0.02, 1e-4))
        idx = n0 + i
        if wrap:
            buf[idx % L] += s * env
        elif idx < L:
            buf[idx] += s * env

def noise(buf, t=0.2, f=1000, f1=None, q=1.0, v=0.3, delay=0.0, hp=False):
    n0 = int(delay * SR); n = int(t * SR)
    x1 = x2 = y1 = y2 = 0.0
    L = len(buf)
    for i in range(n):
        xt = i / SR
        ff = f if not f1 else f * (f1 / f) ** (xt / t)
        w0 = 2 * math.pi * ff / SR
        alpha = math.sin(w0) / (2 * q); cosw = math.cos(w0)
        if hp:
            b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2
        else:
            b0 = alpha; b1 = 0.0; b2 = -alpha
        a0 = 1 + alpha; a1 = -2 * cosw; a2 = 1 - alpha
        xin = random.random() * 2 - 1
        y = (b0 * xin + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, xin; y2, y1 = y1, y
        env = v * (xt / 0.02) if xt < 0.02 else v * (0.0001 / v) ** ((xt - 0.02) / max(t - 0.02, 1e-4))
        idx = n0 + i
        if idx < L:
            buf[idx] += y * env

def write_wav(path, buf):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        frames = bytearray()
        for s in buf:
            s = math.tanh(s * 1.2)          # 柔性限幅避免爆音
            frames += struct.pack('<h', int(s * 32000))
        w.writeframes(bytes(frames))

# ---------- 音效定義（同 js/audio.js） ----------
def sfx_horn(b):
    tone(b, 440, t=.25, type='square', v=.2); tone(b, 349, t=.25, type='square', v=.2)
    tone(b, 440, t=.3, type='square', v=.2, delay=.35); tone(b, 349, t=.3, type='square', v=.2, delay=.35)
def sfx_engine(b):
    tone(b, 85, t=.9, type='sawtooth', v=.3, vib=18, vr=28); noise(b, t=.9, f=220, q=2, v=.12)
def sfx_train(b):
    for i in range(4): noise(b, t=.1, f=500, q=1.5, v=.25, delay=i * .18)
    tone(b, 660, t=.45, type='triangle', v=.22, delay=.8, vib=12, vr=10)
    tone(b, 550, t=.45, type='triangle', v=.18, delay=.8)
def sfx_plane(b):
    noise(b, t=1.1, f=350, f1=1400, q=2, v=.28); tone(b, 200, 500, t=1.1, type='sawtooth', v=.12)
def sfx_boat(b):
    tone(b, 110, t=.8, type='sawtooth', v=.28); tone(b, 92, t=.8, type='sawtooth', v=.22)
def sfx_bell(b):
    tone(b, 1400, t=.12, type='triangle', v=.3); tone(b, 1400, t=.18, type='triangle', v=.3, delay=.16)
def sfx_siren(b):
    tone(b, 700, 1000, t=.35, v=.25); tone(b, 1000, 700, t=.35, v=.25, delay=.35)
    tone(b, 700, 1000, t=.35, v=.25, delay=.7)
def sfx_heli(b):
    for i in range(9): noise(b, t=.05, f=300, q=2, v=.3, delay=i * .1)
def sfx_rocket(b):
    noise(b, t=1, f=200, f1=2200, q=1, v=.3); tone(b, 120, 900, t=1, type='sawtooth', v=.12)
def sfx_woof(b):
    noise(b, t=.13, f=320, f1=150, q=4, v=.4); tone(b, 220, 120, t=.13, type='sawtooth', v=.25)
    noise(b, t=.13, f=320, f1=150, q=4, v=.4, delay=.25); tone(b, 220, 120, t=.13, type='sawtooth', v=.25, delay=.25)
def sfx_meow(b):
    tone(b, 500, 950, t=.22, type='sawtooth', v=.16, vib=25, vr=14)
    tone(b, 950, 420, t=.32, type='sawtooth', v=.16, vib=25, vr=14, delay=.22)
def sfx_moo(b):
    tone(b, 190, 120, t=.75, type='sawtooth', v=.25, vib=12, vr=9)
def sfx_oink(b):
    noise(b, t=.09, f=420, q=6, v=.35); tone(b, 210, 140, t=.09, type='square', v=.12)
    noise(b, t=.09, f=420, q=6, v=.35, delay=.2); tone(b, 210, 140, t=.09, type='square', v=.12, delay=.2)
def sfx_neigh(b):
    tone(b, 900, 380, t=.6, type='sawtooth', v=.16, vib=70, vr=22)
def sfx_baa(b):
    tone(b, 520, 460, t=.55, type='sawtooth', v=.16, vib=45, vr=16)
def sfx_quack(b):
    tone(b, 360, 240, t=.12, type='square', v=.2); tone(b, 360, 240, t=.12, type='square', v=.2, delay=.2)
def sfx_cluck(b):
    for i in range(3): tone(b, 620, 380, t=.07, type='square', v=.16, delay=i * .14)
def sfx_tweet(b):
    tone(b, 2100, 2700, t=.09, v=.2); tone(b, 2500, 3100, t=.09, v=.2, delay=.15)
    tone(b, 2200, 2900, t=.1, v=.2, delay=.3)
def sfx_ribbit(b):
    tone(b, 160, 95, t=.16, type='sawtooth', v=.25, vib=30, vr=30)
    tone(b, 160, 95, t=.16, type='sawtooth', v=.25, vib=30, vr=30, delay=.25)
def sfx_hiss(b):
    noise(b, t=.7, f=4200, q=.8, v=.2, hp=True)
def sfx_roar(b):
    noise(b, t=.8, f=260, q=.9, v=.35); tone(b, 130, 80, t=.8, type='sawtooth', v=.28, vib=15, vr=12)
def sfx_growl(b):
    noise(b, t=.5, f=200, q=1.2, v=.3); tone(b, 100, 70, t=.5, type='sawtooth', v=.25, vib=10, vr=15)
def sfx_trumpet(b):
    tone(b, 320, 650, t=.5, type='sawtooth', v=.22, vib=35, vr=12)
    tone(b, 640, 900, t=.25, type='sawtooth', v=.18, delay=.5)
def sfx_squeak(b):
    for i in range(3): tone(b, 1300, 1900, t=.1, v=.2, delay=i * .16)
def sfx_pop(b):
    tone(b, 420, 160, t=.13, type='square', v=.22)
def sfx_ding(b):
    tone(b, 880, t=.3, type='triangle', v=.25); tone(b, 1320, t=.3, type='triangle', v=.15, delay=.05)
def sfx_boing(b):
    tone(b, 320, 95, t=.4, type='sawtooth', v=.2, vib=55, vr=20)
def sfx_whoosh(b):
    noise(b, t=.5, f=500, f1=3000, q=1, v=.25)
def sfx_magic(b):
    for i, f in enumerate([800, 1050, 1320, 1680]): tone(b, f, t=.18, type='triangle', v=.18, delay=i * .1)
def sfx_fanfare(b):
    for i, f in enumerate([523, 659, 784, 1046]): tone(b, f, t=.22, type='triangle', v=.22, delay=i * .13)
def sfx_zap(b):
    tone(b, 1300, 90, t=.28, type='square', v=.2)
def sfx_power(b):
    tone(b, 200, 850, t=.4, type='sawtooth', v=.18); tone(b, 1100, t=.2, type='triangle', v=.2, delay=.4)
def sfx_clang(b):
    tone(b, 920, t=.45, type='square', v=.16); tone(b, 1370, t=.3, type='square', v=.1)
def sfx_robot(b):
    for i, f in enumerate([320, 520, 410]): tone(b, f, t=.1, type='square', v=.18, delay=i * .15)
def sfx_knock(b):
    noise(b, t=.07, f=160, q=7, v=.4); noise(b, t=.07, f=160, q=7, v=.4, delay=.2)
def sfx_tick(b):
    tone(b, 1050, t=.04, type='square', v=.15); tone(b, 850, t=.04, type='square', v=.15, delay=.3)
def sfx_jingle(b):
    tone(b, 2000, t=.09, type='triangle', v=.2); tone(b, 2450, t=.09, type='triangle', v=.2, delay=.11)
    tone(b, 2000, t=.12, type='triangle', v=.2, delay=.22)
def sfx_ring(b):
    for i in range(6): tone(b, 1150 if i % 2 else 1350, t=.06, type='triangle', v=.18, delay=i * .07)
    for i in range(6): tone(b, 1150 if i % 2 else 1350, t=.06, type='triangle', v=.18, delay=.6 + i * .07)
def sfx_snip(b):
    noise(b, t=.05, f=3200, q=3, v=.3); noise(b, t=.05, f=3200, q=3, v=.3, delay=.15)
def sfx_brush(b):
    for i in range(3): noise(b, t=.12, f=2200, q=1, v=.2, delay=i * .18)
def sfx_bubble(b):
    for i, f in enumerate([300, 420, 560]): tone(b, f, f * 1.6, t=.12, v=.2, delay=i * .15)
def sfx_yay(b):
    for i, f in enumerate([523, 659, 784, 1046, 1318]): tone(b, f, t=.18, type='triangle', v=.22, delay=i * .09)
def sfx_wrong(b):
    tone(b, 300, 200, t=.3, type='square', v=.15)

SFX = {  # name: (builder, 總長秒數)
    'horn': (sfx_horn, .8), 'engine': (sfx_engine, 1.0), 'train': (sfx_train, 1.35),
    'plane': (sfx_plane, 1.2), 'boat': (sfx_boat, .9), 'bell': (sfx_bell, .5),
    'siren': (sfx_siren, 1.15), 'heli': (sfx_heli, 1.0), 'rocket': (sfx_rocket, 1.1),
    'woof': (sfx_woof, .6), 'meow': (sfx_meow, .7), 'moo': (sfx_moo, .9),
    'oink': (sfx_oink, .5), 'neigh': (sfx_neigh, .7), 'baa': (sfx_baa, .7),
    'quack': (sfx_quack, .5), 'cluck': (sfx_cluck, .55), 'tweet': (sfx_tweet, .5),
    'ribbit': (sfx_ribbit, .55), 'hiss': (sfx_hiss, .8), 'roar': (sfx_roar, .9),
    'growl': (sfx_growl, .6), 'trumpet': (sfx_trumpet, .85), 'squeak': (sfx_squeak, .6),
    'pop': (sfx_pop, .3), 'ding': (sfx_ding, .5), 'boing': (sfx_boing, .5),
    'whoosh': (sfx_whoosh, .6), 'magic': (sfx_magic, .7), 'fanfare': (sfx_fanfare, .8),
    'zap': (sfx_zap, .4), 'power': (sfx_power, .7), 'clang': (sfx_clang, .5),
    'robot': (sfx_robot, .6), 'knock': (sfx_knock, .4), 'tick': (sfx_tick, .45),
    'jingle': (sfx_jingle, .45), 'ring': (sfx_ring, 1.1), 'snip': (sfx_snip, .3),
    'brush': (sfx_brush, .6), 'bubble': (sfx_bubble, .6),
    'yay': (sfx_yay, .75), 'wrong': (sfx_wrong, .4),
}

def gen_bgm(path):
    """輕快五聲音階循環，長度剛好 16 拍可無縫接回開頭"""
    MELODY = [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 587, 523, 440, 392]
    BASS = [131, 131, 175, 175, 196, 196, 147, 147]
    STEP = 0.28
    buf = new_buf(16 * STEP)
    for i, m in enumerate(MELODY):
        tone(buf, m, t=.24, type='triangle', v=.5, delay=i * STEP, wrap=True)
        if i % 2 == 0:
            tone(buf, BASS[(i // 2) % len(BASS)], t=.5, v=.35, delay=i * STEP, wrap=True)
    write_wav(path, buf)

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, 'assets', 'sfx_wav')
    os.makedirs(out, exist_ok=True)
    for name, (fn, dur) in SFX.items():
        buf = new_buf(dur + 0.12)
        fn(buf)
        write_wav(os.path.join(out, name + '.wav'), buf)
        print('sfx:', name)
    gen_bgm(os.path.join(root, 'assets', 'bgm.wav'))
    print('bgm: done')

if __name__ == '__main__':
    main()

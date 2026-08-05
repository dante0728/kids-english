# -*- coding: utf-8 -*-
"""
手繪 30 個超級英雄卡通頭像 SVG（配合 OpenMoji 的粗線條扁平風格）。
原創簡化造型，非官方素材。輸出：assets/img/heroes_{i}.svg
用法：python tools/gen_hero_svg.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')
os.makedirs(OUT, exist_ok=True)

# 共用樣式：粗黑外框、圓角（OpenMoji 風）
S = 'stroke="#1a1a1a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"'
Sthin = 'stroke="#1a1a1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'

def wrap(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">'
            + body + '</svg>')

def head(fill, cy=168, r=100):
    return f'<circle cx="160" cy="{cy}" r="{r}" fill="{fill}" {S}/>'

HEROES = []

# 0 Iron Man：紅盔金面甲、發光眼
HEROES.append(wrap(
    head('#c8102e') +
    f'<rect x="100" y="112" width="120" height="140" rx="42" fill="#f2a900" {S}/>' +
    f'<rect x="116" y="152" width="34" height="14" rx="7" fill="#7fd8ff" {Sthin}/>' +
    f'<rect x="170" y="152" width="34" height="14" rx="7" fill="#7fd8ff" {Sthin}/>' +
    f'<line x1="136" y1="216" x2="184" y2="216" {Sthin}/>'
))
# 1 Spider-Man：紅面罩、大白眼、蛛網線
HEROES.append(wrap(
    head('#d22030') +
    f'<path d="M60 168 H260 M160 68 V268 M92 100 Q160 150 228 100 M92 236 Q160 186 228 236" fill="none" stroke="#1a1a1a" stroke-width="4"/>' +
    f'<path d="M92 150 Q125 130 150 158 Q140 190 108 184 Q88 170 92 150 Z" fill="#fff" {S}/>' +
    f'<path d="M228 150 Q195 130 170 158 Q180 190 212 184 Q232 170 228 150 Z" fill="#fff" {S}/>'
))
# 2 Captain America：藍盔、白 A、小翅膀
HEROES.append(wrap(
    head('#0a3161') +
    f'<path d="M52 150 L88 138 L88 166 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M268 150 L232 138 L232 166 Z" fill="#fff" {Sthin}/>' +
    f'<circle cx="130" cy="170" r="12" fill="#fff"/>' +
    f'<circle cx="190" cy="170" r="12" fill="#fff"/>' +
    f'<text x="160" y="140" font-family="Arial Black,Arial" font-size="64" font-weight="900" fill="#fff" text-anchor="middle">A</text>' +
    f'<path d="M132 218 Q160 236 188 218" fill="none" {S}/>'
))
# 3 Hulk：綠臉、黑髮、皺眉
HEROES.append(wrap(
    head('#4c9a2a') +
    f'<path d="M70 120 Q90 62 160 66 Q230 62 250 120 Q220 92 160 96 Q100 92 70 120 Z" fill="#173317" {S}/>' +
    f'<line x1="108" y1="146" x2="146" y2="158" {S}/>' +
    f'<line x1="212" y1="146" x2="174" y2="158" {S}/>' +
    f'<circle cx="126" cy="176" r="10" fill="#1a1a1a"/>' +
    f'<circle cx="194" cy="176" r="10" fill="#1a1a1a"/>' +
    f'<path d="M124 226 Q160 210 196 226" fill="none" {S}/>'
))
# 4 Thor：金髮、銀盔白翅、槌子
HEROES.append(wrap(
    f'<path d="M62 190 Q48 110 110 84 Q160 60 210 84 Q272 110 258 190 L232 250 Q160 280 88 250 Z" fill="#f2c14e" {S}/>' +
    f'<circle cx="160" cy="180" r="76" fill="#f6c99f" {S}/>' +
    f'<path d="M84 132 Q160 96 236 132 L236 108 Q160 76 84 108 Z" fill="#b0b7bf" {S}/>' +
    f'<path d="M74 128 L46 92 L84 100 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M246 128 L274 92 L236 100 Z" fill="#fff" {Sthin}/>' +
    f'<circle cx="132" cy="178" r="9" fill="#1a1a1a"/>' +
    f'<circle cx="188" cy="178" r="9" fill="#1a1a1a"/>' +
    f'<path d="M132 220 Q160 236 188 220" fill="none" {S}/>' +
    f'<rect x="236" y="216" width="52" height="38" rx="8" fill="#8d99ae" {S}/>' +
    f'<line x1="262" y1="254" x2="262" y2="292" {S}/>'
))
# 5 Black Panther：黑面罩、貓耳、銀眼
HEROES.append(wrap(
    f'<path d="M78 96 L60 46 L118 72 Z" fill="#20232a" {S}/>' +
    f'<path d="M242 96 L260 46 L202 72 Z" fill="#20232a" {S}/>' +
    head('#20232a') +
    f'<path d="M96 152 Q124 138 148 156 L140 176 Q116 184 100 168 Z" fill="#c0c6cf" {Sthin}/>' +
    f'<path d="M224 152 Q196 138 172 156 L180 176 Q204 184 220 168 Z" fill="#c0c6cf" {Sthin}/>' +
    f'<path d="M120 250 L136 236 L160 252 L184 236 L200 250" fill="none" stroke="#c0c6cf" stroke-width="7" stroke-linecap="round"/>'
))
# 6 Captain Marvel：藍盔金星、金色頭冠
HEROES.append(wrap(
    f'<path d="M150 40 Q160 20 170 40 L178 84 L142 84 Z" fill="#f2a900" {S}/>' +
    head('#1446a0') +
    f'<path d="M160 96 L172 128 L206 128 L179 148 L189 182 L160 162 L131 182 L141 148 L114 128 L148 128 Z" fill="#f2a900" {Sthin}/>' +
    f'<circle cx="126" cy="200" r="10" fill="#fff"/>' +
    f'<circle cx="194" cy="200" r="10" fill="#fff"/>' +
    f'<path d="M132 236 Q160 250 188 236" fill="none" stroke="#f2a900" stroke-width="8" stroke-linecap="round"/>'
))
# 7 Doctor Strange：白鬢黑髮、山羊鬍、紅高領、魔法圈
HEROES.append(wrap(
    f'<path d="M56 246 L96 196 L120 260 Z" fill="#a4243b" {S}/>' +
    f'<path d="M264 246 L224 196 L200 260 Z" fill="#a4243b" {S}/>' +
    head('#f6c99f') +
    f'<path d="M66 160 Q70 78 160 74 Q250 78 254 160 Q244 108 160 104 Q76 108 66 160 Z" fill="#20232a" {S}/>' +
    f'<path d="M70 150 Q80 122 96 112 L100 148 Z" fill="#d9d9d9" {Sthin}/>' +
    f'<path d="M250 150 Q240 122 224 112 L220 148 Z" fill="#d9d9d9" {Sthin}/>' +
    f'<circle cx="128" cy="172" r="9" fill="#1a1a1a"/>' +
    f'<circle cx="192" cy="172" r="9" fill="#1a1a1a"/>' +
    f'<path d="M138 224 Q160 214 182 224 L172 248 Q160 256 148 248 Z" fill="#20232a" {Sthin}/>' +
    f'<circle cx="160" cy="292" r="18" fill="none" stroke="#ffb703" stroke-width="8"/>'
))
# 8 Hawkeye：紫色眼罩、弓
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M62 150 Q160 120 258 150 L258 186 Q160 158 62 186 Z" fill="#5f2a84" {S}/>' +
    f'<circle cx="126" cy="164" r="11" fill="#fff" {Sthin}/>' +
    f'<circle cx="194" cy="164" r="11" fill="#fff" {Sthin}/>' +
    f'<path d="M60 96 Q94 60 140 58 Q100 74 84 100 Z" fill="#3d1f56" {Sthin}/>' +
    f'<path d="M260 96 Q226 60 180 58 Q220 74 236 100 Z" fill="#3d1f56" {Sthin}/>' +
    f'<path d="M128 226 Q160 240 192 226" fill="none" {S}/>' +
    f'<path d="M250 210 Q290 250 250 290" fill="none" stroke="#5f2a84" stroke-width="8" stroke-linecap="round"/>' +
    f'<line x1="252" y1="212" x2="252" y2="288" stroke="#5f2a84" stroke-width="5"/>'
))
# 9 Ant-Man：紅盔、銀面環、觸角
HEROES.append(wrap(
    f'<path d="M110 70 Q84 34 60 40" fill="none" {S}/><circle cx="58" cy="38" r="12" fill="#b0b7bf" {Sthin}/>' +
    f'<path d="M210 70 Q236 34 260 40" fill="none" {S}/><circle cx="262" cy="38" r="12" fill="#b0b7bf" {Sthin}/>' +
    head('#c8102e') +
    f'<path d="M160 88 Q244 96 244 176 Q244 252 160 258 Q76 252 76 176 Q76 96 160 88 Z" fill="none" stroke="#b0b7bf" stroke-width="14"/>' +
    f'<rect x="106" y="150" width="44" height="20" rx="10" fill="#b0b7bf" {Sthin}/>' +
    f'<rect x="170" y="150" width="44" height="20" rx="10" fill="#b0b7bf" {Sthin}/>' +
    f'<line x1="134" y1="216" x2="186" y2="216" {S}/>'
))
# 10 Groot：樹皮臉、樹葉
HEROES.append(wrap(
    f'<path d="M120 60 Q112 28 132 20 M150 56 Q150 24 170 18 M196 62 Q200 30 220 28" fill="none" stroke="#5a3d2b" stroke-width="10" stroke-linecap="round"/>' +
    f'<ellipse cx="128" cy="26" rx="16" ry="10" fill="#6a994e" {Sthin} transform="rotate(-30 128 26)"/>' +
    f'<ellipse cx="214" cy="30" rx="16" ry="10" fill="#6a994e" {Sthin} transform="rotate(25 214 30)"/>' +
    f'<path d="M100 80 Q160 52 220 80 Q252 130 240 200 Q228 262 160 272 Q92 262 80 200 Q68 130 100 80 Z" fill="#8b5e3c" {S}/>' +
    f'<path d="M112 110 Q120 150 108 190 M208 110 Q200 150 212 190 M160 96 L160 128" fill="none" stroke="#5a3d2b" stroke-width="7" stroke-linecap="round"/>' +
    f'<circle cx="132" cy="170" r="12" fill="#1a1a1a"/><circle cx="188" cy="170" r="12" fill="#1a1a1a"/>' +
    f'<path d="M136 224 Q160 238 184 224" fill="none" {S}/>'
))
# 11 Rocket：浣熊
HEROES.append(wrap(
    f'<path d="M92 92 L64 40 L128 62 Z" fill="#6d6d6d" {S}/>' +
    f'<path d="M228 92 L256 40 L192 62 Z" fill="#6d6d6d" {S}/>' +
    head('#9a9a9a') +
    f'<path d="M92 140 Q126 120 152 146 L146 178 Q112 188 94 166 Z" fill="#4a3728" {Sthin}/>' +
    f'<path d="M228 140 Q194 120 168 146 L174 178 Q208 188 226 166 Z" fill="#4a3728" {Sthin}/>' +
    f'<circle cx="122" cy="156" r="9" fill="#fff"/><circle cx="198" cy="156" r="9" fill="#fff"/>' +
    f'<ellipse cx="160" cy="218" rx="46" ry="34" fill="#e8e0d5" {Sthin}/>' +
    f'<ellipse cx="160" cy="204" rx="14" ry="10" fill="#1a1a1a"/>' +
    f'<path d="M160 214 L160 230 M160 230 Q146 242 134 234 M160 230 Q174 242 186 234" fill="none" {Sthin}/>'
))
# 12 Wolverine：黃色尖耳面罩、黑側板
HEROES.append(wrap(
    f'<path d="M96 118 L70 34 L136 92 Z" fill="#ffb703" {S}/>' +
    f'<path d="M224 118 L250 34 L184 92 Z" fill="#ffb703" {S}/>' +
    head('#ffb703') +
    f'<path d="M96 118 Q70 160 82 214 L120 190 L128 132 Z" fill="#20232a" {Sthin}/>' +
    f'<path d="M224 118 Q250 160 238 214 L200 190 L192 132 Z" fill="#20232a" {Sthin}/>' +
    f'<path d="M118 150 L150 162 L144 184 L114 172 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M202 150 L170 162 L176 184 L206 172 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M132 226 L188 226" {S}/>' +
    f'<path d="M256 216 L292 180 M266 232 L302 196 M274 250 L310 214" stroke="#b0b7bf" stroke-width="8" stroke-linecap="round"/>'
))
# 13 Superman：黑髮 S 捲、S 盾
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 150 Q64 76 160 72 Q256 76 256 150 Q236 104 160 100 Q120 100 96 118 Q102 134 92 146 Q80 158 64 150 Z" fill="#20232a" {S}/>' +
    f'<path d="M150 96 Q160 110 150 122 Q142 130 134 122" fill="none" {Sthin}/>' +
    f'<circle cx="128" cy="172" r="9" fill="#1a1a1a"/><circle cx="192" cy="172" r="9" fill="#1a1a1a"/>' +
    f'<path d="M130 222 Q160 240 190 222" fill="none" {S}/>' +
    f'<path d="M160 258 L196 272 L160 308 L124 272 Z" fill="#c8102e" {Sthin}/>' +
    f'<text x="160" y="292" font-family="Arial Black,Arial" font-size="30" font-weight="900" fill="#f2a900" text-anchor="middle">S</text>'
))
# 14 Batman：灰臉黑面罩尖耳
HEROES.append(wrap(
    f'<path d="M100 106 L88 34 L136 84 Z" fill="#20232a" {S}/>' +
    f'<path d="M220 106 L232 34 L184 84 Z" fill="#20232a" {S}/>' +
    head('#6d6d6d') +
    f'<path d="M62 160 Q64 92 160 88 Q256 92 258 160 L258 176 Q220 196 160 194 Q100 196 62 176 Z" fill="#20232a" {S}/>' +
    f'<path d="M116 148 L150 156 L144 174 L112 166 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M204 148 L170 156 L176 174 L208 166 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M134 232 L186 232" {S}/>' +
    f'<ellipse cx="160" cy="284" rx="40" ry="18" fill="#f2a900" {Sthin}/>' +
    f'<path d="M136 284 Q148 274 154 282 L160 274 L166 282 Q172 274 184 284 Q172 292 160 288 Q148 292 136 284 Z" fill="#1a1a1a"/>'
))
# 15 Wonder Woman：黑髮、金冠紅星
HEROES.append(wrap(
    f'<path d="M64 200 Q48 96 160 66 Q272 96 256 200 Q262 252 238 278 Q244 210 236 170 L84 170 Q76 210 82 278 Q58 252 64 200 Z" fill="#20232a" {S}/>' +
    f'<circle cx="160" cy="180" r="82" fill="#f6c99f" {S}/>' +
    f'<path d="M86 148 Q160 120 234 148 L234 122 Q160 96 86 122 Z" fill="#f2a900" {S}/>' +
    f'<path d="M160 108 L166 124 L182 124 L169 134 L174 150 L160 140 L146 150 L151 134 L138 124 L154 124 Z" fill="#c8102e" {Sthin}/>' +
    f'<circle cx="132" cy="186" r="9" fill="#1a1a1a"/><circle cx="188" cy="186" r="9" fill="#1a1a1a"/>' +
    f'<path d="M134 226 Q160 242 186 226" fill="none" {S}/>'
))
# 16 The Flash：紅盔金閃電
HEROES.append(wrap(
    head('#c8102e') +
    f'<path d="M84 132 L54 112 L74 148 L48 146 L82 168 Z" fill="#f2a900" {Sthin}/>' +
    f'<path d="M236 132 L266 112 L246 148 L272 146 L238 168 Z" fill="#f2a900" {Sthin}/>' +
    f'<circle cx="128" cy="164" r="12" fill="#fff" {Sthin}/>' +
    f'<circle cx="192" cy="164" r="12" fill="#fff" {Sthin}/>' +
    f'<path d="M172 196 L146 232 L162 232 L150 264 L184 224 L166 224 Z" fill="#f2a900" {Sthin}/>'
))
# 17 Aquaman：金髮鬍、三叉戟
HEROES.append(wrap(
    f'<path d="M62 210 Q46 90 160 64 Q274 90 258 210 Q250 258 224 274 Q238 200 230 160 L90 160 Q82 200 96 274 Q70 258 62 210 Z" fill="#f2c14e" {S}/>' +
    f'<circle cx="160" cy="180" r="78" fill="#f6c99f" {S}/>' +
    f'<circle cx="132" cy="172" r="9" fill="#1a1a1a"/><circle cx="188" cy="172" r="9" fill="#1a1a1a"/>' +
    f'<path d="M122 218 Q136 208 150 216 Q160 224 170 216 Q184 208 198 218 Q192 244 160 246 Q128 244 122 218 Z" fill="#e0a93e" {Sthin}/>' +
    f'<line x1="268" y1="170" x2="268" y2="292" stroke="#f2a900" stroke-width="9" stroke-linecap="round"/>' +
    f'<path d="M248 196 Q248 162 268 152 Q288 162 288 196 M268 152 L268 196" fill="none" stroke="#f2a900" stroke-width="8" stroke-linecap="round"/>'
))
# 18 Green Lantern：綠眼罩、綠戒
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 130 Q64 84 160 80 Q256 84 256 130 Q220 106 160 106 Q100 106 64 130 Z" fill="#5a3d2b" {S}/>' +
    f'<path d="M88 148 Q160 128 232 148 Q240 176 224 190 Q196 176 176 182 Q166 170 154 182 Q124 176 96 190 Q80 176 88 148 Z" fill="#2a9d3f" {S}/>' +
    f'<circle cx="126" cy="164" r="11" fill="#fff"/>' +
    f'<circle cx="194" cy="164" r="11" fill="#fff"/>' +
    f'<path d="M130 226 Q160 242 190 226" fill="none" {S}/>' +
    f'<circle cx="252" cy="270" r="20" fill="none" stroke="#2a9d3f" stroke-width="12"/>' +
    f'<circle cx="252" cy="270" r="34" fill="none" stroke="#7ae582" stroke-width="4" stroke-dasharray="6 10"/>'
))
# 19 Cyborg：半機械臉、紅眼
HEROES.append(wrap(
    head('#8d5524') +
    f'<path d="M160 68 Q256 72 260 168 Q256 264 160 268 Z" fill="#b0b7bf" {S}/>' +
    f'<path d="M160 68 Q120 70 96 92 L96 120 Q130 104 160 104 Z" fill="#20232a" {Sthin}/>' +
    f'<circle cx="122" cy="170" r="10" fill="#1a1a1a"/>' +
    f'<circle cx="206" cy="166" r="20" fill="#c8102e" {Sthin}/>' +
    f'<circle cx="206" cy="166" r="7" fill="#ff8fa3"/>' +
    f'<path d="M186 220 Q200 232 220 228 M186 246 L224 246" fill="none" {Sthin}/>' +
    f'<path d="M122 226 Q140 238 158 230" fill="none" {S}/>'
))

# 20 Loki 洛基：綠衣金飾、金色雙角頭盔、黑髮、狡黠微笑
HEROES.append(wrap(
    f'<path d="M112 96 Q70 56 78 12 Q112 48 132 84 Z" fill="#f2a900" {S}/>' +
    f'<path d="M208 96 Q250 56 242 12 Q208 48 188 84 Z" fill="#f2a900" {S}/>' +
    head('#f6c99f') +
    f'<path d="M62 176 Q58 84 160 78 Q262 84 258 176 Q244 118 160 114 Q76 118 62 176 Z" fill="#20232a" {S}/>' +
    f'<path d="M84 136 Q160 102 236 136 L232 158 Q160 124 88 158 Z" fill="#f2a900" {S}/>' +
    f'<circle cx="128" cy="184" r="9" fill="#1a1a1a"/><circle cx="192" cy="184" r="9" fill="#1a1a1a"/>' +
    f'<path d="M130 228 Q160 246 192 220" fill="none" {S}/>' +
    f'<path d="M70 268 Q160 240 250 268 L250 312 Q160 284 70 312 Z" fill="#2a7d4f" {Sthin}/>' +
    f'<path d="M124 282 L160 262 L196 282" fill="none" stroke="#f2a900" stroke-width="7" stroke-linecap="round"/>'
))
# 21 Vision 幻視：紅臉、額頭黃寶石、金色頭飾、綠披肩
HEROES.append(wrap(
    f'<path d="M52 250 L96 200 L120 268 Z" fill="#2a7d4f" {S}/>' +
    f'<path d="M268 250 L224 200 L200 268 Z" fill="#2a7d4f" {S}/>' +
    head('#c8102e') +
    f'<path d="M70 140 Q78 76 160 72 Q242 76 250 140 Q232 104 160 100 Q88 104 70 140 Z" fill="#f2a900" {S}/>' +
    f'<path d="M64 172 L98 148 L98 196 Z" fill="#f2a900" {Sthin}/>' +
    f'<path d="M256 172 L222 148 L222 196 Z" fill="#f2a900" {Sthin}/>' +
    f'<circle cx="160" cy="134" r="34" fill="none" stroke="#ffd60a" stroke-width="4" stroke-dasharray="6 9"/>' +
    f'<circle cx="160" cy="134" r="21" fill="#ffd60a" {Sthin}/>' +
    f'<circle cx="160" cy="134" r="9" fill="#fff8c4"/>' +
    f'<circle cx="128" cy="190" r="10" fill="#fff"/><circle cx="192" cy="190" r="10" fill="#fff"/>' +
    f'<path d="M132 234 Q160 248 188 234" fill="none" {S}/>'
))
# 22 Scarlet Witch 緋紅女巫：紅衣、深紅長髮、紅色頭飾、紅色魔法光暈
HEROES.append(wrap(
    f'<path d="M62 206 Q46 96 160 66 Q274 96 258 206 Q264 258 240 284 Q246 214 238 172 L82 172 Q74 214 80 284 Q56 258 62 206 Z" fill="#7a1220" {S}/>' +
    f'<circle cx="160" cy="180" r="80" fill="#f6c99f" {S}/>' +
    f'<path d="M96 132 L120 96 L140 126 L160 88 L180 126 L200 96 L224 132 Q160 108 96 132 Z" fill="#c8102e" {Sthin}/>' +
    f'<circle cx="132" cy="182" r="9" fill="#1a1a1a"/><circle cx="188" cy="182" r="9" fill="#1a1a1a"/>' +
    f'<path d="M134 224 Q160 240 186 224" fill="none" {S}/>' +
    f'<circle cx="48" cy="268" r="24" fill="#e63946" opacity="0.85" {Sthin}/>' +
    f'<circle cx="48" cy="268" r="36" fill="none" stroke="#ff8fa3" stroke-width="4" stroke-dasharray="6 10"/>' +
    f'<circle cx="272" cy="268" r="24" fill="#e63946" opacity="0.85" {Sthin}/>' +
    f'<circle cx="272" cy="268" r="36" fill="none" stroke="#ff8fa3" stroke-width="4" stroke-dasharray="6 10"/>'
))
# 23 Falcon 獵鷹：紅白配色、護目鏡、灰白機械翅膀
HEROES.append(wrap(
    f'<path d="M104 108 Q46 100 22 156 Q56 138 96 148 Q46 168 30 216 Q70 180 108 186 Z" fill="#e9ecef" {S}/>' +
    f'<path d="M216 108 Q274 100 298 156 Q264 138 224 148 Q274 168 290 216 Q250 180 212 186 Z" fill="#e9ecef" {S}/>' +
    head('#c8102e') +
    f'<path d="M64 158 Q64 86 160 82 Q256 86 256 158 Q220 118 160 118 Q100 118 64 158 Z" fill="#e9ecef" {S}/>' +
    f'<path d="M74 154 Q160 132 246 154 L246 190 Q160 168 74 190 Z" fill="#20232a" {S}/>' +
    f'<ellipse cx="124" cy="166" rx="22" ry="13" fill="#7fd8ff" {Sthin}/>' +
    f'<ellipse cx="196" cy="166" rx="22" ry="13" fill="#7fd8ff" {Sthin}/>' +
    f'<path d="M132 230 Q160 246 188 230" fill="none" {S}/>'
))
# 24 Star-Lord 星爵：紅色長外套、銀色面罩紅眼罩、棕髮
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 148 Q64 74 160 70 Q256 74 256 148 Q232 104 160 104 Q88 104 64 148 Z" fill="#6b4423" {S}/>' +
    f'<path d="M66 152 Q160 126 254 152 L250 198 Q160 174 70 198 Z" fill="#b0b7bf" {S}/>' +
    f'<path d="M84 158 Q160 138 236 158 L234 182 Q160 162 86 182 Z" fill="#c8102e" {Sthin}/>' +
    f'<circle cx="126" cy="166" r="9" fill="#ff8fa3"/><circle cx="194" cy="166" r="9" fill="#ff8fa3"/>' +
    f'<path d="M132 230 Q160 246 188 230" fill="none" {S}/>' +
    f'<path d="M70 268 Q160 244 250 268 L250 312 Q160 288 70 312 Z" fill="#a4243b" {S}/>' +
    f'<path d="M160 262 L160 312" stroke="#7a1220" stroke-width="6" stroke-linecap="round"/>'
))
# 25 Robin 羅賓：紅綠黃配色、黑眼罩、黑短髮、胸前 R
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 140 Q68 72 160 68 Q252 72 256 140 Q228 100 160 100 Q92 100 64 140 Z" fill="#20232a" {S}/>' +
    f'<path d="M74 150 Q160 128 246 150 L246 184 Q160 162 74 184 Z" fill="#1a1a1a" {S}/>' +
    f'<circle cx="126" cy="162" r="11" fill="#fff"/><circle cx="194" cy="162" r="11" fill="#fff"/>' +
    f'<path d="M130 228 Q160 244 190 228" fill="none" {S}/>' +
    f'<path d="M64 272 Q160 246 256 272 L256 312 Q160 286 64 312 Z" fill="#f2a900" {S}/>' +
    f'<path d="M64 314 Q160 288 256 314" fill="none" stroke="#2a9d3f" stroke-width="9" stroke-linecap="round"/>' +
    f'<circle cx="160" cy="290" r="28" fill="#c8102e" {Sthin}/>' +
    f'<text x="160" y="304" font-family="Arial Black,Arial" font-size="32" font-weight="900" fill="#f2a900" text-anchor="middle">R</text>'
))
# 26 Supergirl 女超人：藍衣紅披風、金色長髮、胸前紅黃盾徽
HEROES.append(wrap(
    f'<path d="M62 210 Q46 90 160 64 Q274 90 258 210 Q250 258 224 274 Q238 200 230 160 L90 160 Q82 200 96 274 Q70 258 62 210 Z" fill="#f2c14e" {S}/>' +
    f'<circle cx="160" cy="180" r="78" fill="#f6c99f" {S}/>' +
    f'<circle cx="132" cy="174" r="9" fill="#1a1a1a"/><circle cx="188" cy="174" r="9" fill="#1a1a1a"/>' +
    f'<path d="M134 216 Q160 232 186 216" fill="none" {S}/>' +
    f'<path d="M54 306 L96 258 L122 320 Z" fill="#c8102e" {Sthin}/>' +
    f'<path d="M266 306 L224 258 L198 320 Z" fill="#c8102e" {Sthin}/>' +
    f'<path d="M96 268 Q160 248 224 268 L224 320 L96 320 Z" fill="#1446a0" {Sthin}/>' +
    f'<path d="M160 266 L194 280 L160 316 L126 280 Z" fill="#c8102e" {Sthin}/>' +
    f'<text x="160" y="300" font-family="Arial Black,Arial" font-size="30" font-weight="900" fill="#f2a900" text-anchor="middle">S</text>'
))
# 27 Green Arrow 綠箭俠：深綠連帽、綠色眼罩、金色鬍子、弓
HEROES.append(wrap(
    f'<path d="M60 202 Q46 84 160 58 Q274 84 260 202 Q252 252 226 272 Q240 196 232 154 L88 154 Q80 196 94 272 Q68 252 60 202 Z" fill="#1f6b3a" {S}/>' +
    f'<circle cx="160" cy="182" r="72" fill="#f6c99f" {S}/>' +
    f'<path d="M92 164 Q160 144 228 164 L226 192 Q160 172 94 192 Z" fill="#2a9d3f" {S}/>' +
    f'<circle cx="128" cy="174" r="9" fill="#fff"/><circle cx="192" cy="174" r="9" fill="#fff"/>' +
    f'<path d="M130 212 Q146 204 160 210 Q174 204 190 212 Q184 244 160 248 Q136 244 130 212 Z" fill="#f2c14e" {Sthin}/>' +
    f'<path d="M254 200 Q294 250 254 300" fill="none" stroke="#2a9d3f" stroke-width="9" stroke-linecap="round"/>' +
    f'<line x1="256" y1="202" x2="256" y2="298" stroke="#e9ecef" stroke-width="5"/>'
))
# 28 Shazam 沙贊：紅衣白披風、胸前金色閃電、黑髮
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 144 Q64 70 160 66 Q256 70 256 144 Q230 100 160 100 Q90 100 64 144 Z" fill="#20232a" {S}/>' +
    f'<circle cx="128" cy="176" r="9" fill="#1a1a1a"/><circle cx="192" cy="176" r="9" fill="#1a1a1a"/>' +
    f'<path d="M130 224 Q160 242 190 224" fill="none" {S}/>' +
    f'<path d="M48 302 L98 256 L126 320 Z" fill="#fff" {S}/>' +
    f'<path d="M272 302 L222 256 L194 320 Z" fill="#fff" {S}/>' +
    f'<path d="M98 268 Q160 248 222 268 L222 320 L98 320 Z" fill="#c8102e" {Sthin}/>' +
    f'<path d="M178 262 L142 302 L162 302 L150 320 L190 288 L168 288 Z" fill="#f2a900" {Sthin}/>'
))
# 29 Nightwing 夜翼：黑衣、胸前藍色鳥形紋、黑眼罩、黑髮
HEROES.append(wrap(
    head('#f6c99f') +
    f'<path d="M64 140 Q68 72 160 68 Q252 72 256 140 Q228 100 160 100 Q92 100 64 140 Z" fill="#20232a" {S}/>' +
    f'<path d="M74 150 Q160 128 246 150 L246 184 Q160 162 74 184 Z" fill="#1a1a1a" {S}/>' +
    f'<path d="M96 160 L134 168 L130 182 L94 174 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M224 160 L186 168 L190 182 L226 174 Z" fill="#fff" {Sthin}/>' +
    f'<path d="M132 230 L188 230" {S}/>' +
    f'<path d="M64 272 Q160 246 256 272 L256 320 L64 320 Z" fill="#20232a" {S}/>' +
    f'<path d="M160 280 Q126 270 94 294 Q132 288 150 302 L160 318 L170 302 Q188 288 226 294 Q194 270 160 280 Z" fill="#2f7fe0" {Sthin}/>'
))

def main():
    for i, svg in enumerate(HEROES):
        path = os.path.join(OUT, f'heroes_{i}.svg')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg)
        print('ok: heroes_%d' % i)
    print('done:', len(HEROES), 'hero SVGs')

if __name__ == '__main__':
    main()

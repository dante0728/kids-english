# -*- coding: utf-8 -*-
"""
30 位英雄的全身 Q 版動畫 SVG（星星商店/打怪獸用）。
粗黑邊扁平風、viewBox 320x460、CSS 動畫內嵌（<img> 載入也會動）。
輸出：assets/img/hero_full_{i}.svg（編號同 words.js 英雄關順序）
用法：python tools/gen_hero_fullbody.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')

S = 'stroke="#1a1a1a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'
St = 'stroke="#1a1a1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'

CSS = """
.bob{animation:bob 1.8s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-10px)}}
.hover{animation:hover 1.4s ease-in-out infinite}
@keyframes hover{50%{transform:translateY(-16px)}}
.cape{animation:flutter 2.2s ease-in-out infinite;transform-origin:160px 215px}
@keyframes flutter{50%{transform:skewX(7deg) scaleX(1.06)}}
.jet{animation:flick .28s infinite alternate;transform-origin:center bottom}
@keyframes flick{to{opacity:.45;transform:scaleY(.6)}}
.flex{animation:flex 1.2s ease-in-out infinite;transform-origin:160px 250px}
@keyframes flex{50%{transform:rotate(3deg) scale(1.04)}}
.webline{animation:webpulse 1.6s infinite}
@keyframes webpulse{50%{opacity:.35}}
.shield-arm{animation:shieldup 2s ease-in-out infinite;transform-origin:118px 250px}
@keyframes shieldup{50%{transform:rotate(-7deg)}}
.spin{animation:spin 3s linear infinite;transform-origin:var(--o)}
@keyframes spin{to{transform:rotate(360deg)}}
.zapflick{animation:zapflick .5s infinite alternate}
@keyframes zapflick{to{opacity:.2}}
.shrink{animation:shrink 2.4s ease-in-out infinite;transform-origin:160px 430px}
@keyframes shrink{50%{transform:scale(.72)}}
.sway{animation:sway 2.6s ease-in-out infinite;transform-origin:160px 300px}
@keyframes sway{50%{transform:skewX(-5deg)}}
.shimmer{animation:shimmer 1s infinite alternate}
@keyframes shimmer{to{opacity:.35}}
.speed{animation:speed .5s infinite}
@keyframes speed{50%{opacity:.15;transform:translateX(-14px)}}
.rise{animation:rise 2.4s linear infinite}
@keyframes rise{to{transform:translateY(-70px);opacity:0}}
.glowp{animation:glowp 1.3s ease-in-out infinite}
@keyframes glowp{50%{transform:scale(1.25);opacity:.6}}
.wag{animation:wag 1.5s ease-in-out infinite;transform-origin:220px 340px}
@keyframes wag{50%{transform:rotate(14deg)}}
"""

def svg(body, anim='bob'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 460">'
            f'<style>{CSS}</style><g class="{anim}">{body}</g></svg>')

# ---------- 共用零件 ----------
def legs(c, boot=None):
    b = boot or c
    return (f'<rect x="124" y="340" width="30" height="80" rx="15" fill="{c}" {S}/>'
            f'<rect x="166" y="340" width="30" height="80" rx="15" fill="{c}" {S}/>'
            f'<rect x="120" y="400" width="38" height="22" rx="11" fill="{b}" {St}/>'
            f'<rect x="162" y="400" width="38" height="22" rx="11" fill="{b}" {St}/>')

def arms(c, rot=18):
    return (f'<rect x="76" y="238" width="30" height="86" rx="15" fill="{c}" {S} transform="rotate({rot} 91 245)"/>'
            f'<rect x="214" y="238" width="30" height="86" rx="15" fill="{c}" {S} transform="rotate({-rot} 229 245)"/>')

def arm_left(c, rot=18):
    return f'<rect x="76" y="238" width="30" height="86" rx="15" fill="{c}" {S} transform="rotate({rot} 91 245)"/>'

def arm_right(c, rot=-18):
    return f'<rect x="214" y="238" width="30" height="86" rx="15" fill="{c}" {S} transform="rotate({rot} 229 245)"/>'

def torso(c, extra=''):
    return f'<path d="M118 226 Q160 214 202 226 L208 320 Q160 340 112 320 Z" fill="{c}" {S}/>' + extra

def head(fill, cy=128, r=80):
    return f'<circle cx="160" cy="{cy}" r="{r}" fill="{fill}" {S}/>'

def eyes(y=130, dx=26, r=8):
    return (f'<circle cx="{160-dx}" cy="{y}" r="{r}" fill="#1a1a1a"/>'
            f'<circle cx="{160+dx}" cy="{y}" r="{r}" fill="#1a1a1a"/>')

def smile(y=168):
    return f'<path d="M136 {y} Q160 {y+16} 184 {y}" fill="none" {S}/>'

H = [None] * 30

# 0 鋼鐵人：懸浮＋噴射
H[0] = svg(
    f'<g class="jet"><path d="M132 420 L142 456 L152 420 Z" fill="#ff9f1c" {St}/>'
    f'<path d="M168 420 L178 456 L188 420 Z" fill="#ff9f1c" {St}/></g>'
    + legs('#c8102e', '#f2a900') + arms('#c8102e')
    + f'<circle cx="76" cy="330" r="16" fill="#f2a900" {St}/><circle cx="244" cy="330" r="16" fill="#f2a900" {St}/>'
    + torso('#c8102e', f'<circle cx="160" cy="268" r="16" fill="#7fd8ff" {St}/>')
    + head('#c8102e')
    + f'<rect x="118" y="88" width="84" height="104" rx="32" fill="#f2a900" {S}/>'
    + f'<rect x="130" y="120" width="24" height="11" rx="5" fill="#7fd8ff" {St}/>'
    + f'<rect x="166" y="120" width="24" height="11" rx="5" fill="#7fd8ff" {St}/>'
    + f'<line x1="140" y1="168" x2="180" y2="168" {St}/>', anim='hover')

# 1 蜘蛛人：吐蛛絲
H[1] = svg(
    f'<line class="webline" x1="252" y1="252" x2="308" y2="120" stroke="#fff" stroke-width="6" stroke-dasharray="2 10"/>'
    f'<circle class="webline" cx="308" cy="116" r="10" fill="none" stroke="#fff" stroke-width="4"/>'
    + legs('#1446a0', '#d22030') + arm_left('#d22030', 22)
    + f'<rect x="212" y="196" width="30" height="84" rx="15" fill="#d22030" {S} transform="rotate(-52 227 203)"/>'
    + torso('#d22030',
        f'<path d="M160 240 l10 14 l-10 14 l-10 -14 Z" fill="#1a1a1a"/>'
        f'<path d="M120 250 H200 M160 232 V318" stroke="#1a1a1a" stroke-width="3" fill="none"/>')
    + head('#d22030')
    + f'<path d="M96 128 H224 M160 54 V202 M110 84 Q160 122 210 84 M110 172 Q160 138 210 172" fill="none" stroke="#1a1a1a" stroke-width="3"/>'
    + f'<path d="M104 116 Q130 100 148 122 Q140 148 114 142 Q100 132 104 116 Z" fill="#fff" {S}/>'
    + f'<path d="M216 116 Q190 100 172 122 Q180 148 206 142 Q220 132 216 116 Z" fill="#fff" {S}/>')

# 2 美國隊長：舉盾
H[2] = svg(
    legs('#0a3161', '#c8102e') + arm_right('#0a3161')
    + torso('#0a3161',
        f'<path d="M160 240 L166 256 L182 256 L169 266 L174 282 L160 272 L146 282 L151 266 L138 256 L154 256 Z" fill="#fff" {St}/>'
        f'<path d="M118 296 L202 296 L208 320 Q160 340 112 320 Z" fill="#c8102e" {St}/>')
    + f'<g class="shield-arm">{arm_left("#0a3161", 24)}'
    + f'<circle cx="66" cy="316" r="44" fill="#c8102e" {S}/><circle cx="66" cy="316" r="30" fill="#fff" {St}/>'
    + f'<circle cx="66" cy="316" r="17" fill="#0a3161" {St}/>'
    + f'<path d="M66 306 L69 313 L77 313 L71 318 L73 326 L66 321 L59 326 L61 318 L55 313 L63 313 Z" fill="#fff"/></g>'
    + head('#0a3161')
    + f'<path d="M92 118 L118 108 L118 130 Z" fill="#fff" {St}/><path d="M228 118 L202 108 L202 130 Z" fill="#fff" {St}/>'
    + f'<circle cx="134" cy="132" r="10" fill="#fff"/><circle cx="186" cy="132" r="10" fill="#fff"/>'
    + f'<text x="160" y="106" font-family="Arial Black,Arial" font-size="50" font-weight="900" fill="#fff" text-anchor="middle">A</text>'
    + smile())

# 3 浩克：秀肌肉
H[3] = svg(
    f'<rect x="118" y="336" width="36" height="84" rx="18" fill="#5f2a84" {S}/>'
    f'<rect x="166" y="336" width="36" height="84" rx="18" fill="#5f2a84" {S}/>'
    f'<rect x="112" y="400" width="44" height="24" rx="12" fill="#4c9a2a" {St}/>'
    f'<rect x="164" y="400" width="44" height="24" rx="12" fill="#4c9a2a" {St}/>'
    f'<g class="flex">'
    f'<rect x="58" y="252" width="34" height="72" rx="17" fill="#4c9a2a" {S} transform="rotate(40 75 258)"/>'
    f'<rect x="34" y="196" width="34" height="76" rx="17" fill="#4c9a2a" {S} transform="rotate(-24 51 202)"/>'
    f'<circle cx="42" cy="192" r="20" fill="#4c9a2a" {S}/>'
    f'<rect x="228" y="252" width="34" height="72" rx="17" fill="#4c9a2a" {S} transform="rotate(-40 245 258)"/>'
    f'<rect x="252" y="196" width="34" height="76" rx="17" fill="#4c9a2a" {S} transform="rotate(24 269 202)"/>'
    f'<circle cx="278" cy="192" r="20" fill="#4c9a2a" {S}/></g>'
    f'<path d="M108 224 Q160 208 212 224 L216 322 Q160 344 104 322 Z" fill="#4c9a2a" {S}/>'
    f'<path d="M130 250 Q160 262 190 250 M136 286 Q160 296 184 286" fill="none" {St}/>'
    + head('#4c9a2a', cy=124, r=76)
    + f'<path d="M92 92 Q108 48 160 52 Q212 48 228 92 Q204 70 160 74 Q116 70 92 92 Z" fill="#173317" {S}/>'
    + f'<line x1="118" y1="112" x2="148" y2="122" {S}/><line x1="202" y1="112" x2="172" y2="122" {S}/>'
    + eyes(y=136) + f'<path d="M132 172 Q160 160 188 172" fill="none" {S}/>')

# 4 索爾：紅披風＋舉鎚＋閃電
H[4] = svg(
    f'<path class="cape" d="M118 228 Q100 320 84 408 Q160 386 236 408 Q220 320 202 228 Z" fill="#a4243b" {S}/>'
    + legs('#3a3f47', '#8d99ae') + arm_left('#8d99ae')
    + f'<rect x="216" y="176" width="30" height="86" rx="15" fill="#8d99ae" {S} transform="rotate(-135 231 183)"/>'
    + f'<rect x="252" y="96" width="56" height="40" rx="8" fill="#8d99ae" {S}/>'
    + f'<line x1="280" y1="136" x2="280" y2="170" {S}/>'
    + f'<path class="zapflick" d="M250 60 L262 84 L252 84 L264 108" fill="none" stroke="#ffd60a" stroke-width="7" stroke-linecap="round"/>'
    + torso('#8d99ae',
        f'<circle cx="140" cy="256" r="8" fill="#e9ecef" {St}/><circle cx="180" cy="256" r="8" fill="#e9ecef" {St}/>'
        f'<circle cx="160" cy="290" r="8" fill="#e9ecef" {St}/>')
    + f'<path d="M86 150 Q78 84 128 66 Q160 52 192 66 Q242 84 234 150 L214 190 Q160 206 106 190 Z" fill="#f2c14e" {S}/>'
    + head('#f6c99f', cy=136, r=68)
    + f'<path d="M96 110 Q160 80 224 110 L224 92 Q160 66 96 92 Z" fill="#b0b7bf" {S}/>'
    + f'<path d="M88 106 L62 74 L96 82 Z" fill="#fff" {St}/><path d="M232 106 L258 74 L224 82 Z" fill="#fff" {St}/>'
    + eyes(y=140, dx=24) + smile(172))

# 5 黑豹：利爪
H[5] = svg(
    legs('#20232a')
    + f'<g class="shimmer"><path d="M52 320 L36 336 M60 328 L44 344 M68 336 L52 352" stroke="#c0c6cf" stroke-width="6" stroke-linecap="round"/>'
    + f'<path d="M268 320 L284 336 M260 328 L276 344 M252 336 L268 352" stroke="#c0c6cf" stroke-width="6" stroke-linecap="round"/></g>'
    + arms('#20232a', 26)
    + torso('#20232a',
        f'<path d="M136 240 L150 254 L160 244 L170 254 L184 240" fill="none" stroke="#c0c6cf" stroke-width="6" stroke-linecap="round"/>')
    + f'<path d="M92 78 L78 34 L124 58 Z" fill="#20232a" {S}/><path d="M228 78 L242 34 L196 58 Z" fill="#20232a" {S}/>'
    + head('#20232a')
    + f'<path d="M104 118 Q128 106 148 120 L142 138 Q120 144 106 130 Z" fill="#c0c6cf" {St}/>'
    + f'<path d="M216 118 Q192 106 172 120 L178 138 Q200 144 214 130 Z" fill="#c0c6cf" {St}/>')

# 6 驚奇隊長：懸浮能量拳
H[6] = svg(
    legs('#1446a0', '#c8102e') + arms('#1446a0', 30)
    + f'<circle class="glowp" cx="70" cy="330" r="22" fill="#ffd60a" opacity=".85"/>'
    + f'<circle class="glowp" cx="250" cy="330" r="22" fill="#ffd60a" opacity=".85" style="animation-delay:.4s"/>'
    + torso('#1446a0',
        f'<path d="M160 240 L168 258 L188 258 L173 270 L179 290 L160 278 L141 290 L147 270 L132 258 L152 258 Z" fill="#f2a900" {St}/>'
        f'<path d="M118 300 L202 300 L208 320 Q160 340 112 320 Z" fill="#c8102e" {St}/>')
    + f'<path d="M150 44 Q160 24 170 44 L178 84 L142 84 Z" fill="#f2a900" {S}/>'
    + head('#1446a0')
    + f'<path d="M160 96 L170 122 L198 122 L176 138 L184 166 L160 148 L136 166 L144 138 L122 122 L150 122 Z" fill="#f2a900" {St}/>'
    + f'<circle cx="132" cy="184" r="8" fill="#fff"/><circle cx="188" cy="184" r="8" fill="#fff"/>', anim='hover')

# 7 奇異博士：旋轉魔法圈
H[7] = svg(
    f'<path class="cape" d="M112 226 Q92 320 76 404 Q120 390 160 396 Q200 390 244 404 Q228 320 208 226 Z" fill="#a4243b" {S}/>'
    + legs('#2b3a67') + arm_right('#2b3a67')
    + f'<rect x="80" y="230" width="30" height="80" rx="15" fill="#2b3a67" {S} transform="rotate(48 95 237)"/>'
    + f'<g class="spin" style="--o:52px 300px"><circle cx="52" cy="300" r="30" fill="none" stroke="#ffb703" stroke-width="6" stroke-dasharray="10 8"/>'
    + f'<circle cx="52" cy="300" r="16" fill="none" stroke="#ffd60a" stroke-width="4"/></g>'
    + torso('#2b3a67', f'<circle cx="160" cy="268" r="14" fill="#7ae582" {St}/>')
    + head('#f6c99f')
    + f'<path d="M84 122 Q88 60 160 56 Q232 60 232 122 Q222 82 160 80 Q98 82 84 122 Z" fill="#20232a" {S}/>'
    + f'<path d="M88 116 Q96 94 108 86 L112 116 Z" fill="#d9d9d9" {St}/><path d="M232 116 Q224 94 212 86 L208 116 Z" fill="#d9d9d9" {St}/>'
    + eyes(y=132, dx=25)
    + f'<path d="M144 170 Q160 162 176 170 L168 190 Q160 196 152 190 Z" fill="#20232a" {St}/>')

# 8 鷹眼：拉弓
H[8] = svg(
    legs('#3d1f56') + arm_left('#5f2a84', 30)
    + f'<rect x="212" y="216" width="30" height="80" rx="15" fill="#5f2a84" {S} transform="rotate(-80 227 223)"/>'
    + f'<path d="M264 180 Q308 260 264 340" fill="none" stroke="#8d5524" stroke-width="9" stroke-linecap="round"/>'
    + f'<line x1="266" y1="184" x2="266" y2="336" stroke="#e9ecef" stroke-width="4"/>'
    + f'<line class="shimmer" x1="200" y1="260" x2="290" y2="260" stroke="#c0c6cf" stroke-width="6" stroke-linecap="round"/>'
    + f'<path class="shimmer" d="M290 260 L276 250 M290 260 L276 270" stroke="#c0c6cf" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + torso('#5f2a84', f'<path d="M130 250 L190 286 M190 250 L130 286" stroke="#3d1f56" stroke-width="6"/>')
    + head('#f6c99f')
    + f'<path d="M84 96 Q112 58 160 54 Q120 72 104 100 Z" fill="#3d1f56" {St}/>'
    + f'<path d="M236 96 Q208 58 160 54 Q200 72 216 100 Z" fill="#3d1f56" {St}/>'
    + f'<path d="M84 118 Q160 96 236 118 L236 148 Q160 128 84 148 Z" fill="#5f2a84" {S}/>'
    + f'<circle cx="130" cy="131" r="9" fill="#fff" {St}/><circle cx="190" cy="131" r="9" fill="#fff" {St}/>'
    + smile(176))

# 9 蟻人：縮小放大
H[9] = svg(
    f'<path d="M116 66 Q92 32 66 38" fill="none" {S}/><circle cx="64" cy="36" r="11" fill="#b0b7bf" {St}/>'
    f'<path d="M204 66 Q228 32 254 38" fill="none" {S}/><circle cx="256" cy="36" r="11" fill="#b0b7bf" {St}/>'
    + legs('#c8102e', '#20232a') + arms('#c8102e')
    + torso('#c8102e',
        f'<path d="M132 244 Q160 232 188 244 L188 306 Q160 318 132 306 Z" fill="#20232a" {St}/>'
        f'<circle cx="160" cy="274" r="10" fill="#b0b7bf" {St}/>')
    + head('#c8102e')
    + f'<path d="M160 62 Q236 70 236 148 Q236 214 160 220 Q84 214 84 148 Q84 70 160 62 Z" fill="none" stroke="#b0b7bf" stroke-width="12"/>'
    + f'<rect x="112" y="118" width="40" height="18" rx="9" fill="#b0b7bf" {St}/>'
    + f'<rect x="168" y="118" width="40" height="18" rx="9" fill="#b0b7bf" {St}/>'
    + f'<line x1="138" y1="172" x2="182" y2="172" {St}/>', anim='shrink')

# 10 格魯特：樹枝搖擺
H[10] = svg(
    f'<g class="sway">'
    f'<path d="M120 60 Q112 28 132 20 M150 56 Q150 24 170 18 M196 62 Q200 30 220 28" fill="none" stroke="#5a3d2b" stroke-width="10" stroke-linecap="round"/>'
    f'<ellipse cx="128" cy="26" rx="16" ry="10" fill="#6a994e" {St} transform="rotate(-30 128 26)"/>'
    f'<ellipse cx="172" cy="20" rx="14" ry="9" fill="#6a994e" {St} transform="rotate(15 172 20)"/>'
    f'<ellipse cx="216" cy="30" rx="16" ry="10" fill="#6a994e" {St} transform="rotate(25 216 30)"/></g>'
    + f'<rect x="122" y="340" width="32" height="82" rx="16" fill="#8b5e3c" {S}/>'
    + f'<rect x="166" y="340" width="32" height="82" rx="16" fill="#8b5e3c" {S}/>'
    + f'<rect x="118" y="402" width="42" height="22" rx="11" fill="#5a3d2b" {St}/>'
    + f'<rect x="160" y="402" width="42" height="22" rx="11" fill="#5a3d2b" {St}/>'
    + arms('#8b5e3c', 24)
    + f'<path d="M112 224 Q160 210 208 224 L212 322 Q160 342 108 322 Z" fill="#8b5e3c" {S}/>'
    + f'<path d="M132 244 Q140 280 130 310 M188 244 Q180 280 190 310" fill="none" stroke="#5a3d2b" stroke-width="6" stroke-linecap="round"/>'
    + f'<path d="M104 80 Q160 54 216 80 Q244 128 234 192 Q224 246 160 254 Q96 246 86 192 Q76 128 104 80 Z" fill="#8b5e3c" {S}/>'
    + f'<path d="M116 106 Q124 142 112 176 M204 106 Q196 142 208 176" fill="none" stroke="#5a3d2b" stroke-width="6" stroke-linecap="round"/>'
    + f'<circle cx="134" cy="160" r="11" fill="#1a1a1a"/><circle cx="186" cy="160" r="11" fill="#1a1a1a"/>'
    + f'<path d="M140 206 Q160 218 180 206" fill="none" {S}/>')

# 11 火箭浣熊：尾巴搖＋火箭背包
H[11] = svg(
    f'<g class="wag"><path d="M216 340 Q268 330 276 276 Q286 322 252 352 Q230 362 216 352 Z" fill="#6d6d6d" {S}/>'
    f'<path d="M258 292 Q270 304 266 318 M244 322 Q256 330 254 342" stroke="#4a3728" stroke-width="7" fill="none" stroke-linecap="round"/></g>'
    + f'<rect x="236" y="230" width="34" height="60" rx="10" fill="#b0b7bf" {St}/>'
    + f'<path class="jet" d="M244 290 L253 316 L262 290 Z" fill="#ff9f1c" {St}/>'
    + legs('#e07a1f', '#8d5524') + arms('#e07a1f', 24)
    + torso('#e07a1f', f'<rect x="132" y="250" width="56" height="40" rx="10" fill="#c9cba3" {St}/>')
    + f'<path d="M96 84 L82 40 L126 62 Z" fill="#6d6d6d" {S}/><path d="M224 84 L238 40 L194 62 Z" fill="#6d6d6d" {S}/>'
    + head('#9a9a9a')
    + f'<path d="M100 116 Q128 98 152 120 L146 148 Q118 156 102 138 Z" fill="#4a3728" {St}/>'
    + f'<path d="M220 116 Q192 98 168 120 L174 148 Q202 156 218 138 Z" fill="#4a3728" {St}/>'
    + f'<circle cx="126" cy="130" r="8" fill="#fff"/><circle cx="194" cy="130" r="8" fill="#fff"/>'
    + f'<ellipse cx="160" cy="180" rx="38" ry="26" fill="#e8e0d5" {St}/>'
    + f'<ellipse cx="160" cy="170" rx="12" ry="8" fill="#1a1a1a"/>'
    + f'<path d="M160 178 L160 190 M160 190 Q148 200 138 194 M160 190 Q172 200 182 194" fill="none" {St}/>')

# 12 金鋼狼：爪子閃光
H[12] = svg(
    legs('#ffb703', '#20232a') + arms('#ffb703', 30)
    + f'<g class="shimmer"><path d="M58 322 L34 352 M70 328 L46 358 M82 332 L58 362" stroke="#c0c6cf" stroke-width="7" stroke-linecap="round"/>'
    + f'<path d="M262 322 L286 352 M250 328 L274 358 M238 332 L262 362" stroke="#c0c6cf" stroke-width="7" stroke-linecap="round"/></g>'
    + torso('#ffb703',
        f'<path d="M118 226 L146 320 L112 320 Z" fill="#20232a" {St}/>'
        f'<path d="M202 226 L174 320 L208 320 Z" fill="#20232a" {St}/>'
        f'<rect x="130" y="300" width="60" height="16" rx="8" fill="#c8102e" {St}/>')
    + f'<path d="M100 108 L76 30 L138 86 Z" fill="#ffb703" {S}/><path d="M220 108 L244 30 L182 86 Z" fill="#ffb703" {S}/>'
    + head('#ffb703')
    + f'<path d="M100 108 Q76 148 86 198 L122 176 L130 122 Z" fill="#20232a" {St}/>'
    + f'<path d="M220 108 Q244 148 234 198 L198 176 L190 122 Z" fill="#20232a" {St}/>'
    + f'<path d="M122 136 L152 148 L146 168 L118 156 Z" fill="#fff" {St}/>'
    + f'<path d="M198 136 L168 148 L174 168 L202 156 Z" fill="#fff" {St}/>'
    + f'<line x1="136" y1="196" x2="184" y2="196" {S}/>')

# 13 超人：披風
H[13] = svg(
    f'<path class="cape" d="M118 228 Q100 320 84 408 Q160 386 236 408 Q220 320 202 228 Z" fill="#c8102e" {S}/>'
    + legs('#1446a0', '#c8102e') + arms('#1446a0')
    + torso('#1446a0',
        f'<path d="M160 238 L192 252 L160 288 L128 252 Z" fill="#c8102e" {St}/>'
        f'<text x="160" y="272" font-family="Arial Black,Arial" font-size="26" font-weight="900" fill="#f2a900" text-anchor="middle">S</text>')
    + head('#f6c99f')
    + f'<path d="M84 116 Q84 60 160 56 Q236 60 236 116 Q220 82 160 80 Q128 80 108 94 Q114 106 106 116 Q96 124 84 116 Z" fill="#20232a" {S}/>'
    + f'<path d="M152 78 Q160 90 152 100 Q146 106 140 100" fill="none" {St}/>'
    + eyes() + smile())

# 14 蝙蝠俠：披風
H[14] = svg(
    f'<path class="cape" d="M112 226 Q86 320 66 414 L96 396 L120 416 L150 398 L170 416 L200 398 L224 416 L254 396 Q234 320 208 226 Z" fill="#20232a" {S}/>'
    + legs('#484f59', '#20232a') + arms('#484f59')
    + torso('#484f59',
        f'<ellipse cx="160" cy="258" rx="34" ry="16" fill="#f2a900" {St}/>'
        f'<path d="M140 258 Q150 250 155 256 L160 250 L165 256 Q170 250 180 258 Q170 266 160 262 Q150 266 140 258 Z" fill="#1a1a1a"/>'
        f'<rect x="118" y="304" width="84" height="14" rx="7" fill="#f2a900" {St}/>')
    + f'<path d="M112 78 L102 28 L138 62 Z" fill="#20232a" {S}/><path d="M208 78 L218 28 L182 62 Z" fill="#20232a" {S}/>'
    + head('#6d6d6d')
    + f'<path d="M82 122 Q84 68 160 64 Q236 68 238 122 L238 136 Q206 152 160 150 Q114 152 82 136 Z" fill="#20232a" {S}/>'
    + f'<path d="M124 116 L152 122 L147 138 L120 130 Z" fill="#fff" {St}/>'
    + f'<path d="M196 116 L168 122 L173 138 L200 130 Z" fill="#fff" {St}/>'
    + f'<path d="M140 176 L180 176" {S}/>')

# 15 神力女超人：金套索發光
H[15] = svg(
    f'<path d="M74 200 Q58 90 160 62 Q262 90 246 200 Q252 260 232 292 Q240 214 232 172 L88 172 Q80 214 88 292 Q68 260 74 200 Z" fill="#20232a" {S}/>'
    + legs('#1446a0', '#c8102e')
    + f'<path d="M124 340 L136 352 M150 344 L158 356 M166 344 L174 356 M184 340 L192 352" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
    + arms('#f6c99f')
    + f'<rect x="64" y="300" width="26" height="18" rx="9" fill="#c0c6cf" {St}/>'
    + f'<rect x="230" y="300" width="26" height="18" rx="9" fill="#c0c6cf" {St}/>'
    + f'<circle class="glowp" cx="236" cy="336" r="20" fill="none" stroke="#ffd60a" stroke-width="7"/>'
    + torso('#c8102e',
        f'<path d="M128 240 Q160 254 192 240 L192 254 Q160 268 128 254 Z" fill="#f2a900" {St}/>'
        f'<path d="M118 300 L202 300 L208 320 Q160 340 112 320 Z" fill="#1446a0" {St}/>')
    + head('#f6c99f', cy=132, r=74)
    + f'<path d="M92 112 Q160 88 228 112 L228 90 Q160 66 92 90 Z" fill="#f2a900" {S}/>'
    + f'<path d="M160 80 L165 92 L178 92 L168 100 L172 112 L160 104 L148 112 L152 100 L142 92 L155 92 Z" fill="#c8102e" {St}/>'
    + eyes(y=136, dx=24) + smile(170))

# 16 閃電俠：速度線
H[16] = svg(
    f'<g class="speed"><line x1="30" y1="230" x2="90" y2="230" stroke="#ffd60a" stroke-width="8" stroke-linecap="round"/>'
    f'<line x1="20" y1="270" x2="76" y2="270" stroke="#ffd60a" stroke-width="8" stroke-linecap="round"/>'
    f'<line x1="34" y1="310" x2="88" y2="310" stroke="#ffd60a" stroke-width="8" stroke-linecap="round"/></g>'
    + legs('#c8102e', '#f2a900') + arms('#c8102e', 24)
    + torso('#c8102e',
        f'<circle cx="160" cy="264" r="24" fill="#fff" {St}/>'
        f'<path d="M166 246 L152 266 L162 266 L154 284 L172 262 L162 262 Z" fill="#f2a900" stroke="#1a1a1a" stroke-width="3"/>')
    + head('#c8102e')
    + f'<path d="M92 128 L62 108 L82 144 L56 142 L90 164 Z" fill="#f2a900" {St}/>'
    + f'<path d="M228 128 L258 108 L238 144 L264 142 L230 164 Z" fill="#f2a900" {St}/>'
    + f'<circle cx="130" cy="130" r="11" fill="#fff" {St}/><circle cx="190" cy="130" r="11" fill="#fff" {St}/>'
    + smile())

# 17 水行俠：三叉戟＋氣泡
H[17] = svg(
    f'<g class="rise" opacity=".8"><circle cx="60" cy="200" r="8" fill="none" stroke="#7fd8ff" stroke-width="4"/>'
    f'<circle cx="82" cy="240" r="6" fill="none" stroke="#7fd8ff" stroke-width="4"/>'
    f'<circle cx="52" cy="260" r="5" fill="none" stroke="#7fd8ff" stroke-width="4"/></g>'
    + legs('#2a6f4e', '#f2a900') + arm_left('#f6c99f')
    + f'<rect x="214" y="238" width="30" height="86" rx="15" fill="#f6c99f" {S} transform="rotate(-8 229 245)"/>'
    + f'<line x1="252" y1="150" x2="252" y2="330" stroke="#f2a900" stroke-width="9" stroke-linecap="round"/>'
    + f'<path d="M232 176 Q232 140 252 130 Q272 140 272 176 M252 130 L252 176" fill="none" stroke="#f2a900" stroke-width="8" stroke-linecap="round"/>'
    + torso('#f2c14e',
        f'<path d="M126 240 Q136 250 146 240 Q156 250 166 240 Q176 250 186 240 M126 268 Q136 278 146 268 Q156 278 166 268 Q176 278 186 268 M126 296 Q136 306 146 296 Q156 306 166 296 Q176 306 186 296" fill="none" stroke="#c9962e" stroke-width="4"/>')
    + f'<path d="M72 210 Q56 96 160 68 Q264 96 248 210 Q240 258 216 274 Q230 204 222 164 L98 164 Q90 204 104 274 Q80 258 72 210 Z" fill="#f2c14e" {S}/>'
    + head('#f6c99f', cy=136, r=70)
    + eyes(y=132, dx=24)
    + f'<path d="M126 172 Q138 164 150 170 Q160 178 170 170 Q182 164 194 172 Q188 196 160 198 Q132 196 126 172 Z" fill="#e0a93e" {St}/>')

# 18 綠光戰警：發光戒指
H[18] = svg(
    legs('#20232a', '#2a9d3f') + arm_left('#2a9d3f')
    + f'<rect x="214" y="238" width="30" height="86" rx="15" fill="#2a9d3f" {S} transform="rotate(-34 229 245)"/>'
    + f'<circle class="glowp" cx="258" cy="316" r="16" fill="#7ae582" opacity=".9"/>'
    + f'<circle cx="258" cy="316" r="9" fill="none" stroke="#1a5c2a" stroke-width="5"/>'
    + torso('#2a9d3f',
        f'<circle cx="160" cy="266" r="22" fill="#fff" {St}/>'
        f'<circle cx="160" cy="266" r="12" fill="none" stroke="#2a9d3f" stroke-width="6"/>'
        f'<line x1="160" y1="248" x2="160" y2="284" stroke="#2a9d3f" stroke-width="6"/>')
    + head('#f6c99f')
    + f'<path d="M84 112 Q84 62 160 58 Q236 62 236 112 Q206 88 160 88 Q114 88 84 112 Z" fill="#5a3d2b" {S}/>'
    + f'<path d="M96 126 Q160 108 224 126 Q230 148 218 158 Q196 146 178 152 Q168 142 152 152 Q126 146 102 158 Q90 148 96 126 Z" fill="#2a9d3f" {S}/>'
    + f'<circle cx="130" cy="138" r="9" fill="#fff"/><circle cx="190" cy="138" r="9" fill="#fff"/>'
    + smile(176))

# 19 鋼骨：核心發光
H[19] = svg(
    legs('#b0b7bf', '#8d99ae') + arm_left('#8d5524') + arm_right('#b0b7bf')
    + f'<rect x="222" y="286" width="36" height="26" rx="8" fill="#8d99ae" {St}/>'
    + torso('#b0b7bf',
        f'<circle class="glowp" cx="160" cy="268" r="15" fill="#7fd8ff"/>'
        f'<path d="M128 244 L146 244 M128 296 L150 296 M174 306 L196 306" stroke="#4a525c" stroke-width="5" stroke-linecap="round"/>')
    + head('#8d5524', cy=130, r=76)
    + f'<path d="M160 56 Q234 62 236 130 Q234 198 160 204 Z" fill="#b0b7bf" {S}/>'
    + f'<path d="M160 56 Q124 58 102 76 L102 100 Q132 88 160 88 Z" fill="#20232a" {St}/>'
    + f'<circle cx="128" cy="132" r="9" fill="#1a1a1a"/>'
    + f'<circle cx="196" cy="128" r="17" fill="#c8102e" {St}/><circle cx="196" cy="128" r="6" fill="#ff8fa3"/>'
    + f'<path d="M132 174 Q146 184 160 178" fill="none" {S}/><path d="M170 180 L204 180" stroke="#4a525c" stroke-width="5" stroke-linecap="round"/>')

# 20 洛基：金角頭盔＋綠披風
H[20] = svg(
    f'<path class="cape" d="M118 228 Q102 320 88 406 Q160 384 232 406 Q218 320 202 228 Z" fill="#1f6b3a" {S}/>'
    + legs('#20232a', '#2a7d4f') + arms('#2a7d4f')
    + torso('#2a7d4f',
        f'<path d="M160 234 L180 260 L160 286 L140 260 Z" fill="#f2a900" {St}/>'
        f'<path d="M120 236 L138 320 M200 236 L182 320" stroke="#f2a900" stroke-width="6" fill="none"/>'
        f'<rect x="118" y="304" width="84" height="14" rx="7" fill="#f2a900" {St}/>')
    + f'<path d="M112 72 Q76 40 82 6 Q112 34 130 62 Z" fill="#f2a900" {S}/>'
    + f'<path d="M208 72 Q244 40 238 6 Q208 34 190 62 Z" fill="#f2a900" {S}/>'
    + head('#f6c99f')
    + f'<path d="M84 140 Q80 58 160 54 Q240 58 236 140 Q222 92 160 88 Q98 92 84 140 Z" fill="#20232a" {S}/>'
    + f'<path d="M96 108 Q160 78 224 108 L220 128 Q160 100 100 128 Z" fill="#f2a900" {S}/>'
    + eyes(y=144)
    + f'<path d="M136 176 Q160 192 186 170" fill="none" {S}/>')

# 21 幻視：額頭寶石發光＋懸浮
H[21] = svg(
    f'<path class="cape" d="M118 228 Q100 320 84 408 Q160 386 236 408 Q220 320 202 228 Z" fill="#2a7d4f" {S}/>'
    + legs('#c8102e', '#f2a900') + arms('#c8102e')
    + torso('#c8102e',
        f'<path d="M118 226 Q160 214 202 226 L206 264 Q160 278 114 264 Z" fill="#f2a900" {St}/>'
        f'<line x1="160" y1="278" x2="160" y2="322" stroke="#f2a900" stroke-width="6"/>')
    + head('#c8102e')
    + f'<path d="M84 122 Q92 58 160 54 Q228 58 236 122 Q218 88 160 84 Q102 88 84 122 Z" fill="#f2a900" {S}/>'
    + f'<path d="M78 134 L110 114 L110 154 Z" fill="#f2a900" {St}/>'
    + f'<path d="M242 134 L210 114 L210 154 Z" fill="#f2a900" {St}/>'
    + f'<circle class="glowp" cx="160" cy="96" r="17" fill="#ffd60a"/>'
    + f'<circle cx="160" cy="96" r="9" fill="#fff8c4" {St}/>'
    + f'<circle cx="134" cy="146" r="8" fill="#fff"/><circle cx="186" cy="146" r="8" fill="#fff"/>'
    + smile(180), anim='hover')

# 22 緋紅女巫：雙手紅色魔法光暈
H[22] = svg(
    f'<path class="cape" d="M116 228 Q98 322 82 404 Q160 384 238 404 Q222 322 204 228 Z" fill="#7a1220" {S}/>'
    + legs('#7a1220', '#c8102e') + arms('#c8102e', 30)
    + f'<circle class="glowp" cx="70" cy="330" r="22" fill="#e63946" opacity=".85"/>'
    + f'<circle class="glowp" cx="250" cy="330" r="22" fill="#e63946" opacity=".85" style="animation-delay:.4s"/>'
    + torso('#c8102e',
        f'<path d="M118 226 Q160 242 202 226 L204 256 Q160 272 116 256 Z" fill="#7a1220" {St}/>'
        f'<rect x="120" y="302" width="80" height="14" rx="7" fill="#7a1220" {St}/>')
    + f'<path d="M78 152 Q64 54 160 44 Q256 54 242 152 Q248 224 226 254 Q234 168 226 128 L94 128 Q86 168 94 254 Q72 224 78 152 Z" fill="#7a1220" {S}/>'
    + head('#f6c99f', cy=132, r=72)
    + f'<path d="M102 98 L122 68 L141 94 L160 62 L179 94 L198 68 L218 98 Q160 78 102 98 Z" fill="#c8102e" {St}/>'
    + eyes(y=136, dx=24) + smile(172))

# 23 獵鷹：機械翅膀展開
H[23] = svg(
    f'<g class="cape">'
    f'<path d="M118 236 Q58 202 14 226 Q58 238 78 254 Q32 252 8 278 Q54 284 86 290 Q48 302 32 332 Q92 314 126 292 Z" fill="#e9ecef" {S}/>'
    f'<path d="M202 236 Q262 202 306 226 Q262 238 242 254 Q288 252 312 278 Q266 284 234 290 Q272 302 288 332 Q228 314 194 292 Z" fill="#e9ecef" {S}/>'
    f'</g>'
    + legs('#20232a', '#c8102e') + arms('#c8102e', 22)
    + torso('#c8102e',
        f'<path d="M126 228 Q160 240 194 228 L198 288 Q160 302 122 288 Z" fill="#e9ecef" {St}/>'
        f'<rect x="118" y="302" width="84" height="14" rx="7" fill="#20232a" {St}/>')
    + head('#c8102e')
    + f'<path d="M84 118 Q84 56 160 52 Q236 56 236 118 Q208 88 160 88 Q112 88 84 118 Z" fill="#e9ecef" {S}/>'
    + f'<path d="M88 122 Q160 102 232 122 L232 156 Q160 136 88 156 Z" fill="#20232a" {S}/>'
    + f'<ellipse cx="130" cy="134" rx="20" ry="12" fill="#7fd8ff" {St}/>'
    + f'<ellipse cx="190" cy="134" rx="20" ry="12" fill="#7fd8ff" {St}/>'
    + smile(180))

# 24 星爵：紅色長外套飄動
H[24] = svg(
    f'<path class="cape" d="M112 226 Q96 330 88 412 L124 398 L160 412 L196 398 L232 412 Q224 330 208 226 Z" fill="#a4243b" {S}/>'
    + legs('#3a3f47', '#5a3d2b') + arms('#a4243b', 20)
    + torso('#8d99ae',
        f'<path d="M134 246 L186 246 M130 274 L190 274" stroke="#4a525c" stroke-width="5"/>'
        f'<rect x="120" y="300" width="80" height="16" rx="8" fill="#5a3d2b" {St}/>')
    + head('#f6c99f')
    + f'<path d="M84 118 Q84 56 160 52 Q236 56 236 118 Q212 86 160 86 Q108 86 84 118 Z" fill="#6b4423" {S}/>'
    + f'<path d="M86 124 Q160 100 234 124 L230 172 Q160 148 90 172 Z" fill="#b0b7bf" {S}/>'
    + f'<path d="M100 132 Q160 112 220 132 L218 156 Q160 136 102 156 Z" fill="#c8102e" {St}/>'
    + f'<circle cx="132" cy="138" r="8" fill="#ff8fa3"/><circle cx="188" cy="138" r="8" fill="#ff8fa3"/>'
    + smile(186))

# 25 羅賓：黃色披風＋胸前 R
H[25] = svg(
    f'<path class="cape" d="M118 228 Q102 320 88 406 Q160 384 232 406 Q218 320 202 228 Z" fill="#f2a900" {S}/>'
    + legs('#2a9d3f', '#1f6b3a') + arms('#2a9d3f')
    + torso('#c8102e',
        f'<circle cx="160" cy="260" r="24" fill="#f2a900" {St}/>'
        f'<text x="160" y="272" font-family="Arial Black,Arial" font-size="30" font-weight="900" fill="#c8102e" text-anchor="middle">R</text>'
        f'<rect x="118" y="300" width="84" height="16" rx="8" fill="#2a9d3f" {St}/>')
    + head('#f6c99f')
    + f'<path d="M84 118 Q84 56 160 52 Q236 56 236 118 Q212 84 160 84 Q108 84 84 118 Z" fill="#20232a" {S}/>'
    + f'<path d="M88 124 Q160 104 232 124 L232 154 Q160 134 88 154 Z" fill="#1a1a1a" {S}/>'
    + f'<circle cx="132" cy="136" r="9" fill="#fff"/><circle cx="188" cy="136" r="9" fill="#fff"/>'
    + smile(180))

# 26 女超人：紅披風＋懸浮
H[26] = svg(
    f'<path class="cape" d="M118 228 Q100 320 84 408 Q160 386 236 408 Q220 320 202 228 Z" fill="#c8102e" {S}/>'
    + legs('#1446a0', '#c8102e') + arms('#1446a0')
    + torso('#1446a0',
        f'<path d="M160 238 L192 252 L160 288 L128 252 Z" fill="#c8102e" {St}/>'
        f'<text x="160" y="272" font-family="Arial Black,Arial" font-size="26" font-weight="900" fill="#f2a900" text-anchor="middle">S</text>'
        f'<rect x="118" y="304" width="84" height="14" rx="7" fill="#f2a900" {St}/>')
    + f'<path d="M78 152 Q64 54 160 44 Q256 54 242 152 Q248 226 226 256 Q234 168 226 128 L94 128 Q86 168 94 256 Q72 226 78 152 Z" fill="#f2c14e" {S}/>'
    + head('#f6c99f', cy=132, r=72)
    + eyes(y=136, dx=24) + smile(172), anim='hover')

# 27 綠箭俠：拉弓
H[27] = svg(
    legs('#1f6b3a', '#2a7d4f') + arm_left('#2a9d3f', 30)
    + f'<rect x="212" y="216" width="30" height="80" rx="15" fill="#2a9d3f" {S} transform="rotate(-80 227 223)"/>'
    + f'<path d="M264 178 Q308 260 264 342" fill="none" stroke="#2a9d3f" stroke-width="9" stroke-linecap="round"/>'
    + f'<line x1="266" y1="182" x2="266" y2="338" stroke="#e9ecef" stroke-width="4"/>'
    + f'<line class="shimmer" x1="202" y1="260" x2="292" y2="260" stroke="#c0c6cf" stroke-width="6" stroke-linecap="round"/>'
    + f'<path class="shimmer" d="M292 260 L278 250 M292 260 L278 270" stroke="#c0c6cf" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + torso('#2a9d3f',
        f'<path d="M130 246 L160 266 L190 246" fill="none" stroke="#1f6b3a" stroke-width="6"/>'
        f'<rect x="120" y="300" width="80" height="14" rx="7" fill="#5a3d2b" {St}/>')
    + f'<path d="M74 148 Q60 52 160 44 Q260 52 246 148 Q238 208 216 236 Q228 168 220 128 L100 128 Q92 168 104 236 Q82 208 74 148 Z" fill="#1f6b3a" {S}/>'
    + head('#f6c99f', cy=134, r=68)
    + f'<path d="M98 122 Q160 104 222 122 L220 148 Q160 130 100 148 Z" fill="#2a9d3f" {S}/>'
    + f'<circle cx="132" cy="132" r="8" fill="#fff"/><circle cx="188" cy="132" r="8" fill="#fff"/>'
    + f'<path d="M132 166 Q146 158 160 164 Q174 158 188 166 Q182 194 160 196 Q138 194 132 166 Z" fill="#f2c14e" {St}/>')

# 28 沙贊：白披風＋金色閃電
H[28] = svg(
    f'<path class="cape" d="M118 228 Q100 320 84 408 Q160 386 236 408 Q220 320 202 228 Z" fill="#fff" {S}/>'
    + legs('#c8102e', '#f2a900') + arms('#c8102e')
    + torso('#c8102e',
        f'<path d="M176 234 L138 286 L158 286 L146 314 L188 266 L166 266 Z" fill="#f2a900" {St}/>'
        f'<rect x="118" y="304" width="84" height="14" rx="7" fill="#f2a900" {St}/>')
    + f'<path class="zapflick" d="M258 56 L272 92 L256 92 L270 128" fill="none" stroke="#ffd60a" stroke-width="7" stroke-linecap="round"/>'
    + head('#f6c99f')
    + f'<path d="M84 116 Q84 56 160 52 Q236 56 236 116 Q212 84 160 84 Q108 84 84 116 Z" fill="#20232a" {S}/>'
    + eyes() + smile())

# 29 夜翼：雙棍＋藍色鳥紋
H[29] = svg(
    legs('#20232a', '#1a3f6b') + arms('#20232a', 26)
    + f'<g class="shimmer">'
    + f'<line x1="52" y1="296" x2="52" y2="362" stroke="#2f7fe0" stroke-width="10" stroke-linecap="round"/>'
    + f'<line x1="268" y1="296" x2="268" y2="362" stroke="#2f7fe0" stroke-width="10" stroke-linecap="round"/></g>'
    + torso('#20232a',
        f'<path d="M160 246 Q134 238 112 256 Q140 252 152 264 L160 280 L168 264 Q180 252 208 256 Q186 238 160 246 Z" fill="#2f7fe0" {St}/>'
        f'<rect x="120" y="302" width="80" height="14" rx="7" fill="#1a3f6b" {St}/>')
    + head('#f6c99f')
    + f'<path d="M84 118 Q84 56 160 52 Q236 56 236 118 Q212 84 160 84 Q108 84 84 118 Z" fill="#20232a" {S}/>'
    + f'<path d="M90 124 Q160 104 230 124 L230 154 Q160 134 90 154 Z" fill="#1a1a1a" {S}/>'
    + f'<path d="M104 130 L136 138 L132 152 L102 144 Z" fill="#fff" {St}/>'
    + f'<path d="M216 130 L184 138 L188 152 L218 144 Z" fill="#fff" {St}/>'
    + f'<path d="M138 180 L182 180" {S}/>')

def main():
    for i, s in enumerate(H):
        with open(os.path.join(OUT, f'hero_full_{i}.svg'), 'w', encoding='utf-8') as f:
            f.write(s)
    print('done: %d full-body hero SVGs' % len(H))

if __name__ == '__main__':
    main()

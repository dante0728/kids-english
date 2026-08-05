# -*- coding: utf-8 -*-
"""
電子寵物（養成系統）Q 版動畫 SVG：3 隻寵物 x 4 進化階段 = 12 檔。
畫風同 gen_hero_fullbody.py：粗黑邊扁平色塊、viewBox 320x320、CSS 動畫內嵌（<img> 載入也會動）。
輸出：assets/img/pet_{petId}_{stage}.svg
  dino 火系恐龍線（橘紅） / aqua 水系（藍） / leaf 草系（綠）
用法：python tools/gen_pets.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'img')

S = 'stroke="#1a1a1a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'
St = 'stroke="#1a1a1a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'

CSS = """
.bob{animation:bob 1.8s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-8px)}}
.rocking{animation:rocking 2s ease-in-out infinite;transform-origin:160px 290px}
@keyframes rocking{25%{transform:rotate(8deg)}75%{transform:rotate(-8deg)}}
.blink{animation:blink 3s step-end infinite}
@keyframes blink{0%,91%,96%,100%{opacity:1}92%,95%{opacity:0}}
.glowp{animation:glowp 1.3s ease-in-out infinite}
@keyframes glowp{50%{opacity:.3}}
.wag{animation:wag 1.5s ease-in-out infinite}
@keyframes wag{50%{transform:rotate(12deg)}}
.rise{animation:rise 2.6s linear infinite}
@keyframes rise{to{transform:translateY(-80px);opacity:0}}
"""

def svg(body, anim='bob', static=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">'
            f'<style>{CSS}</style>{static}<g class="{anim}">{body}</g></svg>')

# ---------- 共用零件 ----------
SHADOW = '<ellipse cx="160" cy="298" rx="80" ry="14" fill="#1a1a1a" opacity=".12"/>'

def eyes(y, dx=28, r=10, cx=160):
    """一組會眨眼的大圓眼（含高光）。"""
    hr = max(3, int(r * 0.35))
    return (f'<g class="blink">'
            f'<circle cx="{cx-dx}" cy="{y}" r="{r}" fill="#1a1a1a"/>'
            f'<circle cx="{cx+dx}" cy="{y}" r="{r}" fill="#1a1a1a"/>'
            f'<circle cx="{cx-dx+3}" cy="{y-3}" r="{hr}" fill="#fff"/>'
            f'<circle cx="{cx+dx+3}" cy="{y-3}" r="{hr}" fill="#fff"/></g>')

def smile(y, w=24):
    return f'<path d="M{160-w} {y} Q160 {y+14} {160+w} {y}" fill="none" {S}/>'

def cheeks(y, dx=52, c='#ffb3b3'):
    return (f'<circle cx="{160-dx}" cy="{y}" r="10" fill="{c}" opacity=".8"/>'
            f'<circle cx="{160+dx}" cy="{y}" r="10" fill="{c}" opacity=".8"/>')

def egg(color, deco='', face_y=168):
    """圓滾滾蛋型生物：臉在球上。"""
    return (f'<ellipse cx="160" cy="182" rx="100" ry="108" fill="{color}" {S}/>'
            f'<path d="M92 128 Q104 92 138 82" fill="none" stroke="#ffffff" stroke-width="10" '
            f'stroke-linecap="round" opacity=".45"/>'
            + deco
            + eyes(face_y, dx=36, r=12) + cheeks(face_y + 32) + smile(face_y + 30))

P = {}

# ============================================================
# 寵物 1：dino 火系恐龍線（橘紅色系）
# ============================================================
DINO = '#ff8c42'
DINO_D = '#e8590c'
BELLY = '#ffe8c9'

# stage0 滾滾蛋：橘色圓球生物，左右搖擺
P['dino_0'] = svg(
    egg(DINO,
        deco=(f'<circle cx="106" cy="220" r="14" fill="{DINO_D}" opacity=".55"/>'
              f'<circle cx="216" cy="230" r="11" fill="{DINO_D}" opacity=".55"/>'
              f'<circle cx="196" cy="102" r="12" fill="{DINO_D}" opacity=".55"/>'
              f'<path d="M160 74 L150 52 L160 62 L170 48 L178 66" fill="none" {St}/>')),
    anim='rocking', static=SHADOW)

# stage1 小龍獸：二頭身橘色小恐龍
P['dino_1'] = svg(
    f'<path d="M212 246 Q252 240 258 212 Q264 246 234 266 Z" fill="{DINO}" {S}/>'
    f'<rect x="116" y="258" width="42" height="32" rx="16" fill="{DINO}" {S}/>'
    f'<rect x="162" y="258" width="42" height="32" rx="16" fill="{DINO}" {S}/>'
    f'<ellipse cx="160" cy="220" rx="66" ry="60" fill="{DINO}" {S}/>'
    f'<ellipse cx="160" cy="236" rx="38" ry="38" fill="{BELLY}" {St}/>'
    f'<ellipse cx="98" cy="216" rx="15" ry="24" fill="{DINO}" {St} transform="rotate(22 98 216)"/>'
    f'<ellipse cx="222" cy="216" rx="15" ry="24" fill="{DINO}" {St} transform="rotate(-22 222 216)"/>'
    f'<circle cx="160" cy="112" r="70" fill="{DINO}" {S}/>'
    + eyes(108, dx=28, r=11)
    + f'<circle cx="148" cy="134" r="3.5" fill="#1a1a1a"/><circle cx="172" cy="134" r="3.5" fill="#1a1a1a"/>'
    + cheeks(136, dx=48) + smile(148, w=20),
    static=SHADOW)

# stage2 暴暴龍獸：張嘴露牙、頭上小角、長尾巴、肚皮條紋
P['dino_2'] = svg(
    f'<g class="wag" style="transform-origin:214px 244px">'
    f'<path d="M210 236 Q274 228 284 184 Q294 234 248 266 Q226 274 210 260 Z" fill="{DINO}" {S}/>'
    f'<path d="M262 208 Q272 218 268 232" fill="none" stroke="{DINO_D}" stroke-width="6" stroke-linecap="round"/></g>'
    f'<rect x="106" y="254" width="48" height="36" rx="17" fill="{DINO}" {S}/>'
    f'<rect x="166" y="254" width="48" height="36" rx="17" fill="{DINO}" {S}/>'
    f'<ellipse cx="160" cy="216" rx="76" ry="64" fill="{DINO}" {S}/>'
    f'<ellipse cx="160" cy="232" rx="44" ry="42" fill="{BELLY}" {St}/>'
    f'<path d="M128 218 Q160 228 192 218 M124 244 Q160 254 196 244" fill="none" '
    f'stroke="#e0a96e" stroke-width="5" stroke-linecap="round"/>'
    f'<ellipse cx="90" cy="210" rx="16" ry="26" fill="{DINO}" {St} transform="rotate(24 90 210)"/>'
    f'<ellipse cx="230" cy="210" rx="16" ry="26" fill="{DINO}" {St} transform="rotate(-24 230 210)"/>'
    f'<path d="M160 26 L174 56 L146 56 Z" fill="{BELLY}" {St}/>'
    f'<circle cx="160" cy="108" r="76" fill="{DINO}" {S}/>'
    + eyes(96, dx=30, r=11)
    + f'<path d="M118 138 Q160 162 202 138 Q198 176 160 182 Q122 176 118 138 Z" fill="#84261b" {St}/>'
    + f'<path d="M134 148 L142 162 L150 148 Z" fill="#fff"/>'
    + f'<path d="M186 148 L178 162 L170 148 Z" fill="#fff"/>'
    + f'<path d="M156 178 L164 168 L172 178 Z" fill="#fff"/>'
    + cheeks(128, dx=56),
    static=SHADOW)

# stage3 戰甲龍獸：加金屬胸甲、頭盔角、肩甲、胸口發光
P['dino_3'] = svg(
    f'<g class="wag" style="transform-origin:214px 244px">'
    f'<path d="M210 236 Q274 228 284 184 Q294 234 248 266 Q226 274 210 260 Z" fill="{DINO}" {S}/>'
    f'<path d="M262 208 Q272 218 268 232" fill="none" stroke="{DINO_D}" stroke-width="6" stroke-linecap="round"/></g>'
    f'<rect x="106" y="254" width="48" height="36" rx="17" fill="{DINO}" {S}/>'
    f'<rect x="166" y="254" width="48" height="36" rx="17" fill="{DINO}" {S}/>'
    f'<ellipse cx="160" cy="216" rx="76" ry="64" fill="{DINO}" {S}/>'
    f'<ellipse cx="88" cy="196" rx="22" ry="18" fill="#8d99ae" {St}/>'
    f'<ellipse cx="232" cy="196" rx="22" ry="18" fill="#8d99ae" {St}/>'
    f'<path d="M100 202 Q160 184 220 202 L214 258 Q160 276 106 258 Z" fill="#b0b7bf" {St}/>'
    f'<circle cx="118" cy="214" r="4" fill="#4a525c"/><circle cx="202" cy="214" r="4" fill="#4a525c"/>'
    f'<circle cx="120" cy="248" r="4" fill="#4a525c"/><circle cx="200" cy="248" r="4" fill="#4a525c"/>'
    f'<circle class="glowp" cx="160" cy="230" r="20" fill="#7fd8ff" opacity=".9"/>'
    f'<circle cx="160" cy="230" r="11" fill="#fff" {St}/>'
    f'<path d="M160 18 L176 52 L144 52 Z" fill="#ffd60a" {St}/>'
    f'<path d="M104 52 L88 24 L122 40 Z" fill="#ffd60a" {St}/>'
    f'<path d="M216 52 L232 24 L198 40 Z" fill="#ffd60a" {St}/>'
    f'<circle cx="160" cy="108" r="76" fill="{DINO}" {S}/>'
    f'<path d="M88 82 Q160 48 232 82 L232 62 Q160 30 88 62 Z" fill="#8d99ae" {St}/>'
    f'<line x1="120" y1="84" x2="146" y2="94" {St}/><line x1="200" y1="84" x2="174" y2="94" {St}/>'
    + eyes(104, dx=30, r=11)
    + f'<path d="M120 142 Q160 164 200 142 Q196 176 160 182 Q124 176 120 142 Z" fill="#84261b" {St}/>'
    + f'<path d="M136 150 L144 164 L152 150 Z" fill="#fff"/>'
    + f'<path d="M184 150 L176 164 L168 150 Z" fill="#fff"/>',
    static=SHADOW)

# ============================================================
# 寵物 2：aqua 水系（藍色系）
# ============================================================
AQUA = '#4dabf7'
AQUA_D = '#1971c2'
GOLD = '#f2a900'

# stage0 泡泡蛋：水藍圓球，頂上小水滴呆毛
P['aqua_0'] = svg(
    f'<path d="M160 72 Q142 44 160 22 Q178 44 160 72 Z" fill="{AQUA}" {St}/>'
    + egg('#74c0fc',
          deco=(f'<circle cx="110" cy="112" r="12" fill="#fff" opacity=".55"/>'
                f'<circle cx="212" cy="226" r="13" fill="{AQUA_D}" opacity=".4"/>'
                f'<circle cx="104" cy="226" r="10" fill="{AQUA_D}" opacity=".4"/>')),
    anim='rocking', static=SHADOW)

# stage1 企鵝寶：藍白小企鵝，圓滾滾
P['aqua_1'] = svg(
    f'<ellipse cx="84" cy="222" rx="16" ry="40" fill="{AQUA_D}" {St} transform="rotate(20 84 222)"/>'
    f'<ellipse cx="236" cy="222" rx="16" ry="40" fill="{AQUA_D}" {St} transform="rotate(-20 236 222)"/>'
    f'<rect x="112" y="268" width="44" height="24" rx="12" fill="#ff9f1c" {St}/>'
    f'<rect x="164" y="268" width="44" height="24" rx="12" fill="#ff9f1c" {St}/>'
    f'<ellipse cx="160" cy="182" rx="88" ry="102" fill="{AQUA_D}" {S}/>'
    f'<ellipse cx="160" cy="208" rx="56" ry="70" fill="#fff" {St}/>'
    f'<path d="M96 118 Q128 96 160 100 Q192 96 224 118 Q206 74 160 72 Q114 74 96 118 Z" fill="{AQUA}" {St}/>'
    + eyes(136, dx=30, r=11)
    + f'<path d="M146 160 L174 160 L160 178 Z" fill="#ff9f1c" {St}/>'
    + cheeks(164, dx=56),
    static=SHADOW)

# stage2 鯊鯊獸：直立卡通鯊魚，背鰭白肚笑臉尖牙
P['aqua_2'] = svg(
    f'<path d="M138 66 Q146 12 192 16 Q172 38 182 62 Z" fill="{AQUA_D}" {S}/>'
    f'<path d="M236 226 Q282 210 292 178 Q296 226 262 252 Z" fill="{AQUA_D}" {St}/>'
    f'<ellipse cx="160" cy="178" rx="82" ry="114" fill="{AQUA}" {S}/>'
    f'<path d="M84 190 L44 172 L74 214 Z" fill="{AQUA}" {St}/>'
    f'<path d="M236 190 L276 172 L246 214 Z" fill="{AQUA}" {St}/>'
    f'<ellipse cx="160" cy="222" rx="50" ry="66" fill="#fff" {St}/>'
    f'<path d="M112 96 L122 108 M104 112 L114 124 M96 130 L106 142" stroke="{AQUA_D}" '
    f'stroke-width="5" stroke-linecap="round" fill="none"/>'
    + eyes(112, dx=38, r=11)
    + f'<path d="M120 152 Q160 180 200 152" fill="none" {S}/>'
    + f'<path d="M134 158 L142 172 L150 160 Z" fill="#fff" stroke="#1a1a1a" stroke-width="3"/>'
    + f'<path d="M186 158 L178 172 L170 160 Z" fill="#fff" stroke="#1a1a1a" stroke-width="3"/>'
    + cheeks(146, dx=60),
    static=SHADOW)

# stage3 海皇獸：鯊魚加皇冠、金三叉戟胸紋、鰭上金環、氣泡上升
P['aqua_3'] = svg(
    f'<path d="M138 70 Q146 20 190 22 Q172 42 182 66 Z" fill="{AQUA_D}" {S}/>'
    f'<path d="M236 226 Q282 210 292 178 Q296 226 262 252 Z" fill="{AQUA_D}" {St}/>'
    f'<ellipse cx="160" cy="178" rx="82" ry="114" fill="{AQUA}" {S}/>'
    f'<path d="M84 190 L44 172 L74 214 Z" fill="{AQUA}" {St}/>'
    f'<path d="M236 190 L276 172 L246 214 Z" fill="{AQUA}" {St}/>'
    f'<circle cx="62" cy="192" r="9" fill="none" stroke="{GOLD}" stroke-width="6"/>'
    f'<circle cx="258" cy="192" r="9" fill="none" stroke="{GOLD}" stroke-width="6"/>'
    f'<ellipse cx="160" cy="222" rx="50" ry="66" fill="#fff" {St}/>'
    f'<g class="glowp"><path d="M160 190 L160 258 M136 206 Q136 190 148 186 M184 206 Q184 190 172 186 '
    f'M136 206 L136 216 M184 206 L184 216 M148 250 L172 250" fill="none" stroke="{GOLD}" '
    f'stroke-width="7" stroke-linecap="round"/></g>'
    f'<path d="M116 64 L116 28 L134 48 L152 22 L170 48 L188 28 L188 58" fill="{GOLD}" {St}/>'
    + eyes(112, dx=38, r=11)
    + f'<path d="M120 152 Q160 180 200 152" fill="none" {S}/>'
    + f'<path d="M134 158 L142 172 L150 160 Z" fill="#fff" stroke="#1a1a1a" stroke-width="3"/>'
    + f'<path d="M186 158 L178 172 L170 160 Z" fill="#fff" stroke="#1a1a1a" stroke-width="3"/>',
    static=(SHADOW
            + '<g class="rise" opacity=".8">'
            f'<circle cx="52" cy="150" r="9" fill="none" stroke="#7fd8ff" stroke-width="5"/>'
            f'<circle cx="34" cy="196" r="6" fill="none" stroke="#7fd8ff" stroke-width="5"/>'
            f'<circle cx="284" cy="170" r="7" fill="none" stroke="#7fd8ff" stroke-width="5"/>'
            '</g>'))

# ============================================================
# 寵物 3：leaf 草系（綠色系）
# ============================================================
LEAF = '#69db7c'
LEAF_D = '#2f9e44'
PINK = '#ff8fa3'

# stage0 葉葉蛋：綠色圓球頂上一片葉子
P['leaf_0'] = svg(
    f'<path d="M160 76 Q160 48 160 34" fill="none" {St}/>'
    f'<path d="M160 34 Q186 8 216 22 Q204 54 168 44 Z" fill="{LEAF_D}" {St}/>'
    + egg('#8ce99a',
          deco=(f'<circle cx="108" cy="118" r="11" fill="{LEAF_D}" opacity=".4"/>'
                f'<circle cx="214" cy="224" r="12" fill="{LEAF_D}" opacity=".4"/>'
                f'<circle cx="102" cy="228" r="9" fill="{LEAF_D}" opacity=".4"/>')),
    anim='rocking', static=SHADOW)

# stage1 芽芽兔：綠白小兔，頭頂雙葉芽
P['leaf_1'] = svg(
    f'<ellipse cx="122" cy="62" rx="19" ry="46" fill="#8fd694" {S} transform="rotate(-12 122 62)"/>'
    f'<ellipse cx="198" cy="62" rx="19" ry="46" fill="#8fd694" {S} transform="rotate(12 198 62)"/>'
    f'<ellipse cx="123" cy="66" rx="9" ry="28" fill="{PINK}" transform="rotate(-12 123 66)"/>'
    f'<ellipse cx="197" cy="66" rx="9" ry="28" fill="{PINK}" transform="rotate(12 197 66)"/>'
    f'<path d="M160 84 Q144 62 120 66 Q132 92 158 88 M160 84 Q176 62 200 66 Q188 92 162 88" '
    f'fill="{LEAF}" {St}/>'
    f'<ellipse cx="160" cy="248" rx="58" ry="46" fill="#8fd694" {S}/>'
    f'<ellipse cx="160" cy="256" rx="32" ry="26" fill="#d3f9d8" {St}/>'
    f'<ellipse cx="112" cy="280" rx="20" ry="13" fill="#8fd694" {St}/>'
    f'<ellipse cx="208" cy="280" rx="20" ry="13" fill="#8fd694" {St}/>'
    f'<circle cx="160" cy="142" r="64" fill="#8fd694" {S}/>'
    + eyes(136, dx=26, r=10)
    + f'<path d="M152 160 L168 160 L160 170 Z" fill="{PINK}" {St}/>'
    + f'<path d="M160 170 L160 178 M160 178 Q150 186 142 180 M160 178 Q170 186 178 180" fill="none" {St}/>'
    + cheeks(162, dx=46),
    static=SHADOW)

# stage2 花花狐：綠色小狐狸，尾端粉花、脖子花圈
P['leaf_2'] = svg(
    f'<g class="wag" style="transform-origin:212px 246px">'
    f'<path d="M208 238 Q262 226 276 190 Q288 240 244 268 Q222 276 208 262 Z" fill="{LEAF}" {S}/>'
    f'<circle cx="270" cy="184" r="12" fill="{PINK}" {St}/><circle cx="288" cy="196" r="12" fill="{PINK}" {St}/>'
    f'<circle cx="284" cy="176" r="11" fill="{PINK}" {St}/><circle cx="278" cy="190" r="7" fill="#ffd60a"/></g>'
    f'<ellipse cx="118" cy="278" rx="21" ry="14" fill="{LEAF}" {St}/>'
    f'<ellipse cx="202" cy="278" rx="21" ry="14" fill="{LEAF}" {St}/>'
    f'<ellipse cx="160" cy="234" rx="60" ry="54" fill="{LEAF}" {S}/>'
    f'<ellipse cx="160" cy="248" rx="34" ry="32" fill="#d3f9d8" {St}/>'
    f'<path d="M112 66 L98 14 L146 46 Z" fill="{LEAF}" {S}/>'
    f'<path d="M208 66 L222 14 L174 46 Z" fill="{LEAF}" {S}/>'
    f'<path d="M114 56 L106 28 L134 46 Z" fill="{LEAF_D}"/>'
    f'<path d="M206 56 L214 28 L186 46 Z" fill="{LEAF_D}"/>'
    f'<circle cx="160" cy="118" r="66" fill="{LEAF}" {S}/>'
    f'<circle cx="122" cy="182" r="9" fill="{PINK}" {St}/><circle cx="146" cy="190" r="9" fill="#ffd60a" {St}/>'
    f'<circle cx="174" cy="190" r="9" fill="{PINK}" {St}/><circle cx="198" cy="182" r="9" fill="#ffd60a" {St}/>'
    + eyes(112, dx=26, r=10)
    + f'<ellipse cx="160" cy="148" rx="28" ry="19" fill="#fff" {St}/>'
    + f'<ellipse cx="160" cy="142" rx="9" ry="7" fill="#1a1a1a"/>'
    + f'<path d="M160 150 Q150 158 142 152 M160 150 Q170 158 178 152" fill="none" {St}/>'
    + cheeks(140, dx=50),
    static=SHADOW)

# stage3 森林王：狐狸加樹枝鹿角、藤蔓紋、胸前發光綠寶石
P['leaf_3'] = svg(
    f'<path d="M112 60 Q96 34 100 6 M100 22 Q86 20 78 8 M104 40 Q92 42 82 34" fill="none" '
    f'stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/>'
    f'<path d="M208 60 Q224 34 220 6 M220 22 Q234 20 242 8 M216 40 Q228 42 238 34" fill="none" '
    f'stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/>'
    f'<g class="wag" style="transform-origin:212px 246px">'
    f'<path d="M208 238 Q262 226 276 190 Q288 240 244 268 Q222 276 208 262 Z" fill="{LEAF}" {S}/>'
    f'<circle cx="270" cy="184" r="12" fill="{PINK}" {St}/><circle cx="288" cy="196" r="12" fill="{PINK}" {St}/>'
    f'<circle cx="284" cy="176" r="11" fill="{PINK}" {St}/><circle cx="278" cy="190" r="7" fill="#ffd60a"/></g>'
    f'<ellipse cx="118" cy="278" rx="21" ry="14" fill="{LEAF}" {St}/>'
    f'<ellipse cx="202" cy="278" rx="21" ry="14" fill="{LEAF}" {St}/>'
    f'<ellipse cx="160" cy="234" rx="60" ry="54" fill="{LEAF}" {S}/>'
    f'<path d="M112 214 Q128 226 118 244 M208 214 Q192 226 202 244 M136 262 Q148 254 160 264" '
    f'fill="none" stroke="{LEAF_D}" stroke-width="5" stroke-linecap="round"/>'
    f'<circle class="glowp" cx="160" cy="234" r="24" fill="#7ae582" opacity=".85"/>'
    f'<path d="M160 216 L176 234 L160 252 L144 234 Z" fill="#2b8a3e" {St}/>'
    f'<path d="M112 66 L98 14 L146 46 Z" fill="{LEAF}" {S}/>'
    f'<path d="M208 66 L222 14 L174 46 Z" fill="{LEAF}" {S}/>'
    f'<path d="M114 56 L106 28 L134 46 Z" fill="{LEAF_D}"/>'
    f'<path d="M206 56 L214 28 L186 46 Z" fill="{LEAF_D}"/>'
    f'<circle cx="160" cy="118" r="66" fill="{LEAF}" {S}/>'
    + eyes(112, dx=26, r=10)
    + f'<ellipse cx="160" cy="148" rx="28" ry="19" fill="#fff" {St}/>'
    + f'<ellipse cx="160" cy="142" rx="9" ry="7" fill="#1a1a1a"/>'
    + f'<path d="M160 150 Q150 158 142 152 M160 150 Q170 158 178 152" fill="none" {St}/>',
    static=SHADOW)

def main():
    os.makedirs(OUT, exist_ok=True)
    for key, content in P.items():
        path = os.path.join(OUT, f'pet_{key}.svg')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    print(f'done: {len(P)} pet SVGs -> {OUT}')

if __name__ == '__main__':
    main()

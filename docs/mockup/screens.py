#!/usr/bin/env python3
"""Feed poster and chat thread, built from their own sources."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import phone, page, STATUS  # noqa

ROOT = os.path.dirname(os.path.abspath(__file__))

DOCK_MARKS = [
    ('near', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>'),
    ('chats', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h8A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H8l-3.4 2.6a.4.4 0 0 1-.6-.3V13a1 1 0 0 1-1-1z"/><path d="M8 16.5A2.5 2.5 0 0 0 10.5 19H16l3.4 2.6a.4.4 0 0 0 .6-.3V19a1 1 0 0 0 1-1v-4a2.5 2.5 0 0 0-2.5-2.5"/></svg>'),
    ('alerts', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6z"/><path d="M10.2 18a1.9 1.9 0 0 0 3.6 0"/></svg>'),
]

def dock(current='near', counts=None, avatar='PS'):
    counts = counts or {}
    cols = []
    for name, glyph in DOCK_MARKS[:2]:
        cols.append(col(name, glyph, current, counts))
    cols.append('<div class="dock__col"><div class="dock__cast">'
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
                '</div><span class="dock__label">cast</span></div>')
    cols.append(col('alerts', DOCK_MARKS[2][1], current, counts))
    cols.append(f'<div class="dock__col{" on" if current == "you" else ""}">'
                f'<div class="dock__mark"><span style="width:24px;height:24px;border-radius:999px;'
                f'border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;'
                f'font-family:var(--font-mono);font-weight:600;font-size:9px;letter-spacing:.3px">{avatar}</span>'
                f'</div><span class="dock__label">you</span></div>')
    return '<div class="dock">' + ''.join(cols) + '</div>'

def col(name, glyph, current, counts):
    n = counts.get(name, 0)
    badge = f'<span class="dock__count">{n if n <= 9 else "9+"}</span>' if n else ''
    return (f'<div class="dock__col{" on" if current == name else ""}">'
            f'<div class="dock__mark">{glyph}</div>{badge}'
            f'<span class="dock__label">{name}</span></div>')

SEARCH = ('<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
          'stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>')

def poster(field, cat_label, cast, who, initials, meta, why, cta='ask to join', state=None):
    join = f'<button class="bar bar--onInk">{cta}</button>'
    if state == 'sent':
        join = '<button class="bar bar--onInk bar--disabled">asked &middot; waiting</button>'
    return f'''<div class="canvas po-screen">
  <div class="po-top"><span class="wordmark">NEARCAST</span><span>{SEARCH}</span></div>
  <div class="po-middle">
    <div class="po-categoryTag">{cat_label}</div>
    <h1 class="po-cast">{cast}</h1>
  </div>
  <div>
    <div class="po-casterPill"><span>{initials}</span><span>{who}</span><span>&middot;</span><span>&#8250;</span></div>
    <div class="po-meta">{meta}</div>
    <div class="po-why">{why} &#8250;</div>
    <div class="po-bar">{join}<button class="quiet">skip</button></div>
  </div>
  <div class="poster-reserve"></div>
</div>''' + dock('near')

def msg(text, mine, time, tick='', green=False):
    cls = 'mine' + (' green' if green else '') if mine else 'theirs'
    t = f'<span class="ch-tick{" read" if tick == "read" else ""}">{"&#10003;&#10003;" if tick else ""}</span>' if mine else ''
    return (f'<div class="ch-row {cls}"><div class="ch-bubble">{text}</div>'
            f'<div class="ch-metaRow"><span class="ch-time">{time}</span>{t}</div></div>')

def chat(green=False, state=None):
    thread = [
        '<div class="ch-system">you matched on <b>chai + catch-up this evening</b></div>',
        msg('Fjj need', True, '9:04 PM', 'read', green),
        msg('Do', True, '9:26 PM', 'read', green),
        msg('Cool', False, '5:23 PM'),
        msg('Cm', True, '5:24 PM', 'read', green),
        msg('FFL', True, '7:30 PM', 'sent', green),
    ]
    if state == 'ended':
        thread.append('<div class="ch-system">this chat has ended. the plan is done.</div>')
    composer = ('<div class="ch-composer"><span class="ch-plus">+</span>'
                '<div class="ch-input">message</div>'
                '<span class="ch-send"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">'
                '<path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z"/></svg></span></div>')
    if state == 'ended':
        composer = '<div class="ch-composer"><div class="ch-input" style="opacity:.5">this chat has ended</div></div>'
    return f'''<div class="canvas ch-screen">
  <div class="ch-header">
    <span class="ch-chevron">&#8249;</span>
    <div class="ch-who"><span class="ch-avatar">SS</span>
      <div><div class="ch-name">SS</div><div class="ch-sub">4 plans together</div></div></div>
    <span class="ch-open">open &middot;&middot;&middot;</span>
  </div>
  <div class="ch-thread">{''.join(thread)}</div>
  <div style="padding-bottom:calc(var(--inset-bottom) + 6px)">{composer}</div>
</div>'''

def write(path, title, note, slots, depth=2):
    fn = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(fn), exist_ok=True)
    open(fn, 'w').write(page(title, note, slots, depth))
    return path

made = []
for slug, label in [('a-open', 'chat-push-notification-review'), ('b-invite-gated', 'gifted-chat-integration-eval')]:
    # ---- the feed, across fields ----
    slots = []
    for f, cl, cast, who, ini, meta in [
        ('social', 'SOCIAL', 'chai + catch-up this evening, anyone around?', 'aarav', 'AA', 'nearby &middot; gone in 28d'),
        ('arts', 'ARTS + MAKING', 'sketching in the park sunday morning.', 'rohan', 'RO', 'nearby &middot; gone in 29d'),
        ('games', 'GAMES', 'board games night, teaching Catan to newbies.', 'nisha', 'NI', 'nearby &middot; gone in 29d'),
    ]:
        body = poster(f, cl, cast, who, ini, meta, 'why you: demo cast &middot; shown to every tester')
        slots.append((phone(body, field=f), f'<b>{f}</b><em>field #{cl.lower()} &middot; caster pill takes the poles</em>'))
    made.append(write(f'{slug}/home/feed.html', 'home &middot; feed', 
        'Three of the ten category fields. Values from '
        '<code>src/design-system/components/poster.tsx</code>: pad 24, cast 46/46/&minus;1.15 '
        'capped at 335, caster pill 38 tall at radius pill taking <code>polesFor</code>, '
        'CTA <code>onInk</code> with a 2px gap to <code>skip</code>.', slots))

    # ---- the chat thread ----
    green = (slug == 'b-invite-gated')
    slots = [
        (phone(chat(green)), '<b>live</b><em>read ticks in accent; my bubble notches 5px bottom-right</em>'),
        (phone(chat(green, 'ended')), '<b>ended</b><em>composer disabled, a system capsule states why</em>'),
    ]
    made.append(write(f'{slug}/chat/thread.html', 'chat &middot; thread',
        'From <code>src/app/chat/[id].tsx</code>: screen pads 18, bubbles radius 18 with a 5px '
        'notch on the sending corner, text 15/21, ticks in <code>accent</code> once read. '
        'Committed code paints my bubble <code>ink</code>; the build on the device paints it '
        '<code>verbGot</code> green, which is not in any branch.', slots))

print('\n'.join(made))

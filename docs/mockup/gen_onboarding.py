#!/usr/bin/env python3
"""
Onboarding, mirrored node-for-node from src/app/onboarding/index.tsx.

No styling decisions are made here. Every class is `ob__<key>` emitted by
rn2css.js from the screen's own StyleSheet.create; the only inline values
are the two the screen itself computes inline — paddingTop insets.top + 16
and paddingBottom max(insets.bottom, 12).
"""
import os, html

ROOT = os.path.dirname(os.path.abspath(__file__))
INSET_TOP, INSET_BOTTOM = 59, 34
PAD_TOP, PAD_BOTTOM = INSET_TOP + 16, max(INSET_BOTTOM, 12)

STATUS = '''<div class="island"></div>
<div class="statusbar"><span>9:41</span><span class="glyphs">
<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" width="3" height="12" rx="1" opacity=".35"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 10.5 5.8 8.3a3.1 3.1 0 0 1 4.4 0zM3.6 6.1a6.2 6.2 0 0 1 8.8 0l1.4-1.4a8.2 8.2 0 0 0-11.6 0z"/></svg>
<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>
</span></div>'''

# BarButton, from src/design-system/components/button.tsx. The variant names
# the background the button paints; disabled is opacity 0.45.
BG = {'onInk': '#14120E', 'onCream': '#F4EFE4', 'onOrange': '#FF4D00'}
FG = {'onInk': '#F4EFE4', 'onCream': '#14120E', 'onOrange': '#14120E'}

def bar(label, variant='onInk', disabled=False):
    style = f'background-color:{BG[variant]};color:{FG[variant]}'
    if disabled:
        style += ';opacity:.45'
    return (f'<div class="rn-view rn-row button__bar" style="{style}">'
            f'<span class="rn-text button__label">{label}</span></div>')

def quiet(label, color='#14120E'):
    return (f'<div class="rn-view button__quiet">'
            f'<span class="rn-text button__quietLabel" style="color:{color}">{label}</span></div>')

def top(step_is_name, step_label):
    back = ('<div class="rn-view ob__backTap"></div>' if step_is_name else
            '<div class="rn-view ob__backTap"><span class="rn-text ob__chevron">&#8249;</span></div>')
    return f'''<div class="rn-view rn-row ob__top">
  {back}
  <span class="rn-text ob__wordmark">NEARCAST &middot; {step_label}</span>
  <div class="rn-view ob__helpTap"><span class="rn-text ob__help">?</span></div>
</div>'''

def progress(order, step):
    i = order.index(step)
    out = []
    for n, s in enumerate(order):
        cls = 'ob__progressBar' + (' ob__progressOn' if n <= i else '')
        style = ' style="margin-left:6px"' if n > 0 else ''
        out.append(f'<div class="rn-view {cls}"{style}></div>')
    return f'<div class="rn-view rn-row ob__progress">{"".join(out)}</div>'

# placeholderTextColor is hairlineOnCream — ink at 12%, far fainter than the
# muted text colour a mockup would reach for by default.
PLACEHOLDER = '#14120E1F'

def input_(value=None, placeholder=''):
    if value:
        return f'<div class="rn-view ob__input rn-row" style="align-items:center"><span class="rn-text">{value}</span></div>'
    return (f'<div class="rn-view ob__input rn-row" style="align-items:center">'
            f'<span class="rn-text" style="color:{PLACEHOLDER}">{placeholder}</span></div>')

def pick_row(value=None, sub=None, placeholder=None):
    left = (f'<div class="rn-view ob__pickText"><span class="rn-text ob__pickValue">{value}</span>'
            f'<span class="rn-text ob__pickSub">{sub}</span></div>'
            if value else
            f'<div class="rn-view ob__pickText"><span class="rn-text ob__pickPlaceholder">{placeholder}</span></div>')
    return (f'<div class="rn-view rn-row ob__pickRow">{left}'
            f'<span class="rn-text ob__pickChevron">&#8250;</span></div>')

def tags(items):
    inner = ''.join(f'<div class="rn-view ob__tag"><span class="rn-text ob__tagText">{t}</span></div>' for t in items)
    return f'<div class="rn-view rn-row ob__tagsRow">{inner}</div>'

def chips(items, on):
    inner = ''.join(
        f'<div class="rn-view ob__chip"'
        + (' style="background-color:#14120E;border-color:#14120E"' if t in on else '')
        + f'><span class="rn-text ob__chipText"'
        + (' style="color:#F4EFE4"' if t in on else '')
        + f'>{t}</span></div>' for t in items)
    return f'<div class="rn-view rn-row ob__chips">{inner}</div>'

CATS = ['social','sports','food + drinks','music + nightlife','travel + outdoors',
        'games','arts + making','learning','networking','help + favors']

BODY = {
 'name': ('what should we call you?',
   'your first name is all anyone else on nearcast sees. no last names, no handles.',
   lambda: input_(placeholder='first name')),
 'invite': ('got an invitation?',
   'nearcast is invite-only while it is small. paste the code someone sent you. spaces and capitals do not matter.',
   lambda: input_(placeholder='invitation code')),
 'home': ('where&rsquo;s home, roughly?',
   'the neighbourhood, not the address. we keep it approximate.',
   lambda: pick_row('Sector 17', 'chandigarh &middot; approximate')),
 'areas': ('where else are you around?',
   'add the neighborhoods you spend time in. casts near any of these can reach you.',
   lambda: tags(['sector 17', 'elante']) + pick_row(placeholder='add a neighborhood')),
 'interests': ('what are you actually into?',
   'pick a few. delivery uses this to decide when a stranger&rsquo;s cast is worth showing you.',
   lambda: chips(CATS, {'games', 'food + drinks', 'arts + making'})),
 'push': ('two pings. that&rsquo;s it.',
   'when someone asks to join your plan, and when a plan you asked to join says yes. nothing else, ever. '
   'a ping never carries the note, the place, or who it&rsquo;s from. that stays in the app. off whenever you like.',
   lambda: ''),
}

LABELS = {'name':'HELLO','invite':'INVITATION','home':'HOME','areas':'AREAS',
          'interests':'INTERESTS','push':'PUSH'}

def screen(order, step):
    title, hint, extra = BODY[step]
    if step == 'push':
        actions = bar('turn on push', 'onOrange') + quiet('not now')
    else:
        label = 'looks good' if step == 'interests' else 'next'
        actions = bar(label, 'onOrange', disabled=(step == 'name'))
    return f'''<div class="rn-view ob__screen" style="position:absolute;inset:0;padding-top:{PAD_TOP}px;padding-bottom:{PAD_BOTTOM}px">
  <div class="rn-view ob__flex">
    {top(step == 'name', LABELS[step])}
    {progress(order, step)}
    <div class="rn-view rn-scroll ob__flex">
      <span class="rn-text ob__title">{title}</span>
      <span class="rn-text ob__hint">{hint}</span>
      {extra()}
    </div>
    <div class="rn-view ob__actions">{actions}</div>
  </div>
</div>'''

def phone(body):
    return f'<div class="phone">{STATUS}{body}<div class="home-indicator"></div></div>'

def page(title, note, slots, up='../../'):
    racks = '\n'.join(f'<figure class="slot">{p}<figcaption>{c}</figcaption></figure>' for p, c in slots)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Nearcast</title>
<link rel="stylesheet" href="{up}design-system.css">
<link rel="stylesheet" href="{up}screens.css">
</head><body class="mockup">
<div class="sheetnote"><h1>{title}</h1><p>{note}</p></div>
<div class="rack">{racks}</div>
</body></html>
'''

made = []
for slug, gated, label in [('a-open', False, 'chat-push-notification-review'),
                           ('b-invite-gated', True, 'gifted-chat-integration-eval')]:
    order = ['name','invite','home','areas','interests','push'] if gated else \
            ['name','home','areas','interests','push']
    d = os.path.join(ROOT, slug, 'onboarding')
    os.makedirs(d, exist_ok=True)
    for i, s in enumerate(order, start=1):
        slots = [(phone(screen(order, s)),
                  f'<b>{slug}/onboarding/{i:02d}-{s}</b><em>step {i} of {len(order)} &middot; {label}</em>')]
        note = (f'Mirrored node-for-node from <code>src/app/onboarding/index.tsx</code>. Every class is '
                f'<code>ob__*</code>, transpiled by <code>rn2css.js</code> from that file&rsquo;s own '
                f'<code>StyleSheet.create</code> with the real token object resolved. The only inline values '
                f'are the two the screen computes itself: <code>paddingTop: insets.top + 16</code> and '
                f'<code>paddingBottom: max(insets.bottom, 12)</code>.')
        fn = os.path.join(d, f'{i:02d}-{s}.html')
        open(fn, 'w').write(page(f'onboarding &middot; {s}', note, slots))
        made.append(f'{slug}/onboarding/{i:02d}-{s}.html')
print('\n'.join(made))

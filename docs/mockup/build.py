#!/usr/bin/env python3
"""
Emit one standalone HTML file per screen, per branch.

Every file links ../../design-system.css (ported value-for-value from
src/design-system/tokens.ts) and is hand-editable afterwards: the
generator exists so the 150-odd files stay consistent, not so they stay
generated. Copy strings below are lifted verbatim from the screen source.

  a-open/          this branch: 5-step onboarding, magic-link sign-in
  b-invite-gated/  gifted-chat-integration-eval: 6 steps, invite code, OTP
"""
import os, html, textwrap

ROOT = os.path.dirname(os.path.abspath(__file__))

STATUS = '''<div class="island"></div>
<div class="statusbar"><span>9:41</span><span class="glyphs">
<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1" opacity=".35"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 10.5 5.8 8.3a3.1 3.1 0 0 1 4.4 0zM3.6 6.1a6.2 6.2 0 0 1 8.8 0l1.4-1.4a8.2 8.2 0 0 0-11.6 0z"/></svg>
<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>
</span></div>'''

def phone(body, field=None, indicator=True):
    attr = f' data-field="{field}"' if field else ''
    ind = '<div class="home-indicator"></div>' if indicator else ''
    return f'<div class="phone"{attr}>{STATUS}\n{body}\n{ind}</div>'

def page(title, note, slots, depth=2):
    up = '../' * depth
    racks = '\n'.join(
        f'<figure class="slot">{p}<figcaption>{c}</figcaption></figure>' for p, c in slots)
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} — Nearcast mockup</title>
<link rel="stylesheet" href="{up}design-system.css">
</head>
<body class="mockup">
<div class="sheetnote"><h1>{html.escape(title)}</h1><p>{note}</p></div>
<div class="rack">
{racks}
</div>
</body></html>
'''

def rail(total, on):
    return '<div class="rail">' + ''.join(
        f'<i class="{"on" if i < on else ""}"></i>' for i in range(total)) + '</div>'

def onboarding(step_label, total, index, title, hint, control, extra=''):
    """One onboarding step. Matches src/app/onboarding/index.tsx layout:
    back chevron + wordmark + rail, scrolling body, actions pinned bottom."""
    return f'''<div class="canvas">
  <div class="pad" style="padding-top:6px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font-family:var(--font-display);font-weight:800;font-size:30px;line-height:30px">&#8249;</span>
      <span class="wordmark">NEARCAST &middot; {step_label}</span>
      <span class="wordmark" style="font-size:15px">?</span>
    </div>
    {rail(total, index)}
  </div>
  <div class="pad" style="flex:1;padding-top:26px">
    <h2 class="t-title" style="margin:0 0 10px">{title}</h2>
    <p class="t-body" style="margin:0;color:var(--ink40)">{hint}</p>
    {extra}
  </div>
  <div class="pad" style="padding-bottom:calc(var(--inset-bottom) + 14px);display:flex;flex-direction:column;gap:6px">
    {control}
  </div>
</div>'''

NEXT = '<button class="bar">next</button>'
NEXT_OFF = '<button class="bar bar--disabled">next</button>'

# ---------------------------------------------------------------- steps
def steps(gated):
    """The five, or six, onboarding steps. `gated` adds the invite step,
    exactly as onboarding/index.tsx does when the release gate is on."""
    order = ['name', 'invite', 'home', 'areas', 'interests', 'push'] if gated else \
            ['name', 'home', 'areas', 'interests', 'push']
    total = len(order)
    out = []
    for i, s in enumerate(order, start=1):
        out.append((s, total, i))
    return out

COPY = {
 'name': ('HELLO', 'what should we call you?',
   'your first name is all anyone else on nearcast sees. no last names, no handles.'),
 'invite': ('INVITATION', 'got an invitation?',
   'nearcast is invite-only while it is small. paste the code someone sent you. spaces and capitals do not matter.'),
 'home': ('HOME', 'where&rsquo;s home, roughly?',
   'the neighbourhood, not the address. we keep it approximate.'),
 'areas': ('AREAS', 'where else are you around?',
   'add the neighborhoods you spend time in. casts near any of these can reach you.'),
 'interests': ('INTERESTS', 'what are you actually into?',
   'pick a few. delivery uses this to decide when a stranger&rsquo;s cast is worth showing you.'),
 'push': ('PUSH', 'two pings. that&rsquo;s it.',
   'when someone asks to join your plan, and when a plan you asked to join says yes. nothing else, ever. '
   'a ping never carries the note, the place, or who it&rsquo;s from. that stays in the app. off whenever you like.'),
}

EXTRA = {
 'name': '<div style="margin-top:26px"><input class="input" placeholder="first name"></div>',
 'invite': '<div style="margin-top:26px"><input class="input input--error" placeholder="invitation code"></div>',
 'home': '<div style="margin-top:26px"><div class="row" style="border-top:1px solid var(--hairline-on-cream)">'
         '<div class="row__body"><div class="row__title">Sector 17</div>'
         '<div class="row__meta">chandigarh &middot; approximate</div></div>'
         '<span class="row__end">change</span></div></div>',
 'areas': '<div style="margin-top:26px;display:flex;flex-wrap:wrap;gap:8px">'
          '<span class="tag tag--on">sector 17</span><span class="tag tag--on">elante</span>'
          '<span class="tag">+ add a neighborhood</span></div>',
 'interests': '<div style="margin-top:26px;display:flex;flex-wrap:wrap;gap:8px">'
   + ''.join(f'<span class="tag{" tag--on" if t in ("games","food + drinks","arts + making") else ""}">{t}</span>'
             for t in ['social','sports','food + drinks','music + nightlife','travel + outdoors',
                       'games','arts + making','learning','networking','help + favors'])
   + '</div>',
 'push': '',
}

CONTROL = {
 'push': '<button class="bar bar--onCream">turn on push</button><button class="quiet">not now</button>',
}

def build_branch(slug, gated, label):
    d = os.path.join(ROOT, slug, 'onboarding')
    os.makedirs(d, exist_ok=True)
    made = []
    for n, (s, total, i) in enumerate(steps(gated), start=1):
        step_label, title, hint = COPY[s]
        control = CONTROL.get(s, NEXT if s != 'name' else NEXT_OFF)
        body = onboarding(step_label, total, i, title, hint, control, EXTRA[s])
        slots = [(phone(body), f'<b>{slug}/onboarding/{n:02d}-{s}</b><em>step {i} of {total} &middot; '
                               f'{label}</em>')]
        # the empty / invalid variant, where the step has an input to get wrong
        if s == 'name':
            body2 = onboarding(step_label, total, i, title, hint, NEXT,
                '<div style="margin-top:26px"><input class="input input--focus" value="Piyush" '
                'style="font-family:var(--font-text)"></div>')
            slots.append((phone(body2), '<b>filled</b><em>next enables only once a name exists</em>'))
        if s == 'invite':
            body2 = onboarding(step_label, total, i, title, hint,
                '<button class="bar">join</button>',
                '<div style="margin-top:26px"><input class="input input--error" '
                'value="ca00112f&hellip;" style="font-family:var(--font-mono);font-size:13px"></div>'
                '<div class="notice notice--error" style="margin-top:12px">that code is not valid, '
                'or it has already been used. ask whoever invited you for another.</div>')
            slots.append((phone(body2), '<b>rejected</b><em>redeem_invite logs every attempt, valid or not</em>'))
        note = (f'Onboarding step {i} of {total} on the <code>{label}</code> branch. '
                'Copy is verbatim from <code>src/app/onboarding/index.tsx</code>; '
                'type, colour and spacing come from <code>tokens.ts</code>.')
        fn = os.path.join(d, f'{n:02d}-{s}.html')
        with open(fn, 'w') as f:
            f.write(page(f'onboarding &middot; {s}', note, slots))
        made.append(fn)
    return made

files = []
files += build_branch('a-open', False, 'chat-push-notification-review')
files += build_branch('b-invite-gated', True, 'gifted-chat-integration-eval')
print(f'wrote {len(files)} files')
for f in files:
    print(' ', os.path.relpath(f, ROOT))

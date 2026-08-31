"""Shared shell for every mirrored screen. No styling decisions live here."""
import os
ROOT = os.path.dirname(os.path.abspath(__file__))
INSET_TOP, INSET_BOTTOM = 59, 34

STATUS = '''<div class="island"></div>
<div class="statusbar"><span>9:41</span><span class="glyphs">
<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" width="3" height="12" rx="1" opacity=".35"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 10.5 5.8 8.3a3.1 3.1 0 0 1 4.4 0zM3.6 6.1a6.2 6.2 0 0 1 8.8 0l1.4-1.4a8.2 8.2 0 0 0-11.6 0z"/></svg>
<svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>
</span></div>'''

BG = {'onInk': '#14120E', 'onCream': '#F4EFE4', 'onOrange': '#FF4D00'}
FG = {'onInk': '#F4EFE4', 'onCream': '#14120E', 'onOrange': '#14120E'}
PLACEHOLDER = '#14120E1F'   # hairlineOnCream

def bar(label, variant='onInk', disabled=False, loading=False):
    """BarButton — design-system/components/button.tsx."""
    style = f'background-color:{BG[variant]};color:{FG[variant]}'
    if disabled:
        style += ';opacity:.45'
    inner = f'<span class="rn-text dsbutton__label">{label}</span>'
    if loading:
        loader = ''.join(
            f'<div class="rn-view dsbutton__loaderBar" style="background-color:{FG[variant]};'
            f'opacity:{o}"></div>' for o in ('1', '.55', '.3'))
        inner = (f'<div class="rn-view rn-row dsbutton__loaderRow">'
                 f'<div class="rn-view rn-row dsbutton__loader">{loader}</div>{inner}</div>')
    return f'<div class="rn-view rn-row dsbutton__bar" style="{style}">{inner}</div>'

def quiet(label, color='#14120E'):
    return (f'<div class="rn-view dsbutton__quiet">'
            f'<span class="rn-text dsbutton__quietLabel" style="color:{color}">{label}</span></div>')

def phone(body, field=None):
    attr = f' data-field="{field}"' if field else ''
    return f'<div class="phone"{attr}>{STATUS}{body}<div class="home-indicator"></div></div>'

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

def write(rel, title, note, slots, up='../../'):
    fn = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(fn), exist_ok=True)
    open(fn, 'w').write(page(title, note, slots, up))
    return rel

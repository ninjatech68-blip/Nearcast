#!/usr/bin/env python3
"""The home pager's cream pages, composed the way the app composes them:
Page > Row / Tag / Face, all classes transpiled from their own sources."""
from common import *

DOCK_GLYPH = {
 'near': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
 'chats': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h8A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H8l-3.4 2.6a.4.4 0 0 1-.6-.3V13a1 1 0 0 1-1-1z"/><path d="M8 16.5A2.5 2.5 0 0 0 10.5 19H16l3.4 2.6a.4.4 0 0 0 .6-.3V19a1 1 0 0 0 1-1v-4a2.5 2.5 0 0 0-2.5-2.5"/></svg>',
 'alerts': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6z"/><path d="M10.2 18a1.9 1.9 0 0 0 3.6 0"/></svg>',
}

def dock(current, counts=None, avatar='PS'):
    counts = counts or {}
    def col(name):
        n = counts.get(name, 0)
        badge = f'<div class="rn-view dock__count"><span class="rn-text dock__countText">{n if n<=9 else "9+"}</span></div>' if n else ''
        on = ' style="opacity:1;transform:scale(1.12)"' if current == name else ''
        return (f'<div class="rn-view dock__column">'
                f'<div class="rn-view dock__markBox"{on}>{DOCK_GLYPH[name]}</div>{badge}'
                f'<span class="rn-text dock__label">{name}</span></div>')
    cast = ('<div class="rn-view dock__column"><div class="rn-view dock__cast">'
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>'
            '<span class="rn-text dock__label">cast</span></div>')
    you = (f'<div class="rn-view dock__column"><div class="rn-view dock__markBox">'
           f'<div class="rn-view dock__avatar"><span class="rn-text dock__avatarInitials">{avatar}</span></div>'
           f'</div><span class="rn-text dock__label">you</span></div>')
    return ('<div class="rn-view dock__dock"><div class="rn-view rn-row dock__row">'
            + col('near') + col('chats') + cast + col('alerts') + you + '</div></div>')

def page_shell(title, children, current, counts=None):
    return f'''<div class="rn-view dspage__page" style="position:absolute;inset:0;padding-top:{INSET_TOP + 24}px">
  <div class="rn-view dspage__head"><span class="rn-text dspage__title">{title}</span></div>
  <div class="rn-view dspage__body">
    <div class="rn-view rn-scroll" style="flex:1 1 0%;padding-bottom:116px">{children}</div>
  </div>
</div>''' + dock(current, counts)

def row(title, sub, right=None, left=None):
    l = f'<div class="rn-view dsface__fallback" style="width:44px;height:44px;border-radius:22px;background-color:#14120E;align-items:center;justify-content:center"><span class="rn-text dsface__initials">{left}</span></div>' if left else ''
    r = right or ''
    return (f'<div class="rn-view rn-row dsrow__row">{l}'
            f'<div class="rn-view dsrow__copy">'
            f'<span class="rn-text dsrow__title">{title}</span>'
            f'<span class="rn-text dsrow__sub">{sub}</span></div>{r}</div>')

def tag(label, tone='line'):
    return (f'<div class="rn-view dstag__base dstag__{tone}">'
            f'<span class="rn-text dstag__text">{label}</span></div>')

def strip(tabs, selected):
    out = []
    for tid, label, count in tabs:
        on = tid == selected
        out.append(
          f'<div class="rn-view rn-row alerts__tab{" alerts__tabOn" if on else ""}">'
          f'<span class="rn-text alerts__tabLabel{" alerts__tabLabelOn" if on else ""}">{label}</span>'
          f'<div class="rn-view alerts__tabCount{" alerts__tabCountOn" if on else ""}">'
          f'<span class="rn-text alerts__tabCountText{" alerts__tabCountTextOn" if on else ""}">{count}</span>'
          f'</div></div>')
    return f'<div class="rn-view rn-row alerts__strip">{"".join(out)}</div>'

TABS = [('needs','NEEDS YOU',1), ('waiting','WAITING',1), ('plans','YOUR PLANS',4)]

alerts_needs = page_shell('alerts',
    strip(TABS, 'needs')
    + row('Fun night - wine - pizza', 'dhakauli &middot; how did it go? receipts wait on this', tag('answer','hot')),
    'alerts', {'alerts': 1})

alerts_plans = page_shell('alerts',
    strip(TABS, 'plans')
    + row('Dm', '1 waiting on you &middot; gone in 21h &middot; long-press to cancel', tag('you cast','dim'))
    + row('Fun', 'gone in 9h &middot; long-press to cancel', tag('you cast','dim'))
    + row('Catch up', 'with Shalvi', tag('you joined','dim'), left='SH')
    + row('4 plans with SS', 'Walk in park with a baby', tag('you joined','dim'), left='SS'),
    'alerts', {'alerts': 1, 'chats': 1})

NOTE = ('Composed the way the app composes it: <code>Page</code> wrapping <code>Row</code>, '
        '<code>Tag</code> and <code>Face</code>. Classes are <code>dspage__*</code>, '
        '<code>dsrow__*</code>, <code>dstag__*</code> and <code>alerts__*</code>, all transpiled '
        'from their own sources. A Row draws its hairline on the TOP edge, pads 16 vertically and '
        'gaps 14 &mdash; not the bottom-border list a mockup would assume.')

write('a-open/home/alerts.html', 'home &middot; alerts', NOTE, [
  (phone(alerts_needs), '<b>needs you</b><em>a reflect row; the tab strip carries real counts</em>'),
  (phone(alerts_plans), '<b>your plans</b><em>cast and joined rows, Face on the joined ones</em>'),
])
print('pages: alerts.html')

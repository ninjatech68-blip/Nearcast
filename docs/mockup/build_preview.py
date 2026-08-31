#!/usr/bin/env python3
"""
Stitch every generated screen into one self-contained page.

preview.html inlines design-system.css and screens.css so it opens from
disk with no server. It is a VIEW of the per-screen files, never a source
of truth — regenerate it after any tranche rather than editing it.

  node rn2css.js        # styles, from each source file's own StyleSheet
  python3 gen_*.py      # markup, mirroring each JSX tree
  python3 build_preview.py
"""
import re, glob, os

ROOT = os.path.dirname(os.path.abspath(__file__))
FONTS = ('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@'
         '12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&display=swap')

GROUPS = [
    ('onboarding · A (open signup)', sorted(glob.glob(f'{ROOT}/a-open/onboarding/*.html'))),
    ('onboarding · B (invite-gated)', sorted(glob.glob(f'{ROOT}/b-invite-gated/onboarding/*.html'))),
    ('auth', [f'{ROOT}/a-open/auth/signin.html', f'{ROOT}/a-open/auth/callback.html']),
    ('home', sorted(glob.glob(f'{ROOT}/a-open/home/*.html'))),
    ('chat', sorted(glob.glob(f'{ROOT}/a-open/chat/*.html'))),
]

def racks_of(path):
    try:
        text = open(path).read()
    except FileNotFoundError:
        return None
    m = re.search(r'<div class="rack">(.*?)</div>\s*</body>', text, re.S)
    return m.group(1) if m else None

def main():
    ds = open(f'{ROOT}/design-system.css').read()
    ds = re.sub(r"@import url\('https://fonts\.googleapis\.com[^']*'\);", '', ds)
    sc = open(f'{ROOT}/screens.css').read()

    sections = []
    for label, files in GROUPS:
        racks = [r for r in (racks_of(f) for f in files) if r]
        if racks:
            sections.append(f'<h2 class="band">{label}</h2><div class="rack">' + '\n'.join(racks) + '</div>')

    n = sum(len(files) for _, files in GROUPS)
    out = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nearcast — screens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>{ds}
{sc}
.band {{ max-width: 1200px; margin: 56px auto 24px; font-family: var(--font-mono); font-weight: 600;
  font-size: 12px; letter-spacing: 1.9px; text-transform: uppercase; color: var(--ink40);
  border-top: 1px solid var(--ink12); padding-top: 18px; }}
</style></head>
<body class="mockup">
<div class="sheetnote"><h1>nearcast — from the code</h1>
<p>Styles are machine-transpiled from each source file&rsquo;s own <code>StyleSheet.create</code>,
evaluated against the real token object; markup mirrors the JSX node for node.
<code>.rn-view</code> restores React Native&rsquo;s box model, which is where a hand-built
mockup silently drifts.</p></div>
{''.join(sections)}
</body></html>
'''
    open(f'{ROOT}/preview.html', 'w').write(out)
    print(f'preview.html — {n} screen files, {len(out)} bytes')

if __name__ == '__main__':
    main()

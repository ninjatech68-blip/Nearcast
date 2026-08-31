#!/usr/bin/env python3
"""signin.tsx and auth/callback.tsx, mirrored node-for-node."""
from common import *

LEGAL = ('<div class="rn-view rn-row signin__legalRow">'
         '<span class="rn-text signin__legalLink">terms</span>'
         '<span class="rn-text signin__legalDot">&middot;</span>'
         '<span class="rn-text signin__legalLink">privacy</span>'
         '<span class="rn-text signin__legalDot">&middot;</span>'
         '<span class="rn-text signin__legalLink">guidelines</span></div>')

HEADER = f'''<div class="rn-view signin__header">
  <span class="rn-text signin__wordmark">NEARCAST</span>
  <span class="rn-text signin__title">a place to post a plan.</span>
  <span class="rn-text signin__sub">and let people you already trust, or one link away, say they&rsquo;re in.</span>
</div>'''

def segment(mode):
    def tab(name, on):
        cls = 'signin__segmentTab' + (' signin__segmentTabOn' if on else '')
        tcls = 'signin__segmentText' + (' signin__segmentTextOn' if on else '')
        return f'<div class="rn-view {cls}"><span class="rn-text {tcls}">{name}</span></div>'
    return ('<div class="rn-view rn-row signin__segment">'
            + tab('sign up', mode == 'signup') + tab('log in', mode == 'login') + '</div>')

def shell(form):
    return f'''<div class="rn-view signin__screen" style="position:absolute;inset:0;padding-top:{INSET_TOP + 20}px">
  <div class="rn-view signin__flex">
    <div class="rn-view rn-scroll signin__flex">
      <div class="rn-view signin__scrollBody" style="padding-bottom:{max(INSET_BOTTOM,16) + 8}px;flex:1 1 0%">
        {HEADER}
        <div class="rn-view signin__spacer"></div>
        {form}
      </div>
    </div>
  </div>
</div>'''

def email_step(mode='signup', value='', error=None, busy=False):
    valid = '@' in value
    note = ('we email you a link to set up your account. no password, no code to copy.'
            if mode == 'signup' else 'we email a link to your account. no password, no code to copy.')
    label = 'email me a sign-up link' if mode == 'signup' else 'email me a sign-in link'
    field = (f'<span class="rn-text">{value}</span>' if value
             else f'<span class="rn-text" style="color:{PLACEHOLDER}">you@somewhere.com</span>')
    err = f'<span class="rn-text signin__error">{error}</span>' if error else ''
    return f'''<div class="rn-view signin__form">
  {segment(mode)}
  <div class="rn-view signin__input rn-row" style="align-items:center">{field}</div>
  <span class="rn-text signin__note">{note}</span>
  {err}
  {bar('sending&hellip;' if busy else label, 'onOrange', disabled=not valid and not busy, loading=busy)}
  {LEGAL}
</div>'''

def sent_step(email='shalvi@gmail.com', error=None):
    err = f'<span class="rn-text signin__error">{error}</span>' if error else ''
    return f'''<div class="rn-view signin__form">
  <span class="rn-text signin__sentTitle">check your inbox.</span>
  <span class="rn-text signin__note">we sent a sign-in link to</span>
  <div class="rn-view signin__emailChip"><span class="rn-text signin__emailChipText">{email}</span></div>
  <span class="rn-text signin__note">tap &ldquo;verify &amp; continue&rdquo; and NearCast opens right back here, signed in.</span>
  <span class="rn-text signin__noteDim">the link expires shortly and works once. it can take a minute to arrive.</span>
  {err}
  {bar('resend the link', 'onOrange')}
  {quiet('use a different email')}
  {LEGAL}
</div>'''

def callback(error=None):
    if error:
        middle = (f'<div class="rn-view authcallback__middle">'
                  f'<span class="rn-text authcallback__title">sign-in link</span>'
                  f'<span class="rn-text authcallback__note">{error}</span></div>')
        action = bar('back to sign in', 'onOrange')
    else:
        middle = ('<div class="rn-view authcallback__middle">'
                  '<div class="rn-view" style="width:20px;height:20px;border-radius:999px;'
                  'border:2px solid #FF4D00;border-top-color:transparent"></div>'
                  '<span class="rn-text authcallback__note">signing you in&hellip;</span></div>')
        action = ''
    return f'''<div class="rn-view authcallback__screen" style="position:absolute;inset:0;padding-top:{INSET_TOP + 24}px;padding-bottom:{max(INSET_BOTTOM,16)}px">
  <span class="rn-text authcallback__wordmark">NEARCAST</span>
  {middle}
  {action}
</div>'''

NOTE_SIGNIN = ('Mirrored from <code>src/app/signin.tsx</code>; classes are <code>signin__*</code>, '
   'transpiled from that file&rsquo;s own <code>StyleSheet.create</code>. The placeholder is '
   '<code>hairlineOnCream</code> &mdash; ink at 12% &mdash; not a muted grey.')

write('a-open/auth/signin.html', 'sign in', NOTE_SIGNIN, [
  (phone(shell(email_step('signup'))), '<b>signup &middot; empty</b><em>CTA disabled until the email parses</em>'),
  (phone(shell(email_step('signup', 'piyush@gmail.com'))), '<b>signup &middot; ready</b><em>onOrange, enabled</em>'),
  (phone(shell(email_step('login', 'piyush@gmail.com'))), '<b>log in</b><em>same link; log in expects an existing account</em>'),
  (phone(shell(email_step('signup', 'piyush@gmail.com', busy=True))), '<b>sending</b><em>loader bars replace the label</em>'),
  (phone(shell(email_step('login', 'nobody@gmail.com',
      error='no account with that email yet. switch to sign up to create one.'))),
      '<b>error</b><em>readableError maps the Supabase failure</em>'),
  (phone(shell(sent_step())), '<b>sent</b><em>resend, and &ldquo;use a different email&rdquo; &mdash; not a dead end</em>'),
  (phone(shell(sent_step(error='too many tries. wait a minute, then ask for a new link.'))),
      '<b>sent &middot; rate limited</b><em>the state you hit tonight</em>'),
])

NOTE_CB = ('Mirrored from <code>src/app/auth/callback.tsx</code>. Supabase rejects a bad link at the '
   'verify and redirects back with the reason in the URL; <code>describeCallbackError</code> maps it. '
   'Before commit <code>82d2642</code> all four printed the same sentence.')

write('a-open/auth/callback.html', 'magic-link callback', NOTE_CB, [
  (phone(callback()), '<b>exchanging</b><em>PKCE code for a session</em>'),
  (phone(callback('that link was already used, or a newer one replaced it. ask for a new one and open only the latest email.')),
      '<b>otp_expired</b><em>a consumed link &mdash; a scanner, or a newer request</em>'),
  (phone(callback('that link expired. ask for a new one.')), '<b>expired</b><em>genuinely timed out</em>'),
  (phone(callback('that link is no longer valid. ask for a new one.')), '<b>access_denied</b>'),
  (phone(callback('that sign-in link didn&rsquo;t work. ask for a new one.')), '<b>unknown</b><em>the fallback</em>'),
])
print('auth: signin.html, callback.html')

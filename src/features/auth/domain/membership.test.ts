import { describe, expect, it } from 'vitest';

import {
  describeRedeemOutcome,
  deriveMembership,
  displayNameSchema,
  emailSchema,
  otpCodeSchema,
  resolveRedirect,
} from './membership';

describe('membership derivation', () => {
  it('waits rather than guessing before the session is resolved', () => {
    expect(
      deriveMembership({
        isResolved: false,
        hasSession: false,
        hasProfile: false,
        hasHomeArea: false,
      }),
    ).toBe('loading');
  });

  it('treats a signed-in identity without a profile as awaiting an invitation', () => {
    expect(
      deriveMembership({
        isResolved: true,
        hasSession: true,
        hasProfile: false,
        hasHomeArea: false,
      }),
    ).toBe('awaiting_invite');
  });

  it('recognises a member only once a profile and an area both exist', () => {
    expect(
      deriveMembership({
        isResolved: true,
        hasSession: true,
        hasProfile: true,
        hasHomeArea: true,
      }),
    ).toBe('member');
    expect(
      deriveMembership({
        isResolved: true,
        hasSession: false,
        hasProfile: false,
        hasHomeArea: false,
      }),
    ).toBe('signed_out');
  });

  it('holds a profile with no area at awaiting_area, since it is eligible for nothing', () => {
    expect(
      deriveMembership({
        isResolved: true,
        hasSession: true,
        hasProfile: true,
        hasHomeArea: false,
      }),
    ).toBe('awaiting_area');
  });
});

describe('route access', () => {
  it('holds still while membership is unknown', () => {
    expect(resolveRedirect('loading', ['(tabs)'])).toBeNull();
    expect(resolveRedirect('loading', ['sign-in'])).toBeNull();
  });

  it('sends a signed-out viewer to sign-in from any protected route', () => {
    expect(resolveRedirect('signed_out', ['(tabs)'])).toBe('/sign-in');
    expect(resolveRedirect('signed_out', ['room', 'abc'])).toBe('/sign-in');
    expect(resolveRedirect('signed_out', ['create'])).toBe('/sign-in');
  });

  it('keeps a signed-in stranger out of the app until an invitation is redeemed', () => {
    expect(resolveRedirect('awaiting_invite', ['(tabs)'])).toBe('/sign-in');
    expect(resolveRedirect('awaiting_invite', ['room', 'abc'])).toBe('/sign-in');
    expect(resolveRedirect('awaiting_area', ['(tabs)'])).toBe('/sign-in');
  });

  it('leaves the public routes reachable while not yet a member', () => {
    expect(resolveRedirect('signed_out', ['sign-in'])).toBeNull();
    expect(resolveRedirect('awaiting_invite', ['sign-in'])).toBeNull();
    expect(resolveRedirect('awaiting_invite', ['invite', 'token-1'])).toBeNull();
  });

  it('leaves the public intent link open to everyone, in both directions', () => {
    expect(resolveRedirect('signed_out', ['i', 'slug-1'])).toBeNull();
    expect(resolveRedirect('awaiting_invite', ['i', 'slug-1'])).toBeNull();
    expect(resolveRedirect('member', ['i', 'slug-1'])).toBeNull();
  });

  it('moves a member off the join routes and leaves them alone elsewhere', () => {
    expect(resolveRedirect('member', ['sign-in'])).toBe('/');
    expect(resolveRedirect('member', ['invite', 'token-1'])).toBe('/');
    expect(resolveRedirect('member', ['(tabs)'])).toBeNull();
    expect(resolveRedirect('member', [])).toBeNull();
  });
});

describe('credential validation', () => {
  it('normalises an email and rejects a malformed one', () => {
    expect(emailSchema.parse('  Asha@Nearcast.APP ')).toBe('asha@nearcast.app');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('accepts only a six-digit code', () => {
    expect(otpCodeSchema.parse(' 123456 ')).toBe('123456');
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(otpCodeSchema.safeParse('1234567').success).toBe(false);
    expect(otpCodeSchema.safeParse('12a456').success).toBe(false);
  });

  it('mirrors the database display-name constraint', () => {
    expect(displayNameSchema.parse('  Asha Rao  ')).toBe('Asha Rao');
    expect(displayNameSchema.safeParse('   ').success).toBe(false);
    expect(displayNameSchema.safeParse('x'.repeat(61)).success).toBe(false);
    expect(displayNameSchema.safeParse('x'.repeat(60)).success).toBe(true);
  });
});

describe('redemption messaging', () => {
  it('gives missing, expired and used invitations one indistinguishable message', () => {
    expect(describeRedeemOutcome('invalid_invite')).toBe(
      'That invitation cannot be used. Check the code with whoever invited you.',
    );
  });

  it('separates a throttle from a refusal, which leaks nothing', () => {
    expect(describeRedeemOutcome('rate_limited')).toContain('Too many attempts');
  });
});

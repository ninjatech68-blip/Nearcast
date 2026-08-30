import { describe, expect, it } from 'vitest';

import { INTENT_STATUSES } from '@/features/intents/domain/lifecycle';
import {
  acceptsResponses,
  availableOwnerActions,
  canOwnerTake,
  describeMaterialChanges,
  describeStatus,
} from './owner-actions';

const now = new Date('2026-08-30T12:00:00Z');
const future = new Date('2026-08-31T12:00:00Z');
const past = new Date('2026-08-29T12:00:00Z');

describe('owner actions', () => {
  it('offers the full set only while an intent is live', () => {
    expect(availableOwnerActions('live')).toEqual([
      'edit',
      'withdraw',
      'resolve',
      'duplicate',
    ]);
  });

  it('stops offering edit once a match is coordinating', () => {
    expect(canOwnerTake('matched', 'edit')).toBe(false);
    expect(canOwnerTake('matched', 'resolve')).toBe(true);
  });

  it('never offers an action the server would refuse on a closed intent', () => {
    for (const status of ['resolved', 'expired', 'withdrawn'] as const) {
      expect(canOwnerTake(status, 'edit')).toBe(false);
      expect(canOwnerTake(status, 'withdraw')).toBe(false);
      expect(canOwnerTake(status, 'resolve')).toBe(false);
      expect(canOwnerTake(status, 'duplicate')).toBe(true);
    }
  });

  it('offers nothing on a restricted intent', () => {
    expect(availableOwnerActions('restricted')).toEqual([]);
  });

  it('has an explicit answer for every status the database can hold', () => {
    for (const status of INTENT_STATUSES) {
      expect(Array.isArray(availableOwnerActions(status))).toBe(true);
      expect(describeStatus(status).length).toBeGreaterThan(0);
    }
  });
});

describe('status copy', () => {
  it('says plainly when an intent no longer takes responses', () => {
    expect(describeStatus('withdrawn')).toContain('no longer accepting responses');
    expect(describeStatus('expired')).toContain('no longer accepting responses');
  });

  it('does not reveal why an intent is under review', () => {
    expect(describeStatus('restricted')).toBe('Under review');
  });

  it('never implies activity that has not happened', () => {
    for (const status of INTENT_STATUSES) {
      expect(describeStatus(status)).not.toMatch(/people|viewing|popular|trending/i);
    }
  });
});

describe('response acceptance', () => {
  it('mirrors the insert policy: live and unexpired only', () => {
    expect(acceptsResponses('live', future, now)).toBe(true);
    expect(acceptsResponses('live', past, now)).toBe(false);
    expect(acceptsResponses('withdrawn', future, now)).toBe(false);
    expect(acceptsResponses('matched', future, now)).toBe(false);
  });
});

describe('material change copy', () => {
  it('says nothing when nothing material changed', () => {
    expect(describeMaterialChanges([])).toBeNull();
  });

  it('names a single change', () => {
    expect(describeMaterialChanges(['price'])).toBe(
      'The price changed after you responded',
    );
  });

  it('names several changes without inventing detail', () => {
    expect(describeMaterialChanges(['price', 'location'])).toBe(
      'The price and location changed after you responded',
    );
    expect(describeMaterialChanges(['time', 'price', 'location'])).toBe(
      'The timing, price and location changed after you responded',
    );
  });
});

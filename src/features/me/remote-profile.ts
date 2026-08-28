/**
 * A person's public profile, for a live app. Person screens read this
 * instead of the fixture roster, so a real user id resolves to a real
 * name, attendance record and trust distance — never a raw uuid, never
 * a fabricated count.
 */

import { useEffect, useState } from 'react';

import { getSupabase } from '@/infrastructure/supabase/client';

export type PublicProfile = {
  id: string;
  firstName: string;
  area: string | null;
  receipts: number;
  flakes: number;
  memberSince: string | null;
  trustPhrase: string;
  hasReceiptWithViewer: boolean;
};

export function profilesEnabled(): boolean {
  return getSupabase() !== null;
}

export async function fetchPublicProfile(personId: string): Promise<PublicProfile | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.rpc('get_public_profile', { target: personId });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as
    | {
        id: string;
        first_name: string | null;
        area: string | null;
        receipts: number | null;
        flakes: number | null;
        member_since: string | null;
        trust_phrase: string | null;
        has_receipt_with_viewer: boolean | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name ?? 'someone',
    area: row.area,
    receipts: row.receipts ?? 0,
    flakes: row.flakes ?? 0,
    memberSince: row.member_since,
    trustPhrase: row.trust_phrase ?? 'not in your network',
    hasReceiptWithViewer: row.has_receipt_with_viewer ?? false,
  };
}

/** "31 plans made real · 0 flakes" — the receipts line, from real counts. */
export function receiptsLine(receipts: number, flakes: number): string {
  const plans = `${receipts} ${receipts === 1 ? 'plan' : 'plans'} made real`;
  return flakes > 0 ? `${plans} · ${flakes} ${flakes === 1 ? 'flake' : 'flakes'}` : plans;
}

/** signal bars from a real receipt count: earned, never fabricated. */
export function signalLit(receipts: number): number {
  if (receipts >= 20) return 5;
  if (receipts >= 10) return 4;
  if (receipts >= 4) return 3;
  if (receipts >= 1) return 2;
  return 1;
}


/**
 * A person's first name for a title/label. In a live app it is fetched
 * from the backend; in the fixture build the caller's local roster is
 * the source, so this returns null and the caller falls back to it.
 * Never blocks the screen — starts as null and fills in.
 */
export function usePersonFirstName(personId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!profilesEnabled() || !personId) return;
    let cancelled = false;
    void fetchPublicProfile(personId)
      .then((profile) => {
        if (!cancelled && profile) setName(profile.firstName);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [personId]);
  return name;
}

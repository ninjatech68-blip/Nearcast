/**
 * Attendance data layer, backend mode. Reporting presence, the plans I
 * still owe a report on, my own outcomes, and shared history with a
 * person — each keyed off the matches the DB already holds, and each
 * private by RLS.
 *
 * The client speaks 'no-show'; the DB enum is 'no_show'. That one
 * mapping lives here so nothing above this file has to know.
 */

import type { PresenceReport } from '@/features/casts/domain/attendance';
import { getSupabase } from '@/infrastructure/supabase/client';

export type RemotePlanToReport = {
  intent_id: string;
  title: string;
  area: string | null;
  starts_at: string | null;
  subject_id: string;
  subject_first_name: string | null;
};

export type RemoteReceipt = {
  intent_id: string;
  title: string;
  area: string | null;
  starts_at: string | null;
  outcome: 'receipt' | 'flake' | 'withdrawn' | 'disputed' | 'unverified';
  other_names: string[] | null;
};

export type RemoteSharedHistory = { plans: number; receipts: number; flakes: number };

export function attendanceEnabled(): boolean {
  return getSupabase() !== null;
}

function toDbReport(report: PresenceReport): 'showed' | 'no_show' {
  return report === 'showed' ? 'showed' : 'no_show';
}

export async function reportPresenceRemote(
  intentId: string,
  subjectId: string,
  report: PresenceReport,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('report_presence', {
    target_intent: intentId,
    subject: subjectId,
    report: toDbReport(report),
  });
  if (error) throw new Error(error.message);
}

export async function fetchPlansToReport(): Promise<readonly RemotePlanToReport[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('plans_to_report');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemotePlanToReport[];
}

export async function fetchReceipts(): Promise<readonly RemoteReceipt[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('my_receipts');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteReceipt[];
}

export async function fetchSharedHistory(personId: string): Promise<RemoteSharedHistory> {
  const c = getSupabase();
  if (!c) return { plans: 0, receipts: 0, flakes: 0 };
  const { data, error } = await c.rpc('shared_history_with', { person: personId });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as RemoteSharedHistory | undefined;
  return row ?? { plans: 0, receipts: 0, flakes: 0 };
}

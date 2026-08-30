import { useRouter, useSegments } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchMembershipFacts,
  subscribeToAuthChanges,
} from '@/features/auth/data/auth-repository';
import {
  deriveMembership,
  resolveRedirect,
  type Membership,
} from '@/features/auth/domain/membership';

type SessionValue = {
  membership: Membership;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
  membership: 'loading',
  refresh: async () => undefined,
});

export function useSession(): SessionValue {
  return useContext(SessionContext);
}

/**
 * Resolves membership once, then follows Supabase auth changes.
 *
 * Membership is treated as unknown until the first read completes, so a
 * protected route is never rendered on an optimistic guess and never redirects
 * a member to sign-in during a cold start.
 */
/** An unreadable session is treated as signed out rather than trusted. */
async function readMembership(): Promise<Membership> {
  try {
    const facts = await fetchMembershipFacts();

    return deriveMembership({ isResolved: true, ...facts });
  } catch {
    return 'signed_out';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [membership, setMembership] = useState<Membership>('loading');
  const isMounted = useRef(true);

  // Declared inside the effect so the mount path never calls setState
  // synchronously from the effect body.
  useEffect(() => {
    isMounted.current = true;

    async function resolve() {
      const next = await readMembership();
      if (isMounted.current) setMembership(next);
    }

    void resolve();

    const unsubscribe = subscribeToAuthChanges(() => {
      void resolve();
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  // Called from event handlers only, where setState is expected.
  const refresh = useCallback(async () => {
    const next = await readMembership();
    if (isMounted.current) setMembership(next);
  }, []);

  const value = useMemo(() => ({ membership, refresh }), [membership, refresh]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/**
 * Applies the pure redirect rules to the current route. Kept separate from the
 * provider so the decision stays testable without a navigator.
 */
export function useMembershipRedirect(): void {
  const { membership } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const destination = resolveRedirect(membership, segments as string[]);

    if (destination !== null) router.replace(destination);
  }, [membership, router, segments]);
}

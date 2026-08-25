import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/infrastructure/supabase/client';

/**
 * Session state for the app shell.
 *
 * `status` distinguishes the three states the UI must render differently:
 * `loading` while the persisted session is restored, `signed-out` when there
 * is no session, and `signed-in` once a session exists. A signed-in user may
 * still have no profile, because a profile is only created by redeeming an
 * invitation. Route guards therefore check `hasProfile`, not just `status`.
 */
export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

export type SessionState = {
  status: SessionStatus;
  userId: string | null;
  hasProfile: boolean;
  displayName: string | null;
  error: string | null;
};

type SessionValue = SessionState & {
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const initialState: SessionState = {
  status: 'loading',
  userId: null,
  hasProfile: false,
  displayName: null,
  error: null,
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initialState);

  const loadProfile = useCallback(async (userId: string | null): Promise<void> => {
    if (!userId) {
      setState({ ...initialState, status: 'signed-out' });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // A read failure must not be reported as "no profile", which would send
      // an existing user back through invitation redemption.
      setState({
        status: 'signed-in',
        userId,
        hasProfile: false,
        displayName: null,
        error: 'We could not load your profile. Check your connection and try again.',
      });
      return;
    }

    setState({
      status: 'signed-in',
      userId,
      hasProfile: data !== null,
      displayName: data?.display_name ?? null,
      error: null,
    });
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void loadProfile(data.session?.user.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      void loadProfile(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<SessionValue>(
    () => ({
      ...state,
      refreshProfile: () => loadProfile(state.userId),
      signOut: async () => {
        await supabase.auth.signOut();
        setState({ ...initialState, status: 'signed-out' });
      },
    }),
    [loadProfile, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return value;
}

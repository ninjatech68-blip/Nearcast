import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

/**
 * Screens read server state through TanStack Query, so tests must provide a
 * client. Retries are disabled so an error state asserts immediately rather
 * than after a backoff.
 */
export function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return rtlRender(ui, { wrapper: Wrapper });
}

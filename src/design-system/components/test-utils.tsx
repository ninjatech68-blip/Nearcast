import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../theme';

/** Render inside the theme, in light or dark. */
export function renderThemed(ui: ReactElement, scheme: 'light' | 'dark' = 'light') {
  return render(<ThemeProvider appearance={scheme}>{ui}</ThemeProvider>);
}

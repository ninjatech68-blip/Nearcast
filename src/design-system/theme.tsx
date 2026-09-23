import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { themes, tokens, type ColorScheme, type ThemeColors } from './tokens';

export type AppearancePreference = 'system' | 'light' | 'dark';

type Theme = { scheme: ColorScheme; colors: ThemeColors; tokens: typeof tokens };

const ThemeContext = createContext<Theme | null>(null);

/** Follows the system appearance unless the user picked one in Settings (S25). */
export function ThemeProvider({
  appearance = 'system',
  children,
}: {
  appearance?: AppearancePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme: ColorScheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const value = useMemo(() => ({ scheme, colors: themes[scheme], tokens }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

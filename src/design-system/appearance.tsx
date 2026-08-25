import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { APPEARANCES, colorsFor, type Appearance, type ColorScheme } from './tokens';

const AppearanceContext = createContext<Appearance | null>(null);

const isAppearance = (value: unknown): value is Appearance =>
  APPEARANCES.includes(value as Appearance);

/**
 * Pins an appearance for a subtree. Without a provider the system setting is
 * used, falling back to the light appearance when the platform reports nothing.
 */
export function AppearanceProvider({
  appearance,
  children,
}: {
  appearance: Appearance;
  children: ReactNode;
}) {
  return <AppearanceContext.Provider value={appearance}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): Appearance {
  const pinned = useContext(AppearanceContext);
  const system = useColorScheme();

  if (pinned !== null) {
    return pinned;
  }

  return isAppearance(system) ? system : 'light';
}

/** The semantic palette for the active appearance. */
export function useColors(): ColorScheme {
  return colorsFor(useAppearance());
}

/**
 * Reduced motion replaces large movement with immediate state feedback, so
 * durations collapse to zero rather than merely shortening.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduced(enabled);
        }
      })
      .catch(() => {
        // Treat an unavailable accessibility bridge as "motion allowed".
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/** Resolve an approved motion duration against the reduced-motion setting. */
export function useMotionDuration(duration: number): number {
  return useReducedMotion() ? 0 : duration;
}

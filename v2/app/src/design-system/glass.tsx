import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/**
 * Whether to render real Liquid Glass.
 *
 * `isLiquidGlassAvailable()` is iOS 26 + Xcode 26 + the app not having
 * set `UIDesignRequiresCompatibility`. On anything else it is false and
 * `GlassView` degrades to a plain `View`, so every call site still
 * passes real styles for the flat case.
 *
 * Reduce Transparency is a separate question the module's own docs point
 * at: availability can be true while the system is limiting the effect.
 * It is read asynchronously and can change while the app is open, so it
 * is state with a subscription. An earlier version of this read the
 * promise synchronously inside a `useMemo`, which meant the value was
 * always the initial `false` and the setting was never honoured.
 */
export function useGlass(): boolean {
  const supported = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
      if (alive) setReduced(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, [supported]);

  return supported && !reduced;
}

/**
 * `GlassView` with the props the native view actually takes.
 *
 * The Swift side declares `borderRadius`, the per-corner radii and
 * `borderCurve` and applies them to the UIVisualEffectView. The
 * published TypeScript types declare none of them. Passing a radius
 * through `style` instead is not equivalent: it rounds the React Native
 * container while the effect inside stays square, which is the
 * difference between glass and a blurred rectangle with a mask.
 *
 * So this widens the type in one place, with the reason attached, rather
 * than every call site casting or quietly using the wrong mechanism.
 */
type GlassProps = ViewProps & {
  glassEffectStyle?: 'clear' | 'regular' | 'none';
  tintColor?: string;
  isInteractive?: boolean;
  colorScheme?: 'auto' | 'light' | 'dark';
  /** native: shapes the effect itself, not just its container */
  borderRadius?: number;
  borderCurve?: 'circular' | 'continuous';
  style?: StyleProp<ViewStyle>;
};

const Typed = GlassView as unknown as React.ComponentType<GlassProps>;

export function Glass(props: GlassProps) {
  return <Typed {...props} />;
}

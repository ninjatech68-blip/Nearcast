import type { ExpoConfig } from 'expo/config';

export type AppVariant = 'development' | 'preview' | 'production';

const variants: Record<AppVariant, { name: string; scheme: string; appId: string }> = {
  development: { name: 'TrueGoing Dev', scheme: 'truegoing-dev', appId: 'com.truegoing.app.dev' },
  preview: { name: 'TrueGoing', scheme: 'truegoing', appId: 'com.truegoing.app' },
  production: { name: 'TrueGoing', scheme: 'truegoing', appId: 'com.truegoing.app' },
};

const brandGreen = '#0F5E46';
const splashCanvas = '#F7F3EA';
const splashCanvasDark = '#0E1714';

export function buildAppConfig(variant: AppVariant): ExpoConfig {
  const identity = variants[variant];
  if (!identity) throw new Error(`Unknown APP_VARIANT: ${String(variant)}`);

  return {
    name: identity.name,
    slug: 'truegoing',
    version: '0.1.1',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: identity.appId,
    },
    android: {
      package: identity.appId,
      adaptiveIcon: {
        backgroundColor: brandGreen,
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: splashCanvas,
          image: './assets/images/splash-icon.png',
          imageWidth: 88,
          dark: { backgroundColor: splashCanvasDark },
        },
      ],
      'expo-sqlite',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
}

// Unset means development, so a build that forgets APP_VARIANT gets the dev
// identity and fails loudly at submission instead of shipping as the store app.
export default (): ExpoConfig =>
  buildAppConfig((process.env.APP_VARIANT ?? 'development') as AppVariant);

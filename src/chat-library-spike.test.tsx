import { describe, expect, it } from '@jest/globals';
import { render as rawRender } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Chat } from '@kesha-antonov/react-native-chat';
import { ME, toChatMessages } from '@/features/chat/adapter';
import { chatTheme } from '@/features/chat/theme';
import type { Message } from '@/features/chat/chat';

/**
 * Does the chat library still work on this React Native?
 *
 * That was the one risk reading the source could not retire: the library is
 * young, and the app is on React Native 0.86 with the New Architecture and the
 * React Compiler. This mounts it for real — no mock of the library itself —
 * with our adapter's output, our theme, and the reply, reaction and
 * long-press configuration the product depends on.
 *
 * What it deliberately does NOT assert: that message text appears. The
 * messages container keeps its content hidden until it has measured itself,
 * and nothing measures anything under jest, so the list paints no rows here
 * however many layout events are faked. Whether bubbles actually draw is a
 * question only a device build answers, and it is answered there.
 *
 * What this still catches, which is the point: a version bump that breaks the
 * import graph, the provider tree, the theme shape, or the prop contract.
 * Every one of those has been a real failure mode during this integration.
 */
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function render(ui: React.ReactElement) {
  return rawRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

const messages: Message[] = [
  { id: 'm1', from: 'them', text: 'are you coming?', time: '18:02', createdAt: '2026-08-31T12:32:00.000Z' },
  { id: 'm2', from: 'me', text: 'on my way', time: '18:04', createdAt: '2026-08-31T12:34:00.000Z', status: 'read' },
];

describe('the chat library on this React Native', () => {
  it('mounts with our messages and theme', async () => {
    const view = await render(
      <Chat
        messages={toChatMessages(messages, 'Asha')}
        user={{ _id: ME }}
        theme={chatTheme}
        onSend={() => undefined}
      />,
    );

    expect(view.getByTestId('GC_WRAPPER')).toBeTruthy();
    expect(view.getByTestId('GC_CONTENT')).toBeTruthy();
  });

  it('accepts the reply, reaction and long-press configuration the product needs', async () => {
    const view = await render(
      <Chat
        messages={toChatMessages(messages, 'Asha')}
        user={{ _id: ME }}
        theme={chatTheme}
        onSend={() => undefined}
        reply={{ swipe: { isEnabled: true, direction: 'left' } }}
        reactions={{ isEnabled: true, emojis: ['👍', '❤️'] }}
        messageActions={[{ label: 'copy', onPress: () => undefined }]}
        isDayAnimationEnabled
      />,
    );

    expect(view.getByTestId('GC_WRAPPER')).toBeTruthy();
  });

  it('maps a location share and a private media path away from its URL fields', () => {
    const [mine] = toChatMessages(
      [
        {
          id: 'm3',
          from: 'me',
          text: '',
          time: '18:10',
          latitude: 12.97,
          longitude: 77.64,
          mediaPath: 'chat/private.jpg',
          mediaKind: 'image',
        },
      ],
      'Asha',
    );

    expect(mine.location).toEqual({ latitude: 12.97, longitude: 77.64 });
    // a private bucket path must never land in `image`, which expects a URI
    expect(mine.image).toBeUndefined();
    expect(mine.mediaPath).toBe('chat/private.jpg');
  });
});

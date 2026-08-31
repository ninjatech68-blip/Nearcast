import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, userEvent } from '@testing-library/react-native';

import { Ticks } from '@/features/chat/ui/message-list';
import type { NearcastChatMessage } from '@/features/chat/adapter';

/**
 * The five receipt states.
 *
 * The chat library models three — pending, sent, received — so these ticks
 * replace its own rather than shading them. This is the riskiest thing the
 * integration keeps custom, and it is worth testing directly because the
 * library's own subtree cannot be rendered under jest.
 */
const mockRetry = jest.fn<(id: string) => void>();

function message(overrides: Partial<NearcastChatMessage> = {}): NearcastChatMessage {
  return {
    _id: 'm1',
    text: 'on my way',
    createdAt: new Date('2026-08-31T12:00:00.000Z'),
    user: { _id: 'me' },
    ...overrides,
  };
}

describe('receipt ticks', () => {
  beforeEach(() => {
    mockRetry.mockReset();
  });

  it('shows nothing for a message with no state, rather than an empty tick', async () => {
    const view = await render(<Ticks message={message()} onRetry={mockRetry} />);

    expect(view.toJSON()).toBeNull();
  });

  it('marks a message still going out', async () => {
    const view = await render(<Ticks message={message({ status: 'pending' })} onRetry={mockRetry} />);

    expect(view.getByText('·')).toBeTruthy();
  });

  it('distinguishes sent, delivered and read', async () => {
    const sent = await render(<Ticks message={message({ status: 'sent' })} onRetry={mockRetry} />);
    expect(sent.getByText('✓')).toBeTruthy();

    const delivered = await render(
      <Ticks message={message({ status: 'delivered' })} onRetry={mockRetry} />,
    );
    expect(delivered.getByText('✓✓')).toBeTruthy();

    const read = await render(<Ticks message={message({ status: 'read' })} onRetry={mockRetry} />);
    expect(read.getByText('✓✓')).toBeTruthy();
  });

  /**
   * The mapping that matters. A failed message must never wear a tick: a tick
   * says "this went", and the whole point is that it did not. It says so in
   * words and offers the way to fix it.
   */
  it('never shows a tick on a failed message, and offers the retry', async () => {
    const view = await render(<Ticks message={message({ status: 'failed' })} onRetry={mockRetry} />);

    expect(view.queryByText('✓')).toBeNull();
    expect(view.queryByText('✓✓')).toBeNull();
    expect(view.getByText(/not sent/)).toBeTruthy();
  });

  it('retries the right message when the failure is tapped', async () => {
    const user = userEvent.setup();
    const view = await render(
      <Ticks message={message({ _id: 'm7', status: 'failed' })} onRetry={mockRetry} />,
    );

    await user.press(view.getByRole('button', { name: 'message failed, tap to try again' }));

    expect(mockRetry).toHaveBeenCalledWith('m7');
  });

  it('puts no ticks on a system notice, which nobody sent', async () => {
    const view = await render(
      <Ticks message={message({ system: true, status: 'sent' })} onRetry={mockRetry} />,
    );

    expect(view.toJSON()).toBeNull();
  });
});

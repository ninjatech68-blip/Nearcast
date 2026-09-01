import { describe, expect, it, jest } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Dock, DOCK_PAGES, type DockPage } from './dock';
import { tokens } from '../tokens';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 59, left: 0, right: 0, bottom: 34 } };

async function renderDock(props: Partial<React.ComponentProps<typeof Dock>> = {}) {
  const onGo = jest.fn();
  const view = await rawRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Dock
        current="near"
        fieldFg={tokens.primitive.color.cream}
        collapse={new Animated.Value(0)}
        initials="PS"
        onGo={onGo as (page: DockPage) => void}
        {...props}
      />
    </SafeAreaProvider>,
  );
  return { view, onGo };
}

type Node = { props?: { style?: unknown }; children?: readonly unknown[] };

function countWhere(root: Node, pick: (style: Record<string, unknown>) => boolean): number {
  const style = root.props?.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  const here = flat && typeof flat === 'object' && pick(flat as Record<string, unknown>) ? 1 : 0;
  const kids = (root.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null);
  return here + kids.reduce((n, child) => n + countWhere(child, pick), 0);
}

describe('dock', () => {
  it('offers three destinations and no action', async () => {
    const { view } = await renderDock();

    expect(DOCK_PAGES).toEqual(['near', 'inbox', 'you']);
    for (const page of DOCK_PAGES) {
      expect(view.getByRole('button', { name: new RegExp(`^${page}`) })).toBeTruthy();
    }
    // casting left the dock for the top right. A bar that is only
    // destinations is why three columns balance without a middle slot to
    // hang the odd one on.
    expect(view.queryByRole('button', { name: /cast/ })).toBeNull();
    expect(view.getAllByRole('button')).toHaveLength(DOCK_PAGES.length);
  });

  it('carries the field through its own body rather than covering it', async () => {
    const { view } = await renderDock();
    const tree = view.toJSON() as unknown as Node;

    // The dock has a surface now, which the previous one refused on the
    // grounds that a bar with its own shade takes a tenth of the field
    // away. Glass is the exception that argument allows: it refracts the
    // colour rather than replacing it. So the test is not "no surface",
    // it is "no opaque surface" -- nothing in here may paint a flat
    // ground over the poster.
    for (const opaque of [tokens.semantic.color.cream, tokens.semantic.color.ink]) {
      expect(countWhere(tree, (s) => s.backgroundColor === opaque)).toBe(0);
    }
  });

  it('marks the selected destination with a capsule inside the glass', async () => {
    const { view } = await renderDock({ current: 'inbox' });

    expect(view.getByRole('button', { name: 'inbox' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'near' }).props.accessibilityState).toMatchObject({ selected: false });
    // exactly one capsule, and it belongs to the selected slot
    const capsules = countWhere(view.toJSON() as unknown as Node, (s) => s.borderRadius === tokens.component.dock.capsuleRadius);
    expect(capsules).toBe(1);
  });

  it('collapses to a single mark that is still a control', async () => {
    // The old rail animated to opacity 0 on scroll and went on
    // swallowing taps, which is the bug the previous dock existed to
    // make unrepresentable. Collapsing is not that: what is left is
    // smaller and moved, never invisible, and it still routes.
    const user = userEvent.setup();
    const { view, onGo } = await renderDock({ collapse: new Animated.Value(1) });

    const home = view.getByRole('button', { name: /^near/ });
    expect(home).toBeTruthy();
    await user.press(home);
    expect(onGo).toHaveBeenCalledWith('near');
  });

  it('counts only what is waiting, and shows nothing at zero', async () => {
    const quiet = await renderDock({ inboxCount: 0 });
    expect(quiet.view.getByRole('button', { name: 'inbox' })).toBeTruthy();
    expect(quiet.view.queryByText('0', { includeHiddenElements: true })).toBeNull();

    // one badge on one destination, because chats and alerts are one
    // place now. The spoken label never rounds; the badge caps at 9+.
    const busy = await renderDock({ inboxCount: 13 });
    expect(busy.view.getByRole('button', { name: 'inbox, 13 waiting' })).toBeTruthy();
    expect(busy.view.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
  });

  it('announces each destination exactly once', async () => {
    const { view } = await renderDock({ current: 'near', inboxCount: 2 });

    for (const [name, count] of [['near', 0], ['inbox', 2], ['you', 0]] as const) {
      const label = count > 0 ? `${name}, ${count} waiting` : name;
      expect(view.getAllByRole('button', { name: label })).toHaveLength(1);
    }
  });

  it('routes a tap to the page it names', async () => {
    const user = userEvent.setup();
    const { view, onGo } = await renderDock();

    await user.press(view.getByRole('button', { name: 'you' }));
    expect(onGo).toHaveBeenCalledWith('you');
  });
});

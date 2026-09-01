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

/** the nearest ancestor that declares pointerEvents, walking up from a node. */
function findPointerEvents(node: { parent?: unknown; props?: { pointerEvents?: string } } | null): string | undefined {
  let at = node as { parent?: unknown; props?: { pointerEvents?: string } } | null;
  while (at) {
    if (at.props?.pointerEvents) return at.props.pointerEvents;
    at = (at.parent ?? null) as typeof at;
  }
  return undefined;
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

  it('marks the selected destination with an untinted lens', async () => {
    const { view } = await renderDock({ current: 'inbox' });

    expect(view.getByRole('button', { name: 'inbox' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'near' }).props.accessibilityState).toMatchObject({ selected: false });
    // one lens, and it belongs to the selected slot. It carries no
    // colour at all -- it is a `clear` glass element in a `regular` bar,
    // and the difference between the materials is the indicator.
    const tinted = countWhere(view.toJSON() as unknown as Node, (s) => typeof s.backgroundColor === 'string' && s.backgroundColor !== 'transparent');
    expect(tinted).toBe(0);
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

  it('is one element in both states, not two cross-faded', async () => {
    // The first version rendered an expanded dock AND a collapsed one,
    // fading between them, which is not the same object moving. There is
    // one container; collapse changes its width and its left edge.
    const expanded = await renderDock({ collapse: new Animated.Value(0) });
    const collapsed = await renderDock({ collapse: new Animated.Value(1) });

    // every destination is present in both states -- collapsed hides
    // them with opacity, so they are still reachable by assistive tech
    // and there is no second tree to fall out of sync.
    for (const page of DOCK_PAGES) {
      expect(expanded.view.getAllByRole('button', { name: new RegExp(`^${page}`) })).toHaveLength(1);
      expect(collapsed.view.getAllByRole('button', { name: new RegExp(`^${page}`) })).toHaveLength(1);
    }
    expect(collapsed.view.getAllByRole('button')).toHaveLength(DOCK_PAGES.length);
  });

  it('stops the faded marks taking taps once collapsed', async () => {
    // opacity is not hit testing. An opacity-0 view in React Native
    // still receives touches -- the exact failure the rail two designs
    // ago shipped. The two outer marks sit outside the contracted
    // circle, so without this they would be invisible and still eating
    // taps meant for the content behind them.
    const { view } = await renderDock({ collapse: new Animated.Value(1), collapsed: true });
    const inbox = view.getByRole('button', { name: 'inbox' });
    expect(findPointerEvents(inbox)).toBe('none');
    // and `near` is what the circle keeps, so it stays a target
    const near = view.getByRole('button', { name: /^near/ });
    expect(findPointerEvents(near)).not.toBe('none');
  });

  it('contracts to a circle without animating its radius', () => {
    // the geometry the morph rests on: a pill whose height is its corner
    // diameter becomes a circle at that height, so the radius is
    // constant and only width and position move.
    const { dock } = tokens.component;
    expect(dock.height).toBe(dock.radius * 2);
    expect(dock.collapsedSize).toBe(dock.height);
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

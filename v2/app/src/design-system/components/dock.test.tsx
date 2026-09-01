import { describe, expect, it, jest } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Dock, DOCK_PAGES, type DockPage } from './dock';
import { tokens } from '../tokens';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 59, left: 0, right: 0, bottom: 34 } };

async function renderDock(props: Partial<React.ComponentProps<typeof Dock>> = {}) {
  const onGo = jest.fn();
  const onCast = jest.fn();
  const view = await rawRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Dock
        current="near"
        fieldFg={tokens.primitive.color.cream}
        blend={new Animated.Value(0)}
        initials="PS"
        onGo={onGo as (page: DockPage) => void}
        onCast={onCast}
        {...props}
      />
    </SafeAreaProvider>,
  );
  return { view, onGo, onCast };
}

type Node = { props?: { style?: unknown }; children?: readonly unknown[] };

/** every node carrying an explicit background of this colour. */
function paintedWith(root: Node, color: string): number {
  const style = root.props?.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  const here = flat && typeof flat === 'object' && (flat as { backgroundColor?: string }).backgroundColor === color ? 1 : 0;
  const kids = (root.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null);
  return here + kids.reduce((n, child) => n + paintedWith(child, color), 0);
}

describe('dock', () => {
  it('offers four destinations and one action, and nothing else', async () => {
    const { view } = await renderDock();

    for (const page of DOCK_PAGES) {
      expect(view.getByRole('button', { name: new RegExp(`^${page}`) })).toBeTruthy();
    }
    expect(view.getByRole('button', { name: 'cast something' })).toBeTruthy();
    expect(view.getAllByRole('button')).toHaveLength(DOCK_PAGES.length + 1);
  });

  it('marks the selected slot without filling it', async () => {
    const { view } = await renderDock({ current: 'alerts' });

    expect(view.getByRole('button', { name: 'alerts' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: 'near' }).props.accessibilityState).toMatchObject({ selected: false });
    // selection is a colour change and nothing else. the only accent
    // fill left in the dock is the cast button; a selected destination
    // adds none, so the count of filled shapes does not move with it.
    const filled = (page: 'near' | 'alerts') => paintedWith(view.toJSON() as unknown as Node, tokens.semantic.color.accent);
    expect(filled('alerts')).toBe(1);
  });

  it('keeps every mark on one line at one size', async () => {
    const { view } = await renderDock();
    const { dock } = tokens.component;

    // the cast button is centred on the same midpoint as the marks, so
    // the five columns read as one row rather than four plus an outlier.
    const markMid = dock.iconTop + dock.icon / 2;
    const castMid = dock.cast.top + dock.cast.size / 2;
    expect(castMid).toBe(markMid);
    // and the label line clears the tallest thing above it
    expect(dock.labelTop).toBeGreaterThan(dock.cast.top + dock.cast.size);
    // the selected mark grows about the centre of a fixed box, so it can
    // never push the label line down as selection moves along the row
    expect(dock.selectedScale).toBeGreaterThan(1);
    expect(dock.icon * dock.selectedScale).toBeLessThan(dock.cast.size);
    expect(view.getByRole('button', { name: 'cast something' })).toBeTruthy();
  });

  it('never paints itself a surface, so the poster runs to the bottom edge', async () => {
    const { view } = await renderDock();

    // the only opaque things are the accent compose button; nothing
    // renders a ground of its own behind the marks.
    for (const ground of [tokens.semantic.color.cream, tokens.semantic.color.ink]) {
      expect(paintedWith(view.toJSON() as unknown as Node, ground)).toBe(0);
    }
  });

  it('counts only what is waiting, and shows nothing at zero', async () => {
    const quiet = await renderDock({ chatCount: 0, alertCount: 0 });
    expect(quiet.view.getByRole('button', { name: 'chats' })).toBeTruthy();
    expect(quiet.view.queryByText('0', { includeHiddenElements: true })).toBeNull();

    const busy = await renderDock({ chatCount: 2, alertCount: 11 });
    expect(busy.view.getByRole('button', { name: 'chats, 2 waiting' })).toBeTruthy();
    // the badge caps its width at 9+; the spoken label never rounds, so
    // a screen reader hears the real number.
    expect(busy.view.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
    expect(busy.view.getByRole('button', { name: 'alerts, 11 waiting' })).toBeTruthy();
  });

  it('announces each destination exactly once, despite the cross-fade layers', async () => {
    const { view } = await renderDock({ current: 'near', chatCount: 2, alertCount: 3 });

    // Every INACTIVE mark is drawn twice over, once per cross-fade colour
    // layer; the selected one is drawn once, in the pressable row, since
    // it is opaque on its accent pill and needs no fading. Without hiding
    // the faded copies a screen reader walks "chats" three times before
    // it reaches alerts.
    // Every label is drawn twice, once per cross-fade colour layer, and
    // both copies are hidden: the pressable row is what a screen reader
    // walks. Without hiding them it heard "chats" three times before it
    // reached alerts.
    for (const label of ['near', 'chats', 'alerts', 'you', 'cast']) {
      expect(view.queryAllByText(label, { includeHiddenElements: true }).length).toBe(2);
      expect(view.queryAllByText(label)).toHaveLength(0);
    }
    // and each slot is reachable exactly once, through its own control
    for (const [name, count] of [['near', 0], ['chats', 2], ['alerts', 3], ['you', 0]] as const) {
      const label = count > 0 ? `${name}, ${count} waiting` : name;
      expect(view.getAllByRole('button', { name: label })).toHaveLength(1);
    }
  });

  it('routes a tap to the page it names', async () => {
    const user = userEvent.setup();
    const { view, onGo, onCast } = await renderDock();

    await user.press(view.getByRole('button', { name: 'you' }));
    expect(onGo).toHaveBeenCalledWith('you');

    await user.press(view.getByRole('button', { name: 'cast something' }));
    expect(onCast).toHaveBeenCalled();
  });
});

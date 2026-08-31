import { describe, expect, it, jest } from '@jest/globals';
import { render as rawRender, userEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Dock, DOCK_PAGES, type DockPage } from './dock';
import { category as categoryTokens, tokens } from '../tokens';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 59, left: 0, right: 0, bottom: 34 } };

async function renderDock(props: Partial<React.ComponentProps<typeof Dock>> = {}) {
  const onGo = jest.fn();
  const onCast = jest.fn();
  const view = await rawRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Dock
        current="near"
        fieldFg={tokens.primitive.color.cream}
        fieldBg={categoryTokens.games.field}
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

type PaintedStyle = { backgroundColor?: string; width?: unknown; minWidth?: unknown };

/** the flattened style of every node that declares a background. */
function paintedNodes(root: Node): PaintedStyle[] {
  const style = root.props?.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  const here =
    flat && typeof flat === 'object' && (flat as PaintedStyle).backgroundColor ? [flat as PaintedStyle] : [];
  const kids = (root.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null);
  return kids.reduce((all, child) => all.concat(paintedNodes(child)), here);
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
    // selection is a colour change and nothing else. the one filled
    // shape in the dock is the cast chip, drawn once per cross-fade
    // layer — its fill is the layer's foreground, so the field layer
    // paints cream and the cream layer paints ink. a selected
    // destination adds no fill of any colour, on either layer.
    const filled = (color: string) => paintedWith(view.toJSON() as unknown as Node, color);
    expect(filled(tokens.primitive.color.cream)).toBe(1);
    expect(filled(tokens.primitive.color.ink)).toBe(1);

    const quiet = await renderDock({ current: 'near' });
    const filledQuiet = (color: string) => paintedWith(quiet.view.toJSON() as unknown as Node, color);
    expect(filledQuiet(tokens.primitive.color.cream)).toBe(1);
    expect(filledQuiet(tokens.primitive.color.ink)).toBe(1);
  });

  // THE REGRESSION THIS PINS: the chip was accent orange with an ink
  // ring, which meant it had no relationship to any of the ten fields —
  // a sticker on arts and games, and the same colour as the poster on
  // social, which is what the ring was bolted on to rescue. It now takes
  // the field's poles like every other control (`polesFor` in tokens),
  // so accent survives in the dock only where a colour belonging to no
  // field is the whole point: the counts.
  it('fills the cast chip from the field, never from the accent', async () => {
    const { view } = await renderDock({ chatCount: 0, alertCount: 0 });
    expect(paintedWith(view.toJSON() as unknown as Node, tokens.semantic.color.accent)).toBe(0);

    // and on a light field the chip flips with it, rather than staying
    // one fixed colour the ground has to cope with.
    const light = await renderDock({
      fieldFg: tokens.primitive.color.ink,
      fieldBg: categoryTokens.sports.field,
      chatCount: 0,
      alertCount: 0,
    });
    expect(paintedWith(light.view.toJSON() as unknown as Node, tokens.semantic.color.accent)).toBe(0);
    // ink on both layers now: the field's foreground AND the cream page's.
    expect(paintedWith(light.view.toJSON() as unknown as Node, tokens.primitive.color.ink)).toBe(2);
  });

  it('brings the accent back for a count, which belongs to no field', async () => {
    const { view } = await renderDock({ chatCount: 3, alertCount: 0 });
    expect(paintedWith(view.toJSON() as unknown as Node, tokens.semantic.color.accent)).toBe(1);
  });

  it('keeps every mark on one line at one size', async () => {
    const { view } = await renderDock();
    const { dock } = tokens.component;

    // the cast button is centred on the same midpoint as the marks, so
    // the five columns read as one row rather than four plus an outlier.
    const markMid = dock.iconTop + dock.icon / 2;
    const castMid = dock.cast.top + dock.cast.size / 2;
    expect(castMid).toBe(markMid);
    // The label line clears the marks. It is NOT compared against the
    // cast chip any more: the chip is taller than the mark line by
    // design and its column prints no label, so there is nothing under
    // it to collide with.
    expect(dock.labelTop).toBeGreaterThan(dock.iconTop + dock.icon * dock.selectedScale);
    // the chip is the largest shape in the row, and stays so
    expect(dock.cast.size).toBeGreaterThan(dock.icon * dock.selectedScale);
    // the selected mark grows about the centre of a fixed box, so it can
    // never push the label line down as selection moves along the row
    expect(dock.selectedScale).toBeGreaterThan(1);
    expect(dock.icon * dock.selectedScale).toBeLessThan(dock.cast.size);
    expect(view.getByRole('button', { name: 'cast something' })).toBeTruthy();
  });

  it('never paints itself a surface, so the poster runs to the bottom edge', async () => {
    const { view } = await renderDock();

    // The dock paints marks, never a plane. Asserting "nothing is ever
    // painted cream or ink" used to say that, but only because the chip
    // was accent; it would now fail for the chip itself, which is a mark.
    // So measure the thing that actually matters: every painted shape is
    // chip-sized or smaller, and nothing spans the row.
    const painted = paintedNodes(view.toJSON() as unknown as Node);
    expect(painted.length).toBeGreaterThan(0);
    for (const style of painted) {
      expect(typeof style.width === 'number' || typeof style.minWidth === 'number').toBe(true);
      const w = (style.width ?? style.minWidth) as number;
      expect(w).toBeLessThanOrEqual(tokens.component.dock.cast.size);
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
    for (const label of ['near', 'chats', 'alerts', 'you']) {
      expect(view.queryAllByText(label, { includeHiddenElements: true }).length).toBe(2);
      expect(view.queryAllByText(label)).toHaveLength(0);
    }
    // The cast chip prints no label at all, in any layer. It is a filled
    // action with the glyph punched out of it, so a word underneath
    // repeats the shape — and beside four tab labels it read as stray
    // text sitting behind the button, which is how it was reported.
    expect(view.queryAllByText('cast', { includeHiddenElements: true })).toHaveLength(0);
    // and it is still reachable, by its accessibility label
    expect(view.getByRole('button', { name: 'cast something' })).toBeTruthy();
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

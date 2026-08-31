#!/usr/bin/env node
/**
 * Extract a screen's real StyleSheet.create object and transpile it to CSS.
 *
 * The point is to remove interpretation. Every value below comes from the
 * app's own source with the real token object resolved behind it, so the
 * mockup cannot drift from the app by my misreading a colour or a size.
 *
 * React Native's box model is not CSS's, and the differences are exactly
 * where a hand-built mockup goes wrong:
 *   - a View is `display:flex; flex-direction:column` by default; a div is
 *     block with row flex. Every View class therefore carries `.rn-view`.
 *   - `flex: 1` means `flex: 1 1 0%`, not `flex: 1 1 auto`.
 *   - RN has no margin collapsing and every box is border-box.
 *   - paddingHorizontal/Vertical have no CSS equivalent and must be split.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { tokens, fontFamily, category, polesFor } = require('./.tokens.cjs');

const FONTS = {
  BricolageGrotesque_800ExtraBold: ["'Bricolage Grotesque', system-ui, sans-serif", 800],
  BricolageGrotesque_600SemiBold:  ["'Bricolage Grotesque', system-ui, sans-serif", 600],
  BricolageGrotesque_400Regular:   ["'Bricolage Grotesque', system-ui, sans-serif", 400],
  IBMPlexMono_400Regular: ["'IBM Plex Mono', ui-monospace, monospace", 400],
  IBMPlexMono_500Medium:  ["'IBM Plex Mono', ui-monospace, monospace", 500],
  IBMPlexMono_600SemiBold:["'IBM Plex Mono', ui-monospace, monospace", 600],
};

const px = (v) => (typeof v === 'number' ? `${v}px` : String(v));

/** one RN style key -> zero or more CSS declarations */
function decl(k, v) {
  const out = [];
  const push = (p, val) => out.push([p, val]);
  switch (k) {
    case 'paddingHorizontal': push('padding-left', px(v)); push('padding-right', px(v)); break;
    case 'paddingVertical':   push('padding-top', px(v)); push('padding-bottom', px(v)); break;
    case 'marginHorizontal':  push('margin-left', px(v)); push('margin-right', px(v)); break;
    case 'marginVertical':    push('margin-top', px(v)); push('margin-bottom', px(v)); break;
    case 'paddingTop': case 'paddingBottom': case 'paddingLeft': case 'paddingRight':
    case 'marginTop': case 'marginBottom': case 'marginLeft': case 'marginRight':
      push(k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase()), px(v)); break;
    case 'padding': case 'margin': push(k, px(v)); break;
    case 'flex': push('flex', v === 1 ? '1 1 0%' : String(v)); break;
    case 'flexGrow': case 'flexShrink': push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), String(v)); break;
    case 'flexBasis': push('flex-basis', px(v)); break;
    case 'flexDirection': push('flex-direction', v); break;
    case 'flexWrap': push('flex-wrap', v); break;
    case 'alignItems': case 'alignSelf': case 'justifyContent': case 'alignContent':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), v); break;
    case 'gap': case 'rowGap': case 'columnGap':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), px(v)); break;
    case 'width': case 'height': case 'minWidth': case 'minHeight':
    case 'maxWidth': case 'maxHeight': case 'top': case 'bottom': case 'left': case 'right':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), px(v)); break;
    case 'backgroundColor': push('background-color', v); break;
    case 'color': push('color', v); break;
    case 'opacity': push('opacity', String(v)); break;
    case 'borderRadius': push('border-radius', px(v)); break;
    case 'borderTopLeftRadius': case 'borderTopRightRadius':
    case 'borderBottomLeftRadius': case 'borderBottomRightRadius':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), px(v)); break;
    case 'borderWidth': push('border-width', px(v)); push('border-style', 'solid'); break;
    case 'borderTopWidth': case 'borderBottomWidth': case 'borderLeftWidth': case 'borderRightWidth':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), px(v)); push('border-style','solid'); break;
    case 'borderColor': push('border-color', v); break;
    case 'borderTopColor': case 'borderBottomColor': case 'borderLeftColor': case 'borderRightColor':
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), v); break;
    case 'position': push('position', v); break;
    case 'zIndex': push('z-index', String(v)); break;
    case 'overflow': push('overflow', v); break;
    case 'textAlign': push('text-align', v); break;
    case 'textTransform': push('text-transform', v); break;
    case 'textDecorationLine': push('text-decoration', v === 'none' ? 'none' : 'underline'); break;
    case 'fontSize': push('font-size', px(v)); break;
    case 'lineHeight': push('line-height', px(v)); break;
    case 'letterSpacing': push('letter-spacing', px(v)); break;
    case 'fontWeight': push('font-weight', String(v)); break;
    case 'fontStyle': push('font-style', v); break;
    case 'fontFamily': {
      const f = FONTS[v];
      if (f) { push('font-family', f[0]); push('font-weight', String(f[1])); }
      else push('font-family', v);
      break;
    }
    case 'transform': break;   // handled per-screen where it matters
    case 'shadowColor': case 'shadowOffset': case 'shadowOpacity':
    case 'shadowRadius': case 'elevation': break;   // RN shadows, not ported
    case 'includeFontPadding': case 'textAlignVertical': break;
    default:
      push(k.replace(/([A-Z])/g, m => '-' + m.toLowerCase()), typeof v === 'number' ? px(v) : String(v));
  }
  return out;
}

/** pull `const styles = StyleSheet.create({ ... });` out of a source file */
function extract(src) {
  const i = src.indexOf('StyleSheet.create(');
  if (i < 0) return null;
  let j = src.indexOf('{', i), depth = 0, end = -1;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
  }
  return src.slice(j, end);
}

function transpile(file, prefix) {
  const src = fs.readFileSync(file, 'utf8');
  const literal = extract(src);
  if (!literal) throw new Error(`no StyleSheet in ${file}`);
  // strip TS-only syntax the evaluator would choke on
  const cleaned = literal.replace(/\bas const\b/g, '').replace(/(\w+)!: /g, '$1: ');
  const sandbox = {
    tokens, fontFamily, category, polesFor,
    Platform: { OS: 'ios', select: (o) => o.ios ?? o.default },
    Dimensions: { get: () => ({ width: 402, height: 874 }) },
  };
  // Module-level aliases the stylesheet leans on, e.g. dock.tsx's
  // `const dock = tokens.component.dock`. Without these the eval fails on
  // a name that is perfectly ordinary in the source.
  for (const m of src.matchAll(/^const (\w+) = (tokens[\w.]*|fontFamily[\w.]*);/gm)) {
    try { sandbox[m[1]] = vm.runInNewContext(m[2], { tokens, fontFamily }); } catch {}
  }
  const styles = vm.runInNewContext('(' + cleaned + ')', sandbox);
  const lines = [`/* ${path.relative(path.join(__dirname, '../..'), file)} — transpiled from its own StyleSheet.create */`];
  for (const [name, obj] of Object.entries(styles)) {
    if (!obj || typeof obj !== 'object') continue;
    const decls = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      for (const [p, val] of decl(k, v)) decls.push(`  ${p}: ${val};`);
    }
    if (!decls.length) continue;
    lines.push(`.${prefix}__${name} {\n${decls.join('\n')}\n}`);
  }
  return lines.join('\n');
}

const BASE = `/* React Native box-model defaults, so a div behaves like a View.
   These are the differences that silently break a hand-built mockup. */
.rn-view { display: flex; flex-direction: column; align-items: stretch;
  flex-shrink: 0; position: relative; min-height: 0; min-width: 0; box-sizing: border-box; }
.rn-text { display: block; box-sizing: border-box; margin: 0; }
.rn-row  { flex-direction: row; }
.rn-scroll { overflow: hidden; }
`;

if (require.main === module) {
  const targets = JSON.parse(fs.readFileSync(path.join(__dirname, 'targets.json'), 'utf8'));
  const root = path.join(__dirname, '../..');
  const out = [BASE];
  for (const { file, prefix } of targets) {
    try { out.push(transpile(path.join(root, file), prefix)); }
    catch (e) { console.error(`! ${file}: ${e.message}`); }
  }
  fs.writeFileSync(path.join(__dirname, 'screens.css'), out.join('\n\n') + '\n');
  console.log(`screens.css: ${out.length - 1} stylesheets`);
}
module.exports = { transpile };

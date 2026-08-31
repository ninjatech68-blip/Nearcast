/**
 * Turn each captured page into a standalone static snapshot.
 *
 * The DOM and the CSS are the app's own: react-native-web compiled every
 * StyleSheet into real rules, and expo-router rendered the real component
 * tree. Scripts are stripped — this is a snapshot of what the app painted,
 * not a running copy of it — and the two webfonts are pulled from Google
 * so the type matches without shipping binaries.
 */
const fs = require('fs'), path = require('path');
const IN = path.join(__dirname, 'shots2');
const OUT = '/home/user/Nearcast/docs/mockup/app';
fs.mkdirSync(OUT, { recursive: true });

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@' +
  '12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">';

let n = 0;
for (const f of fs.readdirSync(IN).filter((x) => x.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(IN, f), 'utf8');
  if (html.length < 2000) continue;
  html = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]*rel="preload"[^>]*>/g, '')
    .replace(/<head>/, '<head>' + FONTS)
    // the app's own font faces name the Expo asset files; map them onto the
    // Google families so the snapshot renders with the real type.
    .replace(/font-family:\s*"?BricolageGrotesque_800ExtraBold"?/g,
             'font-family:"Bricolage Grotesque";font-weight:800')
    .replace(/font-family:\s*"?BricolageGrotesque_600SemiBold"?/g,
             'font-family:"Bricolage Grotesque";font-weight:600')
    .replace(/font-family:\s*"?BricolageGrotesque_400Regular"?/g,
             'font-family:"Bricolage Grotesque";font-weight:400')
    .replace(/font-family:\s*"?IBMPlexMono_600SemiBold"?/g,
             'font-family:"IBM Plex Mono";font-weight:600')
    .replace(/font-family:\s*"?IBMPlexMono_500Medium"?/g,
             'font-family:"IBM Plex Mono";font-weight:500')
    .replace(/font-family:\s*"?IBMPlexMono_400Regular"?/g,
             'font-family:"IBM Plex Mono";font-weight:400');
  fs.writeFileSync(path.join(OUT, f), html);
  const png = f.replace(/\.html$/, '.png');
  if (fs.existsSync(path.join(IN, png))) fs.copyFileSync(path.join(IN, png), path.join(OUT, png));
  n++;
}
console.log(`packaged ${n} screens`);

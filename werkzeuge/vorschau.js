// Erzeugt Vorschaubilder (Open Graph, 1200 × 630) und trägt die Meta-Angaben in die Seiten ein.
//
// Die Liste der Seiten steht in werkzeuge/vorschau.json:
//   { "basis": "https://kaffeeundkommiss.github.io/<repo>/", "ordner": "vorschau",
//     "seiten": [ { "datei": "index.html", "bild": "start", "kicker": "…", "titel": "…", "unter": "…", "karte": "svg.kartesvg" } ] }
// Ohne "unter" wird die Beschreibung (meta description) der Seite verwendet. "karte" ist optional:
// ein Selektor, dessen Element rechts im Bild erscheint. "vorlage" ist optional: eine Quelldatei,
// aus der die Seite erzeugt wird; sie erhält dieselben Meta-Angaben.
//
// Das Bild wird aus der Seite selbst gebaut (Leiste, Kopfband, Schriften), damit es zum Design passt.
// Aufruf im Repo-Ordner:  npm install playwright  &&  npx playwright install chromium  &&  node werkzeuge/vorschau.js
// Nach Änderungen an Titeln, Beschreibungen oder Kopfband neu ausführen.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const WURZEL = path.resolve(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'vorschau.json'), 'utf8'));
const ORDNER = path.join(WURZEL, CFG.ordner);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rendern({ kicker, titel, unter, karte, adresse }) {
  const beschreibung = (document.querySelector('meta[name="description"]') || {}).content || '';
  const leiste = document.querySelector('.kk-leiste');
  const kopf = document.querySelector('.kk-kopf, header.top');
  const kartenEl = karte ? document.querySelector(karte) : null;
  const kartenKopie = kartenEl ? kartenEl.cloneNode(true) : null;
  document.documentElement.setAttribute('data-theme', 'light');
  document.body.innerHTML = '';
  if (leiste) {
    const l = leiste.cloneNode(true);
    l.querySelectorAll('.kk-bereiche').forEach((n) => n.remove());
    document.body.appendChild(l);
  }
  if (kopf) {
    const k = kopf.cloneNode(true);
    k.querySelectorAll('.badges').forEach((n) => n.remove());
    document.body.appendChild(k);
  }
  const karteHtml = kartenKopie ? '<div class="vs-karte"></div>' : '';
  const box = document.createElement('div');
  box.className = 'vs' + (kartenKopie ? ' vs-mit-karte' : '');
  box.innerHTML = '<div class="vs-text"><div class="vs-kicker"></div><div class="vs-titel"></div><div class="vs-unter"></div></div>' + karteHtml;
  box.querySelector('.vs-kicker').textContent = kicker || '';
  box.querySelector('.vs-titel').textContent = titel;
  box.querySelector('.vs-unter').textContent = unter || beschreibung;
  if (kartenKopie) {
    kartenKopie.removeAttribute('width'); kartenKopie.removeAttribute('height');
    box.querySelector('.vs-karte').appendChild(kartenKopie);
  }
  document.body.appendChild(box);
  const fuss = document.createElement('div');
  fuss.className = 'vs-fuss';
  fuss.innerHTML = '<span></span><span>Jede Angabe mit Quelle</span>';
  fuss.firstChild.textContent = adresse;
  document.body.appendChild(fuss);
  const stil = document.createElement('style');
  stil.textContent = `
    html,body{margin:0;width:1200px;height:630px;overflow:hidden}
    body{background:var(--kk-grund);display:flex;flex-direction:column}
    .kk-leiste .kk-in,.kk-kopf .kk-in,.kk-kopf .wrap,header.top .wrap{max-width:none!important;padding-left:56px!important;padding-right:56px!important;margin:0!important}
    .kk-leiste{font-size:15px}
    .vs{flex:1;display:flex;gap:40px;align-items:center;padding:0 56px;min-height:0}
    .vs-text{flex:1;min-width:0}
    .vs-kicker{font:600 20px/1.2 var(--kk-titel);letter-spacing:.12em;text-transform:uppercase;color:var(--kk-akzent);margin-bottom:10px}
    .vs-titel{font:700 66px/1.0 var(--kk-titel);text-transform:uppercase;color:var(--kk-tinte);letter-spacing:.005em}
    .vs-unter{font:400 25px/1.4 var(--kk-text);color:var(--kk-grau);margin-top:18px;max-width:900px;
      display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .vs-mit-karte .vs-titel{font-size:58px}
    .vs-mit-karte .vs-unter{font-size:22px}
    .vs-karte{flex:0 0 490px;height:calc(100% - 28px);margin:14px 0;display:flex;align-items:center;justify-content:center;padding:0 24px;box-sizing:border-box;overflow:hidden;background:var(--k-land,transparent);outline:1px solid var(--kk-linie)}
    .vs-karte svg{width:100%;height:100%;max-height:100%;overflow:visible}
    .vs-fuss{display:flex;justify-content:space-between;padding:14px 56px;border-top:3px solid var(--kk-akzent);
      background:var(--kk-papier);font:600 18px/1 var(--kk-mono);color:var(--kk-tinte)}
    .vs-fuss span:last-child{color:var(--kk-grau);font-weight:500}`;
  document.head.appendChild(stil);
}

function metaBlock(s, url, bild, bildAlt) {
  return [
    '<!-- Vorschau für Linkvorschauen, erzeugt mit werkzeuge/vorschau.js -->',
    `<meta property="og:image" content="${esc(bild)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(bildAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${esc(bild)}">`
  ];
}

function eintragen(datei, s, bildUrl, quelle) {
  const pfad = path.join(WURZEL, quelle || datei);
  let html = fs.readFileSync(pfad, 'utf8');
  // frühere Ausgabe dieses Skripts entfernen
  html = html.replace(/<!-- Vorschau für Linkvorschauen, erzeugt mit werkzeuge\/vorschau\.js -->\n(?:<meta (?:property="og:image[^"]*"|name="twitter:(?:card|image)")[^>]*>\n)*/g, '');
  const url = CFG.basis + (datei === 'index.html' ? '' : datei);
  const titel = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || s.titel;
  const beschr = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const zeilen = [];
  if (!/rel="canonical"/.test(html)) zeilen.push(`<link rel="canonical" href="${esc(url)}">`);
  const og = (p, v) => { if (!new RegExp(`property="og:${p}"`).test(html)) zeilen.push(`<meta property="og:${p}" content="${v}">`); };
  og('type', 'website'); og('locale', 'de_DE'); og('site_name', esc(CFG.site_name)); og('title', titel); og('description', beschr); og('url', esc(url));
  zeilen.push(...metaBlock(s, url, bildUrl, s.titel === CFG.site_name ? s.titel : `${s.titel}: ${CFG.site_name}`));
  const anker = /(<meta name="description"[^>]*>\n)/;
  const ogUrl = /(<meta property="og:url"[^>]*>\n)/;
  const ziel = ogUrl.test(html) ? ogUrl : anker;
  if (!ziel.test(html)) throw new Error('Kein Einfügepunkt in ' + datei);
  html = html.replace(ziel, (m) => m + zeilen.join('\n') + '\n');
  fs.writeFileSync(pfad, html);
}

(async () => {
  fs.mkdirSync(ORDNER, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light' });
  for (const s of CFG.seiten) {
    await page.goto('file://' + path.join(WURZEL, s.datei), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const adresse = (CFG.basis + (s.datei === 'index.html' ? '' : s.datei)).replace(/^https:\/\//, '').replace(/\/$/, '');
    await page.evaluate(rendern, { ...s, adresse });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const ziel = path.join(ORDNER, s.bild + '.jpg');
    await page.screenshot({ path: ziel, type: 'jpeg', quality: 88 });
    const v = crypto.createHash('sha1').update(fs.readFileSync(ziel)).digest('hex').slice(0, 8);
    eintragen(s.datei, s, `${CFG.basis}${CFG.ordner}/${s.bild}.jpg?v=${v}`);
    if (s.vorlage) eintragen(s.datei, s, `${CFG.basis}${CFG.ordner}/${s.bild}.jpg?v=${v}`, s.vorlage);
    console.log('Vorschaubild:', path.relative(WURZEL, ziel), '←', s.datei);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

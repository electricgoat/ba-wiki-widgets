// FragCalc on a live character page in each skin the wiki offers: the table of the preview built from the unsaved parse
// (fragcount.html; fragcount-mobile.html for phones, whose images the mobile view serves as placeholders), its stylesheet
// as TemplateStyles serves it, and the script run as ResourceLoader runs the gadget. Read-only: reads pages and sends
// drafts to action=parse; nothing is edited. Needs Chrome or Edge, the network, and the previews built (build-preview.mjs).
// Run, from the repository root: node FragCalc/test/skin-check.mjs [outdir] [scenario]   (screenshots go to outdir, the system temp folder by default)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const outdir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'fragcalc-skins-'));
const only = process.argv[3];
const headers = {'User-Agent': 'ba-wiki-widgets FragCalc preview builder'};
const phone = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const browserPath = process.env.FRAGCALC_TEST_BROWSER || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(file => fs.existsSync(file));

// Phones get the mobile view (MobileFrontend) in Citizen too, but Minerva is their default
const scenarios = [
    {name: 'vector-desktop', skin: 'vector', width: 1280},
    {name: 'citizen-desktop-light', skin: 'citizen', width: 1280},
    {name: 'citizen-desktop-dark', skin: 'citizen', width: 1280, night: true},
    {name: 'citizen-tablet', skin: 'citizen', width: 800},
    {name: 'citizen-phone-light', skin: 'citizen', width: 390, phone: true},
    {name: 'citizen-phone-dark', skin: 'citizen', width: 390, phone: true, night: true},
    {name: 'minerva-phone', skin: 'minerva', width: 390, phone: true},
];

async function sanitize(title, css) {
    const body = new URLSearchParams({action: 'parse', format: 'json', formatversion: '2', contentmodel: 'wikitext', prop: 'text', title: 'Shiroko',
        text: `<templatestyles src="${title}" />`, templatesandboxtitle: title, templatesandboxcontentmodel: 'sanitized-css', templatesandboxtext: css});
    const result = await (await fetch('https://bluearchive.wiki/w/api.php', {method: 'POST', body, headers})).json();
    return result.parse.text.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
}

const tableOf = file => read(file).match(/<table class="wikitable ba-template-fragcalc[\s\S]*?<\/table>/)[0];
const tables = {desktop: tableOf('fragcount.html'), phone: tableOf('fragcount-mobile.html')};
// Template:Rank's stylesheet comes with the table, from the parse
const css = await sanitize('Template:FragCalc/styles.css', read('style.css'));
const gadget = read('fragcount.js');

// The table goes where the stat table is, before it (Minerva's mobile view collapses that section: there, at the start of
// the lead section); the skin handles it as page content; then the script runs
const place = (table, night) => `(async () => {
    const html = document.documentElement;
    if (${night}) html.className = html.className.replace(/skin-theme-clientpref-(day|os)/, 'skin-theme-clientpref-night');
    const anchor = document.querySelector('.skin-minerva #mf-section-0 > *') || document.querySelector('.character-stattable');
    const box = document.createElement('div');
    box.id = 'fragcalc-placed';
    box.innerHTML = '<style>' + ${JSON.stringify(css)} + '</style>' + ${JSON.stringify(table)};
    const target = anchor.closest('.citizen-overflow-wrapper') || anchor;
    target.parentNode.insertBefore(box, target);
    mw.hook('wikipage.content').fire($(box));
    Function('$', 'jQuery', ${JSON.stringify(gadget)})(jQuery, jQuery);
    await new Promise(resolve => setTimeout(resolve, 1500));
    box.scrollIntoView({block: 'start'});
    await new Promise(resolve => setTimeout(resolve, 1500));
    const calc = box.querySelector('.ba-template-fragcalc');
    const wrapper = calc.parentElement == box ? calc : calc.parentElement;
    const shown = '.fragcalc-panel, .fragcalc-tier, .fragcalc-summary';
    return {
        skin: [...document.body.classList].find(name => /^skin-(citizen|minerva|vector)/.test(name)),
        width: Math.round(calc.getBoundingClientRect().width),
        pageScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tableScroll: wrapper.scrollWidth - wrapper.clientWidth,
        controlLines: new Set([...calc.querySelectorAll('.fragcalc-rank, .fragcalc-field')].map(part => Math.round(part.getBoundingClientRect().top))).size,
        images: [...calc.querySelectorAll(shown)].reduce((count, part) => count + [...part.querySelectorAll('img')].filter(img => img.complete && img.naturalWidth > 0).length, 0),
        placeholders: [...calc.querySelectorAll(shown)].reduce((count, part) => count + part.querySelectorAll('.lazy-image-placeholder').length, 0),
    };
})()`;

if (!browserPath) throw new Error('Set FRAGCALC_TEST_BROWSER to a Chrome or Edge executable.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fragcalc-browser-'));
const browser = spawn(browserPath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timeout')), 20000);
    browser.stderr.on('data', chunk => {
        const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
    });
});
const ws = new WebSocket(endpoint);
await new Promise(resolve => ws.addEventListener('open', resolve, {once: true}));
let nextId = 0, sessionId;
const pending = new Map(), exceptions = [];
let loaded = false;
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method == 'Page.loadEventFired') loaded = true;
    if (message.method == 'Runtime.exceptionThrown') exceptions.push((message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text).split('\n')[0]);
    const promise = pending.get(message.id);
    if (!promise) return;
    pending.delete(message.id);
    message.error ? promise.reject(new Error(JSON.stringify(message.error))) : promise.resolve(message.result);
});
// Browser-wide commands go without a session (null: an undefined one would fall back to the default)
const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
});

let failed = 0;
for (const scenario of scenarios.filter(scenario => !only || scenario.name == only)) {
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'}, null);
    ({sessionId} = await send('Target.attachToTarget', {targetId, flatten: true}, null));
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: scenario.width, height: 900, deviceScaleFactor: scenario.phone ? 2 : 1, mobile: !!scenario.phone});
    if (scenario.phone) await send('Emulation.setUserAgentOverride', {userAgent: phone});
    loaded = false;
    exceptions.length = 0;
    await send('Page.navigate', {url: `https://bluearchive.wiki/wiki/Shiroko?useskin=${scenario.skin}`});
    for (let wait = 0; wait < 300 && !loaded; wait++) await new Promise(resolve => setTimeout(resolve, 100));
    await new Promise(resolve => setTimeout(resolve, 2500));
    // What the page throws on its own is told apart from what happens once the calculator is on it
    const pageErrors = exceptions.splice(0);
    const result = await send('Runtime.evaluate', {expression: place(tables[scenario.phone ? 'phone' : 'desktop'], !!scenario.night), awaitPromise: true, returnByValue: true});
    const metrics = result.exceptionDetails ? {error: result.exceptionDetails.exception?.description || result.exceptionDetails.text} : result.result.value;
    const ok = !metrics.error && metrics.skin.includes(scenario.skin) && metrics.pageScroll <= 0 && metrics.tableScroll <= 0
        && metrics.images == 27 && metrics.placeholders == 0 && !exceptions.length;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${scenario.name}`, JSON.stringify(metrics), exceptions.length ? 'errors: ' + JSON.stringify(exceptions) : '',
        pageErrors.length ? '(the page itself: ' + JSON.stringify(pageErrors) + ')' : '');

    if (!metrics.error) {
        const clip = (await send('Runtime.evaluate', {returnByValue: true, expression: `(box => ({x: Math.max(0, box.left - 8) + scrollX,
            y: box.top + scrollY - 8, width: Math.min(innerWidth, box.width + 16), height: box.height + 16}))(document.getElementById('fragcalc-placed').getBoundingClientRect())`})).result.value;
        const shot = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip: {...clip, scale: 1}});
        fs.writeFileSync(path.join(outdir, `${scenario.name}.png`), Buffer.from(shot.data, 'base64'));
    }
    await send('Target.closeTarget', {targetId}, null);
}
console.log('Screenshots:', outdir);
ws.close();
browser.kill();
setTimeout(() => { try { fs.rmSync(profile, {recursive: true, force: true}); } catch {} process.exit(failed ? 1 : 0); }, 500);

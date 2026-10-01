// StatCalc as built (dist/StatCalc.js) against a baseline on live pages in each skin, read-only: the page gets each script in
// turn, swapped for the gadget's code in its ResourceLoader response, the same actions are played on both (clicks, typing,
// sorting, filtering), and everything they show is compared. The baseline is the live script's current revision unless
// --baseline names a file; the candidate is dist/StatCalc.js unless --candidate names a file, or is "served": whatever the
// wiki serves, untouched, to check a deploy. Needs Chrome or Edge (STATCALC_TEST_BROWSER names another Chromium executable)
// and the network.
// Run from the repository root: node StatCalc/test/live-check.mjs [--baseline file] [--candidate file|served] [filter ...]
// A filter keeps the runs whose "page/skin" contains it (Shiroko, minerva, StatChart/vector). Exits 1 when anything differs,
// the candidate throws or a page doesn't load the gadget.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { output, livePage } from '../build.mjs';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const baselineFile = option('--baseline'), candidateFile = option('--candidate') || output;
const filters = args;
const headers = {'User-Agent': 'ba-wiki-widgets StatCalc check'};
const phone = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const browserPath = process.env.STATCALC_TEST_BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(file => fs.existsSync(file));

// Shiroko: 3★, unique gear, two other versions; Yoshimi: 1★ with gear; Airi: 2★; Hoshino (Battle) Attacker: a form whose
// affection tables all come from its other versions; the stat chart: every character in one table
const pages = ['Shiroko', 'Yoshimi', 'Airi', 'Hoshino (Battle) Attacker', 'Characters StatChart'];
const skins = [
    {name: 'vector', query: 'useskin=vector', width: 1280},
    {name: 'citizen', query: 'useskin=citizen', width: 1280},
    {name: 'citizen-mobile', query: 'useskin=citizen&useformat=mobile', width: 390, phone: true},
    {name: 'minerva', query: 'useskin=minerva', width: 390, phone: true},
];
const runs = pages.flatMap(page => skins.map(skin => ({page, skin}))).filter(run => !filters.length || filters.some(f => `${run.page}/${run.skin.name}`.includes(f)));

let baseline, baselineName;
if (baselineFile) { baseline = fs.readFileSync(baselineFile, 'utf8'); baselineName = baselineFile; }
else { const page = await livePage(); baseline = page.content; baselineName = `${page.title} revision ${page.revid}`; }
const served = candidateFile == 'served';
const scripts = {baseline, candidate: served ? null : fs.readFileSync(candidateFile, 'utf8')};
// An error is StatCalc's when it comes from the page it's loaded from, or from one of its functions: as a gadget, its code
// shares a ResourceLoader response with other gadgets
const functions = [...new Set([...(baseline + (scripts.candidate || '')).matchAll(/function\s+(\w+)/g)].map(m => m[1]))];
const ours = new RegExp(`MediaWiki:(Gadget-)?StatCalc\\.js|at (${functions.join('|')}) `);

// The gadget's code in a ResourceLoader response, which holds each module as
// mw.loader.impl(function(){return["ext.gadget.StatCalc@…",function($,jQuery,require,module){…}];});
function swapGadget(body, script) {
    const start = body.indexOf('mw.loader.impl(function(){return["ext.gadget.StatCalc@');
    if (start < 0) return null;
    const open = 'function($,jQuery,require,module){', from = body.indexOf(open, start) + open.length;
    const next = body.indexOf('\nmw.loader.impl(', start), end = body.lastIndexOf('}];});', next < 0 ? body.length : next);
    return body.slice(0, from) + '\n' + script + '\n' + body.slice(end);
}

// Helpers the actions use in the page
const helpers = `(() => {
    const text = e => e ? e.textContent.trim() : null;
    window.__T = {
        table: () => document.querySelector('.character-stattable'),
        chart: () => document.querySelector('#statchart-controls'),
        stars: () => (__T.table() || __T.chart()).querySelectorAll('.stattable-rarity-selector span.control'),
        level: () => (__T.table() || __T.chart()).querySelector('.stattable-level'),
        affection: n => document.querySelectorAll('.character-affectiontable .affection-level input')[n],
        potential: () => document.querySelector('.character-potentialtable .potential-level-attack input'),
        // What a character page shows: every stat, the boxes, the affection totals and the potential bonuses
        observe: full => {
            const t = __T.table(), o = {};
            o.stats = t ? [...t.querySelectorAll('[class^="stat-"]')].map(e => text(e) + '[' + e.className + ']').join('/') : null;
            o.level = __T.level() ? __T.level().value : null;
            o.affection = [...document.querySelectorAll('.character-affectiontable')].map(a => ((a.querySelector('.affection-level input') || {}).value ?? '-') + ' ' + text(a.querySelector('.affection-total'))).join(' | ');
            o.potential = [...document.querySelectorAll('.character-potentialtable')].map(p => ['attack', 'hp', 'healing'].map(s => ((p.querySelector('.potential-level-' + s + ' input') || {}).value ?? '-') + ' ' + text(p.querySelector('.potential-bonus-' + s))).join(', ')).join(' | ');
            if (full) {
                o.controls = t ? t.querySelector('.stattable-controls').innerHTML : null;
                o.tooltips = t ? [...t.querySelectorAll('[class^="stat-"]')].map(e => e.getAttribute('title')).join(' | ') : null;
            }
            return o;
        },
        // Every row of the chart: its stats with their rank classes
        rows: () => Object.fromEntries([...document.querySelectorAll('#charactertable tr.stattable-stats')].map(r =>
            [r.getAttribute('data-character-name'), [...r.querySelectorAll('[class^="stat-"]')].map(c => c.textContent.trim() + (c.className.match(/ (rank|percentile)-\\S+/g) || []).join('')).join('/')])),
        visible: () => [...document.querySelectorAll('#charactertable tr.stattable-stats')].filter(r => r.offsetParent !== null).map(r => r.getAttribute('data-character-name')).join(', '),
        set: (e, value) => { e.value = value; e.dispatchEvent(new Event('change', {bubbles: true})); },
        // Opens the section a skin collapses (Minerva) and the collapsed table around an element
        reveal: e => { const b = e.closest('.collapsible-block'); if (b && !b.classList.contains('open-block')) b.previousElementSibling.click();
            const t = e.closest('.mw-collapsible.mw-collapsed'); if (t) t.querySelector('.mw-collapsible-toggle').click(); },
        focus: e => { const b = e.closest('.collapsible-block'); if (b && !b.classList.contains('open-block')) b.previousElementSibling.click();
            e.scrollIntoView({block: 'center'}); e.focus(); e.select(); },
    };
})()`;

if (!browserPath) throw new Error('Set STATCALC_TEST_BROWSER to a Chrome or Edge executable.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'statcalc-browser-'));
const browser = spawn(browserPath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timeout')), 20000);
    browser.stderr.on('data', chunk => { const m = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
});
const ws = new WebSocket(endpoint);
await new Promise(resolve => ws.addEventListener('open', resolve, {once: true}));
let nextId = 0, sessionId, loaded = false, serving, raw = false;
const pending = new Map(), exceptions = [];
const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
});
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method == 'Page.loadEventFired') loaded = true;
    if (message.method == 'Network.requestWillBeSent' && /MediaWiki(:|%3A)StatCalc\.js/i.test(message.params.request.url)) raw = true;
    if (message.method == 'Runtime.exceptionThrown') {
        const d = message.params.exceptionDetails, description = d.exception?.description || d.text;
        exceptions.push({statcalc: ours.test(description + ' ' + (d.url || '')), text: description.split('\n').slice(0, 2).map(l => l.trim()).join(' | ')});
    }
    if (message.method == 'Fetch.requestPaused') serve(message.params).catch(error => failedActions.push('serving the script: ' + error.message));
    const p = pending.get(message.id); if (!p) return; pending.delete(message.id);
    message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result);
});
// The script under test, in place of the gadget's code in the paused ResourceLoader response that brings it
async function serve(paused) {
    const {body, base64Encoded} = await send('Fetch.getResponseBody', {requestId: paused.requestId});
    const original = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
    const swapped = swapGadget(original, scripts[serving]);
    if (swapped === null) failedActions.push('no StatCalc gadget in ' + paused.request.url.slice(0, 120));
    return send('Fetch.fulfillRequest', {requestId: paused.requestId, responseCode: paused.responseStatusCode,
        responseHeaders: paused.responseHeaders.filter(h => !/^(content-encoding|content-length)$/i.test(h.name)), body: Buffer.from(swapped ?? original).toString('base64')});
}
const evaluate = async expression => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    return r.exceptionDetails ? {error: r.exceptionDetails.exception?.description || r.exceptionDetails.text} : r.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const keys = {Backspace: 8, Tab: 9};
const press = async key => {
    const special = key in keys, code = special ? key : 'Digit' + key, vk = special ? keys[key] : 48 + Number(key);
    await send('Input.dispatchKeyEvent', {type: special ? 'rawKeyDown' : 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(special ? {} : {text: key, unmodifiedText: key})});
    await send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk});
};
const type = async keys => { for (const key of keys) await press(key); };
const observe = (full = false) => evaluate(`__T.observe(${full})`);
// An action that fails is recorded, so that a broken step can't pass as "same"
let failedActions = [];
const act = async code => { const r = await evaluate(`(() => { ${code} })()`); if (r && r.error) failedActions.push(r.error.split('\n')[0] + ' in: ' + code.slice(0, 80)); };

// The actions on a character page, and what it shows after each
async function characterPage() {
    const o = {start: await observe(true)};
    const stars = await evaluate(`__T.table() ? __T.table().querySelectorAll('.stattable-rarity-selector span.control.active').length : 0`);
    if (!o.start.stats) return o;
    await act(`__T.stars()[__T.stars().length - 1].click()`); o.ue4 = await observe();
    await act(`__T.stars()[0].click()`); o.rank1 = await observe();
    await act(`__T.stars()[${Math.max(stars, 1) - 1}].click()`);
    if (await evaluate(`!!__T.table().querySelector('.equipment-4 img')`)) {
        await act(`__T.table().querySelector('.equipment-4 img').click()`); o.gearOff = await observe();
        await act(`__T.table().querySelector('.equipment-4 img').click()`); o.gearOn = await observe();
    }
    await act(`__T.focus(__T.level())`); await press('Backspace'); o.levelCleared = await observe();
    await type('45'); o.level45 = await observe(); await press('Tab'); o.level45Tab = await observe();
    await act(`__T.focus(__T.level())`); await type('150'); o.level150 = await observe(); await press('Tab'); o.level150Tab = await observe();
    await act(`__T.focus(__T.level())`); await type('90'); await press('Tab');
    if (await evaluate(`!!__T.affection(0)`)) {
        await act(`__T.focus(__T.affection(0))`); await press('Backspace'); o.affectionCleared = await observe();
        await type('25'); o.affection25 = await observe(); await press('Tab'); o.affection25Tab = await observe();
        await act(`__T.focus(__T.affection(0))`); await type('99'); o.affection99 = await observe(); await press('Tab'); o.affection99Tab = await observe();
        await act(`const a = document.querySelector('.character-affectiontable'); __T.reveal(a.querySelector('.affection-data')); a.querySelector('.affection-data > div[data-level="20"]').click()`);
        o.affectionRow20 = await observe();
        await act(`__T.focus(__T.affection(0))`); await type('50'); await press('Tab');
        if (await evaluate(`!!__T.affection(1)`)) {
            await act(`__T.focus(__T.affection(1))`); await type('1'); await press('Tab'); o.otherVersion1 = await observe();
            await act(`__T.focus(__T.affection(1))`); await type('50'); await press('Tab');
        }
    }
    if (await evaluate(`!!__T.potential()`)) {
        await act(`__T.focus(__T.potential())`); await press('Backspace'); o.potentialCleared = await observe();
        await type('5'); o.potential5 = await observe(); await press('Tab'); o.potential5Tab = await observe();
        await act(`__T.focus(__T.potential())`); await type('30'); o.potential30 = await observe(); await press('Tab'); o.potential30Tab = await observe();
        await act(`const p = document.querySelector('.character-potentialtable'); __T.reveal(p.querySelector('.level')); p.querySelector('.level[data-level="10"] .stat[data-stat="attack"]').click()`);
        o.potentialCell10 = await observe();
    }
    return o;
}

// The actions on the chart, and every row after each
async function chart() {
    const o = {controls: await evaluate(`__T.chart().innerHTML`), start: await evaluate(`__T.rows()`)};
    const step = async (name, code) => { await act(code); o[name] = await evaluate(`__T.rows()`); };
    const c = `__T.chart()`;
    await step('ue4', `__T.stars()[__T.stars().length - 1].click()`);
    await step('rank3', `__T.stars()[2].click()`);
    await act(`__T.focus(__T.level())`); await type('45'); o.level45 = await evaluate(`__T.rows()`); await press('Tab');
    await act(`__T.focus(__T.level())`); await type('90'); await press('Tab');
    await step('slot1Tier5', `__T.set(${c}.querySelector('.equipment-1 select'), '5')`);
    o.slot1Icon = await evaluate(`${c}.querySelector('.equipment-1 img').getAttribute('src')`);
    await act(`__T.set(${c}.querySelector('.equipment-1 select'), '10')`);
    await step('slot1Off', `${c}.querySelector('.equipment-1 img').click()`);
    await act(`${c}.querySelector('.equipment-1 img').click()`);
    await step('gearOff', `${c}.querySelector('.equipment-4 img').click()`);
    await act(`${c}.querySelector('.equipment-4 img').click()`);
    await step('mainAffection1', `__T.set(${c}.querySelector('.affection-main input'), '1')`);
    await act(`__T.set(${c}.querySelector('.affection-main input'), '50')`);
    await step('otherAffection1', `__T.set(${c}.querySelector('.affection-alt input'), '1')`);
    await act(`__T.set(${c}.querySelector('.affection-alt input'), '50')`);
    await step('mainAffectionOff', `${c}.querySelector('.affection-main .affection-icon').click()`);
    await step('mainAffectionOn', `${c}.querySelector('.affection-main .affection-icon').click()`);
    await act(`[...document.querySelectorAll('#charactertable tr:first-child th')].find(t => t.textContent.trim() == 'Attack').click()`);
    await wait(300); o.sortedByAttack = await evaluate(`__T.visible()`);
    await act(`const i = document.querySelector('#table-search'); i.value = 'Shiroko'; i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}))`);
    await wait(800); o.filtered = await evaluate(`__T.visible()`);
    return o;
}

async function run(page, skin, which) {
    // A browser context of its own, so every load is a first visit: ResourceLoader keeps modules in localStorage, and a gadget
    // it takes from there never comes by as a response to swap
    const {browserContextId} = await send('Target.createBrowserContext', {}, null);
    const {targetId} = await send('Target.createTarget', {url: 'about:blank', browserContextId}, null);
    ({sessionId} = await send('Target.attachToTarget', {targetId, flatten: true}, null));
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__longtasks = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longtasks.push(Math.round(e.duration)); }).observe({type: 'longtask', buffered: true}); } catch (e) {}`});
    if (!(which == 'candidate' && served)) await send('Fetch.enable', {patterns: [{urlPattern: '*load.php*StatCalc*', requestStage: 'Response'}]});
    await send('Emulation.setDeviceMetricsOverride', {width: skin.width, height: 900, deviceScaleFactor: skin.phone ? 2 : 1, mobile: !!skin.phone});
    if (skin.phone) await send('Emulation.setUserAgentOverride', {userAgent: phone});
    serving = which; loaded = false; raw = false; exceptions.length = 0; failedActions = [];
    // A parameter of its own gets the page as the wiki renders it now: the CDN keeps a copy of each address for a day or more
    await send('Page.navigate', {url: `https://bluearchive.wiki/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}?${skin.query}&statcalc-check=${Date.now()}`});
    for (let i = 0; i < 900 && !loaded; i++) await wait(100);
    // Wait for StatCalc to finish, or to throw
    const ready = page == 'Characters StatChart'
        ? `!!document.querySelector('#statchart-controls .stattable-level') && !!document.querySelector('#charactertable tr.stattable-stats .stat-attack[class*="rank-"]')`
        : `!!document.querySelector('.character-stattable .stattable-controls') && document.querySelector('.character-stattable .stattable-controls').style.display === ''`;
    for (let i = 0; i < 300 && !(await evaluate(ready)) && !exceptions.some(e => e.statcalc); i++) await wait(100);
    await wait(1500);
    // Without the gadget StatCalc doesn't start; with the old MediaWiki:StatCalc.js loaded as well, it starts twice
    const state = await evaluate(`mw.loader.getState('ext.gadget.StatCalc')`);
    if (state !== 'ready') failedActions.push(state === 'registered' ? 'the page does not load the StatCalc gadget' : 'the StatCalc gadget is ' + JSON.stringify(state));
    if (raw) failedActions.push('MediaWiki:StatCalc.js is loaded as well');
    await evaluate(helpers);
    const result = page == 'Characters StatChart' ? await chart() : await characterPage();
    result.failedActions = failedActions.join(' | ') || 'none';
    const startup = await evaluate(`Math.max(0, ...window.__longtasks)`);
    const errors = exceptions.slice();
    await send('Target.closeTarget', {targetId}, null);
    await send('Target.disposeBrowserContext', {browserContextId}, null);
    return {result, startup, errors};
}

// Everything that differs between two results, as "step: what: baseline -> candidate"
function differences(a, b, prefix = '') {
    const out = [];
    for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
        const x = a?.[key], y = b?.[key];
        if (x && y && typeof x == 'object' && typeof y == 'object') out.push(...differences(x, y, prefix + key + ': '));
        else if (x !== y) {
            // Long values from a little before where they part
            const a = String(x), b = String(y);
            let at = 0; while (at < a.length && a[at] === b[at]) at++;
            const from = Math.max(0, at - 40), cut = s => (from ? '…' : '') + s.slice(from, from + 160) + (s.length > from + 160 ? '…' : '');
            out.push(`${prefix}${key}: ${cut(a)} -> ${cut(b)}`);
        }
    }
    return out;
}

console.log(`Baseline: ${baselineName}\nCandidate: ${served ? 'the script the wiki serves' : path.relative(process.cwd(), candidateFile)}\n`);
let failed = 0;
for (const {page, skin} of runs) {
    const a = await run(page, skin, 'baseline'), b = await run(page, skin, 'candidate');
    const diff = differences(a.result, b.result);
    const thrown = b.errors.filter(e => e.statcalc);
    const broken = b.result.failedActions != 'none';
    if (diff.length || thrown.length || broken) failed++;
    const values = JSON.stringify(b.result).length;
    console.log(`${diff.length || thrown.length || broken ? 'DIFF' : 'same'} ${page} / ${skin.name}: ${diff.length} differences` + (page == 'Characters StatChart' ? `, start-up ${a.startup} -> ${b.startup} ms` : '') + ` (${values} characters compared)`);
    for (const line of diff.slice(0, 12)) console.log('     ' + line);
    if (diff.length > 12) console.log(`     ... and ${diff.length - 12} more`);
    for (const e of thrown) console.log('     candidate threw: ' + e.text);
    if (broken) console.log('     actions that failed: ' + b.result.failedActions);
    const others = b.errors.filter(e => !e.statcalc);
    if (others.length) console.log(`     (the page's own errors, not StatCalc's: ${[...new Set(others.map(e => e.text))].join('; ')})`);
}
console.log(`\n${failed ? failed + ' of ' + runs.length + ' runs differ' : 'All ' + runs.length + ' runs match'}.`);
ws.close();
browser.kill();
setTimeout(() => { try { fs.rmSync(profile, {recursive: true, force: true}); } catch {} process.exit(failed ? 1 : 0); }, 500);

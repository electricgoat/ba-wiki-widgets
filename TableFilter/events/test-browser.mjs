// Offline browser regression checks against saved MediaWiki HTML and its actual
// jQuery/tablesorter. Requires a local Chrome/Edge executable; no npm packages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import './build-preview.mjs';
import { commonFilterFixture, testCommonFilters } from '../test-common-filters.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(dir);
const browserPath = process.env.EVENT_TEST_BROWSER || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(file => fs.existsSync(file));
assert(browserPath, 'Set EVENT_TEST_BROWSER to a Chrome/Edge executable.');
const server = http.createServer((req, res) => {
    const fixture = req.url.match(/^\/filter-test\/(charactertable|bannertable|gifttable)(?:\?|$)/);
    if (fixture) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(commonFilterFixture(fixture[1]));
        return;
    }
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const type = {'.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg'}[path.extname(file)];
    res.setHeader('Content-Type', (type || 'application/octet-stream') + '; charset=utf-8');
    fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/events/preview.html`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eventtable-browser-'));
const browser = spawn(browserPath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
let browserLog = '';
browser.stderr.on('data', chunk => { browserLog = (browserLog + chunk.toString()).slice(-4000); });
browser.on('exit', code => { if (code) console.error('Browser exit', code, browserLog); });
const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timeout')), 15000);
    browser.on('error', reject);
    browser.stderr.on('data', chunk => {
        const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
    });
});
const ws = new WebSocket(endpoint);
await new Promise(resolve => ws.addEventListener('open', resolve, {once: true}));
let nextId = 0, sessionId;
const pending = new Map(), errors = [];
ws.addEventListener('close', () => {
    for (const promise of pending.values()) promise.reject(new Error('Browser connection closed'));
    pending.clear();
});
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (!message.id) return;
    const promise = pending.get(message.id);
    if (!promise) return;
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(JSON.stringify(message.error)));
    else promise.resolve(message.result);
});
function send(method, params = {}, session = sessionId) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
        pending.set(id, {
            resolve: result => { clearTimeout(timer); resolve(result); },
            reject: error => { clearTimeout(timer); reject(error); }
        });
        ws.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
    });
}
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
}
async function load(suffix = '', initialized = true) {
    console.log('Checking', suffix || 'default view');
    await send('Page.navigate', {url: base + suffix});
    await evaluate(`new Promise((resolve, reject) => {
        const start = Date.now(); const timer = setInterval(() => {
            if (document.querySelector('#eventtable') && ${initialized ? "window.jQuery && $('#eventtable').data('tablesorter')" : 'document.readyState !== "loading"'}) {
                clearInterval(timer); resolve(true);
            } else if (Date.now() - start > 8000) { clearInterval(timer); reject(new Error('Initialization timeout')); }
        }, 25);
    })`);
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function search(value) {
    await evaluate(`$('#table-search').val(${JSON.stringify(value)}).trigger('input')`);
}
const rowKey = `row.dataset.eventId + (row.dataset.eventPart ? ':' + row.dataset.eventPart : '')`;
const visible = () => evaluate(`Array.from(document.querySelectorAll('#eventtable tr[data-event-id]')).filter(row => getComputedStyle(row).display !== 'none').map(row => ${rowKey})`);
const snapshot = JSON.parse(fs.readFileSync(path.join(dir, 'upstream/events.json'))).bucket;
const byKey = Object.groupBy(snapshot, row => row.id === 701 ? '701:' + row.notes.replace('Special Operation Part ', '') : String(row.id));
const type = key => {
    const id = Number(key.split(':')[0]);
    return id < 3000 ? 'new' : id > 10000 && id < 11000 ? 'rerun' : 'permanent';
};
const allKeys = Object.keys(byKey);
const newKeys = allKeys.filter(key => type(key) === 'new');
function expectedOrder(keys, region) {
    const date = (key, region) => byKey[key].filter(row => row.server === region).map(row => row.start_date).sort().at(-1) || '';
    const sortKey = key => region === 'JP' ? date(key, region) : date(key, 'GL') ? '0:' + date(key, 'GL') : '1:' + date(key, 'JP');
    return [...keys].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}
function assertDateOrder(keys, region, ascending = false) {
    const expected = expectedOrder(keys, region);
    if (ascending) expected.reverse();
    // Date ties may be broken by event name; compare tied date buckets instead.
    const dates = list => list.map(key => byKey[key].filter(row => row.server === region).map(row => row.start_date).sort().at(-1) || (region === 'GL' ? 'future:' + byKey[key].find(row => row.server === 'JP').start_date : ''));
    assert.deepEqual(dates(keys), dates(expected));
}
function matchingNames(include, exclude, keys = newKeys) {
    return keys.filter(key => {
        const names = byKey[key].flatMap(row => [row.name_en || '', row.name_jp || '']).join(' ').normalize('NFKC').toLowerCase();
        return include.every(term => names.includes(term)) && !exclude.some(term => names.includes(term));
    });
}
try {
    const target = await send('Target.createTarget', {url: 'about:blank'}, null);
    const attached = await send('Target.attachToTarget', {targetId: target.targetId, flatten: true}, null);
    sessionId = attached.sessionId;
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false});

    await load('?nojs', false);
    assert.deepEqual(new Set(await visible()), new Set(newKeys));
    assertDateOrder(await visible(), 'JP');
    const rows = await evaluate(`Array.from(document.querySelectorAll('#eventtable tr[data-event-id]')).map(row => ({
        key: ${rowKey}, id: Number(row.dataset.eventId), part: row.dataset.eventPart, names: row.dataset.search,
        notes: row.querySelector('.event-notes').textContent,
        promo: row.querySelector('img')?.getAttribute('src'),
        jp: row.querySelector('td.event-region-jp').querySelectorAll('.event-period-entry').length,
        gl: row.querySelector('td.event-region-gl').querySelectorAll('.event-period-entry').length,
        dates: Array.from(row.querySelectorAll('.datetime')).map(node => node.dataset.datetime)
    }))`);
    assert.equal(rows.length, allKeys.length);
    assert.equal(new Set(rows.map(row => row.key)).size, rows.length, 'Every part must have a distinct row');
    for (const row of rows) {
        assert(byKey[row.key], 'Unexpected event/part: ' + row.key);
        assert.equal(row.jp, byKey[row.key].filter(r => r.server === 'JP').length);
        assert.equal(row.gl, byKey[row.key].filter(r => r.server === 'GL').length);
        for (const source of byKey[row.key]) {
            assert(row.names.includes(source.name_en));
            if (source.name_jp) assert(row.names.includes(source.name_jp));
            assert(row.dates.includes(source.start_date));
            if (!source.end_date.startsWith('2099')) assert(row.dates.includes(source.end_date));
        }
        assert(!row.dates.some(date => date.startsWith('2099')));
    }
    const parts = rows.filter(row => row.id === 701);
    assert.deepEqual(parts.map(row => row.part), ['5', '4', '3', '2', '1']);
    for (const part of parts) {
        assert.equal(part.jp, 1);
        assert.equal(part.gl, 1);
        assert.equal(part.notes, 'Special Operation Part ' + part.part, 'Shared part note must appear once without a region label');
        assert(part.promo, 'Every part must retain the shared event promo');
    }
    assert(await evaluate(`!!document.querySelector('tr[data-event-id="10804"] img')`), 'Rerun promo must fall back to original');

    await load('#Events_Schedule');
    assert.deepEqual(new Set(await visible()), new Set(newKeys));
    assertDateOrder(await visible(), 'JP');
    assert.equal(await evaluate('location.hash'), '#Events_Schedule');
    assert.equal(await evaluate(`$('#eventtable thead th').length`), 5);
    assert.equal(await evaluate(`$('#eventtable th').first().hasClass('headerSort')`), false);
    const initial = await visible();
    await click('#eventtable th.unsortable');
    assert.deepEqual(await visible(), initial);

    await click('[data-primary="gl"]');
    assert.deepEqual(new Set(await visible()), new Set(newKeys));
    assertDateOrder(await visible(), 'GL');
    assert((await visible()).slice(0, 4).every(key => !byKey[key].some(row => row.server === 'GL')));
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-event-id="808"] .event-name.event-region-jp')).opacity`), '0.55');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-event-id="808"] .event-name.event-region-gl')).opacity`), '1');
    await search('Hot Springs Resort');
    assert((await visible()).includes('808'), 'GL English title must be searchable');
    await search('Warmth in a Snowy Landscape');
    assert((await visible()).includes('808'), 'JP English title must be searchable with GL primary');
    await search('白い吐息');
    assert((await visible()).includes('808'), 'Japanese title must be searchable');
    await search('夏');
    assert((await visible()).length > 0, 'Single-character Japanese searches must work');
    await search('new');
    assert((await visible()).length > 0 && (await visible()).length < newKeys.length, 'Name search must not interpret New as a toggle');
    await search('[.*');
    assert.deepEqual(await visible(), [], 'Regex punctuation must remain literal');
    for (const [query, include, exclude] of [
        ['exclude:decagrammaton', [], ['decagrammaton']],
        ['exclude:"special operation:"', [], ['special operation:']],
        ['decagrammaton exclude:"special mission"', ['decagrammaton'], ['special mission']],
        ['"special operation:" exclude:"special mission"', ['special operation:'], ['special mission']],
        ['EXCLUDE:"ＳＰＥＣＩＡＬ ＯＰＥＲＡＴＩＯＮ:" exclude:夏', [], ['special operation:', '夏']],
        ['exclude:"Hot Springs Resort"', [], ['hot springs resort']],
        ['exclude:"白い吐息"', [], ['白い吐息']],
        ['"Warmth in a Snowy Landscape"', ['warmth in a snowy landscape'], []],
        ['warmth snowy', ['warmth', 'snowy'], []],
        ['"warmth snowy"', ['warmth snowy'], []],
        ['exclude:"warmth snowy"', [], ['warmth snowy']],
        ['exclude:"[.*"', [], ['[.*']],
        ['"exclude:decagrammaton"', ['exclude:decagrammaton'], []],
        ['exclude:', [], []],
        ['exclude:"" ""', [], []],
        ['exclude:"special operation:', [], ['special operation:']],
        ['"special operation:', ['special operation:'], []]
    ]) {
        await search(query);
        assert.deepEqual(new Set(await visible()), new Set(matchingNames(include, exclude)), query);
    }
    await search('decagrammaton exclude:"special mission"');
    assert(!(await visible()).includes('701:5'), 'An alternate GL title must exclude only its own part');
    const savedSearch = await evaluate('location.hash');
    await load(savedSearch);
    assert.equal(await evaluate(`$('#table-search').val()`), 'decagrammaton exclude:"special mission"');
    assert.deepEqual(new Set(await visible()), new Set(matchingNames(['decagrammaton'], ['special mission'])));
    await click('[data-primary="jp"]');
    assert.deepEqual(new Set(await visible()), new Set(matchingNames(['decagrammaton'], ['special mission'])));
    assertDateOrder(await visible(), 'JP');
    await click('[data-primary="gl"]');
    await search('');

    await click('[data-toggle="release-new"]'); // Banner semantics: no selection = all.
    assert.deepEqual(new Set(await visible()), new Set(allKeys));
    assertDateOrder(await visible(), 'GL');
    assert((await evaluate('location.hash')).includes('release=all'));
    await click('[data-toggle="release-rerun"]');
    await search('exclude:"special operation:"');
    assert.deepEqual(new Set(await visible()), new Set(matchingNames([], ['special operation:'], allKeys.filter(key => type(key) === 'rerun'))));
    await search('');
    const rerunGL = await visible();
    assert(rerunGL.every(id => type(id) === 'rerun'));
    await click('[data-primary="jp"]');
    const rerunJP = await visible();
    assertDateOrder(rerunJP, 'JP');
    assert.deepEqual(new Set(rerunJP), new Set(rerunGL));
    await click('[data-toggle="release-permanent"]');
    await click('[data-toggle="release-rerun"]');
    assert((await visible()).every(id => type(id) === 'permanent'));

    await load('#eventtable:primary=gl&release=all&q=%E7%99%BD%E3%81%84%E5%90%90%E6%81%AF');
    assert((await visible()).includes('808'));
    assert.equal(await evaluate(`$('#table-search').val()`), '白い吐息');
    await search('');
    assert.deepEqual(new Set(await visible()), new Set(allKeys));
    const allGL = await visible();
    await evaluate(`$('[data-primary="gl"]').trigger($.Event('keydown', {key:'ArrowLeft'}))`);
    assert.equal(await evaluate(`$('#eventtable').attr('data-primary-region')`), 'jp');
    const paired = (await visible()).filter(key => byKey[key].some(row => row.server === 'GL') && byKey[key].some(row => row.server === 'JP'));
    assert.notDeepEqual(paired, allGL.filter(id => paired.includes(id)), 'Live GL order changes must be exercised');
    assert.equal(await evaluate(`$('[role="radio"][aria-checked="true"]').length`), 1);
    assert.equal(await evaluate(`$('[role="radio"][tabindex="0"]').length`), 1);
    await evaluate(`$('[data-primary="gl"]').trigger($.Event('keydown', {key:' '}))`);
    assertDateOrder(await visible(), 'GL');
    await click('#eventtable th:nth-child(3)');
    assertDateOrder(await visible(), 'JP', true);
    await click('#eventtable th:nth-child(4)');
    assertDateOrder(await visible(), 'GL', true);
    await click('[data-primary="jp"]');
    assertDateOrder(await visible(), 'JP');

    await load('?delay=150#eventtable:primary=gl&release=new');
    assertDateOrder(await visible(), 'GL');

    // Place the schedule below the fold, as on a page with a long introduction.
    // A trailing spacer keeps even an empty filtered table scrollable to its heading.
    const anchorFixture = await send('Page.addScriptToEvaluateOnNewDocument', {source: `
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(location.search);
            if (!params.has('anchor-test')) return;
            const intro = document.createElement('div');
            intro.id = 'event-test-intro';
            intro.style.height = '1400px';
            document.body.prepend(intro);
            const outro = document.createElement('div');
            outro.style.height = '1400px';
            document.body.append(outro);
            if (params.has('omit-heading')) document.getElementById('Events_Schedule').removeAttribute('id');
        });
    `});
    const atAnchor = selector => evaluate(`Math.abs(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top) < 2`);
    const followHash = hash => evaluate(`new Promise(resolve => {
        window.addEventListener('hashchange', () => requestAnimationFrame(() => resolve(true)), {once: true});
        location.hash = ${JSON.stringify(hash)};
    })`);
    await load('?anchor-test#eventtable:primary=jp&release=new&q=exclude%3A"special+operation%3A"');
    assert(await atAnchor('#Events_Schedule'), 'Loading a filter URL must jump to the schedule heading');
    assert.equal(await evaluate(`$('#table-search').val()`), 'exclude:"special operation:"');
    assert.deepEqual(new Set(await visible()), new Set(matchingNames([], ['special operation:'])));
    const historyLength = await evaluate('history.length');
    await evaluate('window.scrollTo(0, 400)');
    await search('exclude:decagrammaton');
    await click('[data-primary="gl"]');
    await click('[data-toggle="release-rerun"]');
    assert.equal(await evaluate('window.scrollY'), 400, 'Editing filters must not jump back to the heading');
    assert.equal(await evaluate('history.length'), historyLength, 'Editing filters must not add history entries');
    await followHash('#eventtable:primary=jp&release=new&q=exclude%3A%22special+operation%3A%22');
    assert(await atAnchor('#Events_Schedule'), 'Following another filter link on the same page must jump');
    assert.deepEqual(new Set(await visible()), new Set(matchingNames([], ['special operation:'])));
    await followHash('#event-test-intro');
    assert(await atAnchor('#event-test-intro'), 'Ordinary section anchors must retain their native target');
    await evaluate('window.scrollTo(0, 400)');
    await followHash('#eventtable:');
    assert.equal(await evaluate('window.scrollY'), 400, 'An empty filter fragment must not cause a jump on hash changes');
    await load('?anchor-test&delay=150');
    assert.equal(await evaluate('window.scrollY'), 0, 'Loading without a filter fragment must not jump');
    await load('?anchor-test#eventtable:');
    assert.equal(await evaluate('window.scrollY'), 0, 'An empty filter fragment must not cause a jump on load');
    for (const hash of [
        '#eventtable:anything', '#eventtable:q=', '#eventtable:primary=jp',
        '#eventtable:q=exclude%3A%22special+operation%3A%22'
    ]) {
        await load('?anchor-test' + hash);
        assert(await atAnchor('#Events_Schedule'), 'Any text after the filter prefix must cause a jump: ' + hash);
    }
    await load('?anchor-test&delay=150#eventtable:primary=gl&release=new');
    assert(await atAnchor('#Events_Schedule'), 'Delayed sorter initialization must preserve the anchor jump');
    assertDateOrder(await visible(), 'GL');
    await load('?anchor-test&omit-heading#eventtable:primary=jp&release=new&q=doesnotmatchevents');
    assert.deepEqual(await visible(), []);
    assert(await atAnchor('#table-filter'), 'Missing section headings must fall back to the filter controls');
    await send('Page.removeScriptToEvaluateOnNewDocument', {identifier: anchorFixture.identifier});

    await load();
    await evaluate(`Promise.all(Array.from(document.querySelectorAll('#eventtable tr.visible img')).slice(0, 5).map(img => img.decode()))`);
    const desktop = await send('Page.captureScreenshot', {format: 'png'});
    fs.writeFileSync(path.join(dir, 'preview-desktop.png'), Buffer.from(desktop.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
    await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'dark'}]});
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'The table must scroll within its container on mobile');
    const mobile = await send('Page.captureScreenshot', {format: 'png'});
    fs.writeFileSync(path.join(dir, 'preview-mobile.png'), Buffer.from(mobile.data, 'base64'));
    await testCommonFilters({send, evaluate, origin: new URL(base).origin});
    assert.deepEqual(errors, [], 'No browser JavaScript exceptions');
    console.log(`PASS: ${snapshot.length} source periods, ${allKeys.length} rows; separate Decagrammaton parts, defaults, names, quoted phrases, exclusions, release toggles, regional sorting, headers, URLs, anchor navigation, keyboard, delayed sorter, and mobile layout.`);
} finally {
    await send('Browser.close', {}, null).catch(() => {});
    ws.close();
    server.closeAllConnections();
    server.close();
}

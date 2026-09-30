// fragcount.html in headless Chrome or Edge, driven through the DevTools protocol; no npm packages.
// The page loads jQuery and the wiki's images from the network. Run, from the repository root: node --test FragCalc/test/browser.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const browserPath = process.env.FRAGCALC_TEST_BROWSER || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(file => fs.existsSync(file));

let server, browser, profile, ws, sessionId, base;
let nextId = 0;
const pending = new Map();
const errors = [];

function send(method, params = {}, session = sessionId) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000);
        pending.set(id, {resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); }});
        ws.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
    });
}

async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
}

// The preview runs the script as the wiki runs the gadget (?gadget), unless told otherwise
async function open(query = '?gadget', width = 1100, page = 'fragcount.html') {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width < 600});
    await send('Page.navigate', {url: base + page + query});
    await evaluate(`new Promise((resolve, reject) => {
        const start = Date.now();
        (function wait() {
            if (document.readyState == 'complete' && (${JSON.stringify(query)}.includes('nojs') || document.querySelector('.fragcalc-panel'))) resolve();
            else if (Date.now() - start > 15000) reject(new Error('The calculator did not load'));
            else setTimeout(wait, 50);
        })();
    })`);
}

// The table as text, a row per line: the tier rows, the totals and the summary. Icons read as spaces, as an ItemCard's
// quantity, icon and name have nothing else between them; {{Rank}} badges read as {their title}.
const output = () => evaluate(`[...document.querySelectorAll('.ba-template-fragcalc tr:not(.fragcalc-controls)')]
    .map(row => [...row.children].map(cell => {
        const copy = cell.cloneNode(true);
        copy.querySelectorAll('img').forEach(img => img.replaceWith(' '));
        copy.querySelectorAll('.ba-template-rank').forEach(badge => badge.replaceWith('{' + badge.title + '}'));
        return copy.textContent.replace(/\\s+/g, ' ').trim();
    }).join(' | ')).join('\\n')`);
// The ranks picked, as the selectors show them: the gadget keeps its state to itself
const state = () => evaluate(`Object.fromEntries([...document.querySelectorAll('.fragcalc-rank')]
    .map(selector => [selector.dataset.rankType, +selector.querySelector('.control[aria-checked="true"]').dataset.rank]))`);
const click = (rank_type, rank) => evaluate(`document.querySelector('.fragcalc-rank[data-rank-type="${rank_type}"] .control[data-rank="${rank}"]').click()`);
const setValue = (selector, value, events) => evaluate(`(() => {
    const input = document.querySelector('.fragcalc-controls ${selector}');
    input.value = ${JSON.stringify(value)};
    for (const type of ${JSON.stringify(events)}) input.dispatchEvent(new Event(type, {bubbles: true}));
})()`);
const totals = async () => (await output()).split('\n').find(line => line.startsWith('Total'));
const summary = async () => (await output()).split('\n').pop();

before(async () => {
    assert(browserPath, 'Set FRAGCALC_TEST_BROWSER to a Chrome or Edge executable.');
    server = http.createServer((req, res) => {
        const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
        res.setHeader('Content-Type', {'.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html'}[path.extname(file)] + '; charset=utf-8');
        fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}/`;

    profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fragcalc-browser-'));
    browser = spawn(browserPath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
    const endpoint = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Browser startup timeout')), 20000);
        browser.stderr.on('data', chunk => {
            const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timer); resolve(match[1]); }
        });
    });
    ws = new WebSocket(endpoint);
    await new Promise(resolve => ws.addEventListener('open', resolve, {once: true}));
    ws.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.method == 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
        if (message.method == 'Runtime.consoleAPICalled' && message.params.type == 'error') errors.push(message.params.args);
        const promise = pending.get(message.id);
        if (!promise) return;
        pending.delete(message.id);
        message.error ? promise.reject(new Error(JSON.stringify(message.error))) : promise.resolve(message.result);
    });
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'}, undefined);
    ({sessionId} = await send('Target.attachToTarget', {targetId, flatten: true}, undefined));
    await send('Page.enable');
    await send('Runtime.enable');
});

after(async () => {
    ws?.close();
    browser?.kill();
    server?.close();
    await new Promise(resolve => setTimeout(resolve, 500));
    try { fs.rmSync(profile, {recursive: true, force: true}); } catch {}
});

test('defaults: 3★ to 5★ with 100 Elephs owned, from the first price', async () => {
    await open();
    assert.equal(await output(), [
        'Price | Elephs bought | Eligma cost',
        '1 | 20 | 20', '2 | 20 | 40', '3 | 20 | 60', '4 | 20 | 80', '5 | 40 | 200',
        'Total | 120 | 400',
        '{Rank 3} → {Rank 5} needs 220 Elephs: 100 owned, 120 to buy · 1.2M Credits · Shop price afterwards: 5 Eligma',
    ].join('\n'));
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.fragcalc-rank')].map(rank => rank.querySelectorAll('.control.active').length)`), [3, 5]);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fragcalc-icons')).display`), 'none');
    // Every icon comes from the template's parse: the stars, the Eleph and Eligma in the controls, the Eligma of each row, the credits
    assert.equal(await evaluate(`document.querySelectorAll('.fragcalc-panel img, .fragcalc-tier img, .fragcalc-summary img').length`), 18 + 2 + 5 + 2);
    // As a gadget, the script keeps its names to itself
    assert.deepEqual(await evaluate(`[typeof fragCalc, typeof initFragCalc, typeof fragcalc_prices]`), ['undefined', 'undefined', 'undefined']);
});

test('the local preview also runs the script as a plain one', async () => {
    await open('');
    assert.equal(await totals(), 'Total | 120 | 400');
    assert.deepEqual(await evaluate(`[typeof fragCalc, typeof initFragCalc, typeof fragcalc_prices]`), ['object', 'function', 'object']);
});

test('the rank selectors keep the target at or above the current rank', async () => {
    await open();
    await click('current', 1);
    assert.equal(await totals(), 'Total | 230 | 950');
    await click('target', 9);
    assert.equal(await totals(), 'Total | 730 | 3,450');
    await click('current', 9);
    assert.deepEqual(await state().then(({current, target}) => [current, target]), [9, 9]);
    assert.equal(await summary(), 'Pick a target rank above the current one.');
    assert.equal(await totals(), 'Total | 0 | 0');
    await click('target', 2);
    assert.deepEqual(await state().then(({current, target}) => [current, target]), [9, 9]);
    await click('current', 5);
    await click('target', 6);
    assert.equal(await summary(), '{Rank 5} → {Unique Weapon rank 1} needs no Elephs (100 to spare)');
});

test('the shop state moves the purchases up the price ladder', async () => {
    await open();
    await setValue('.fragcalc-price select', '3', ['input', 'change']);
    await setValue('.fragcalc-can-buy input', '7', ['input']);
    assert.deepEqual((await output()).split('\n').slice(1, 7), ['1 | – | –', '2 | – | –', '3 | 7 | 21', '4 | 20 | 80', '5 | 93 | 465', 'Total | 120 | 566']);

    await setValue('.fragcalc-price select', '5', ['input', 'change']);
    assert.deepEqual(await evaluate(`(input => [input.disabled, input.value, input.placeholder])(document.querySelector('.fragcalc-can-buy input'))`), [true, '', '∞']);
    assert.equal(await totals(), 'Total | 120 | 600');
    assert.match(await summary(), /Shop price afterwards: 5 Eligma$/);

    // Back below the last price, the count comes back
    await setValue('.fragcalc-price select', '4', ['input', 'change']);
    assert.deepEqual(await evaluate(`(input => [input.disabled, input.value])(document.querySelector('.fragcalc-can-buy input'))`), [false, '7']);
    assert.equal(await totals(), 'Total | 120 | 593');
    assert.match(await summary(), /Shop price afterwards: 5 Eligma$/);
    await setValue('.fragcalc-owned input', '216', ['input', 'change']);
    assert.match(await summary(), /Shop price afterwards: 4 Eligma, can buy 3$/);
});

test('inputs: typing keeps the last number until it is one, committing checks the range', async () => {
    await open();
    await setValue('.fragcalc-owned input', '', ['input']);
    assert.equal(await totals(), 'Total | 120 | 400');
    await setValue('.fragcalc-owned input', '', ['change']);
    assert.equal(await evaluate(`document.querySelector('.fragcalc-owned input').value`), '100');

    await setValue('.fragcalc-owned input', '500', ['input', 'change']);
    assert.equal(await totals(), 'Total | 0 | 0');
    assert.equal(await summary(), '{Rank 3} → {Rank 5} needs 220 Elephs, all owned (280 to spare) · 1.2M Credits');

    await setValue('.fragcalc-owned input', '-5', ['input', 'change']);
    assert.equal(await evaluate(`document.querySelector('.fragcalc-owned input').value`), '0');
    await setValue('.fragcalc-can-buy input', '35', ['input', 'change']);
    assert.equal(await evaluate(`document.querySelector('.fragcalc-can-buy input').value`), '20');
    assert.equal(await totals(), 'Total | 220 | 900');
});

test('keyboard: the rank selectors work as radio groups', async () => {
    await open();
    const key = (rank_type, key) => evaluate(`(() => {
        const star = document.querySelector('.fragcalc-rank[data-rank-type="${rank_type}"] .control[tabindex="0"]');
        star.dispatchEvent(new KeyboardEvent('keydown', {key: ${JSON.stringify(key)}, bubbles: true}));
        return [document.activeElement.getAttribute('data-rank'), document.activeElement.getAttribute('aria-checked')];
    })()`);
    assert.deepEqual(await key('target', 'ArrowRight'), ['6', 'true']);
    assert.deepEqual(await key('target', 'End'), ['9', 'true']);
    assert.deepEqual(await key('current', 'Home'), ['1', 'true']);
    assert.deepEqual(await state().then(({current, target}) => [current, target]), [1, 9]);
    assert.equal(await evaluate(`document.querySelectorAll('.fragcalc-rank[data-rank-type="target"] .control[tabindex="0"]').length`), 1);
});

test('phones: one column in input order, no sideways scrolling', async () => {
    await open('?gadget', 360);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    const tops = await evaluate(`['.fragcalc-rank[data-rank-type="current"]', '.fragcalc-owned', '.fragcalc-shop', '.fragcalc-rank[data-rank-type="target"]']
        .map(selector => document.querySelector(selector).getBoundingClientRect().top)`);
    assert.deepEqual([...tops].sort((a, b) => a - b), tops);
});

test("mobile view: the images MobileFrontend leaves as placeholders show as images", async () => {
    await open('?gadget', 390, 'fragcount-mobile.html');
    assert.equal(await evaluate(`document.querySelectorAll('.fragcalc-icons .lazy-image-placeholder').length > 0`), true);
    assert.equal(await totals(), 'Total | 120 | 400');
    const shown = await evaluate(`(() => {
        const visible = [...document.querySelectorAll('.fragcalc-panel, .fragcalc-tier, .fragcalc-summary')];
        return {
            placeholders: visible.reduce((count, part) => count + part.querySelectorAll('.lazy-image-placeholder, noscript').length, 0),
            images: visible.reduce((count, part) => count + [...part.querySelectorAll('img')].filter(img => /^https:/.test(img.src) && img.width > 0).length, 0),
        };
    })()`);
    // The stars, the Eleph and Eligma in the controls, the Eligma of each row, the credits and the price afterwards
    assert.deepEqual(shown, {placeholders: 0, images: 18 + 2 + 5 + 2});
});

test('without the script, the template shows its example', async () => {
    await open('?nojs');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fragcalc-controls')).display`), 'none');
    const rows = await output();
    assert.match(rows, /^Total \| 120 \| 400$/m);
    assert.match(rows, /\{Rank 3\} → \{Rank 5\} needs 220 Elephs: 100 owned, 120 to buy · 1.2M Credits · Shop price afterwards: 5 Eligma$/);
});

test('prices, credits and the price afterwards are ItemCards with a quantity, as the template renders them', async () => {
    // The cells of the price column and the summary, as markup: images load eagerly once the script copies them, and
    // shortened quantities get the whole number as a tooltip
    const cards = () => evaluate(`[...document.querySelectorAll('.fragcalc-tier td:first-child, .fragcalc-summary td')]
        .map(cell => cell.innerHTML.replace(/ loading="lazy"/g, '').replace(/(<span class="item-quantity") title="[^"]*"/g, '$1').replace(/\\s+/g, ' ').trim())`);
    await open('?nojs');
    const template = await cards();
    await open();
    const script = await cards();
    assert.deepEqual(script.slice(0, 5), template.slice(0, 5));
    // The summary's cards match the template's, around text the script writes its own way
    const summaryCards = html => html.match(/<span class="item-quantity"[\s\S]*?<\/span><span class="ba-template-itemcard"[\s\S]*?<\/span>(<a [^>]*>[^<]*<\/a>)?/g);
    assert.deepEqual(summaryCards(script[5]), summaryCards(template[5]));

    // A quantity ItemCard shortens comes with the whole number
    await click('current', 1);
    assert.deepEqual(await evaluate(`(pill => [pill.textContent, pill.title])(document.querySelector('.fragcalc-credits .item-quantity'))`), ['1.3M', '1,250,000']);
    assert.equal(await evaluate(`document.querySelector('.fragcalc-tier .item-quantity').hasAttribute('title')`), false);
});

test("ranks show as the template's {{Rank}} badges, which also name the stars", async () => {
    const badges = () => evaluate(`[...document.querySelectorAll('.fragcalc-summary .ba-template-rank')].map(badge => badge.outerHTML)`);
    await open('?nojs');
    const template = await badges();
    await open();
    assert.deepEqual(await badges(), template);
    assert.deepEqual(template, ['<span class="ba-template-rank mw-no-invert" title="Rank 3">3</span>', '<span class="ba-template-rank mw-no-invert" title="Rank 5">5</span>']);

    await click('target', 9);
    await click('current', 6);
    assert.deepEqual(await badges(), ['<span class="ba-template-rank ba-template-rank-uw mw-no-invert" title="Unique Weapon rank 1">1</span>',
        '<span class="ba-template-rank ba-template-rank-uw mw-no-invert" title="Unique Weapon rank 4">4</span>']);
    assert.deepEqual(await evaluate(`[3, 5, 6, 9].map(rank => document.querySelector('.fragcalc-rank[data-rank-type="target"] .control[data-rank="' + rank + '"]').title)`),
        ['Rank 3', 'Rank 5', 'Unique Weapon rank 1 (comes with Rank 5)', 'Unique Weapon rank 4']);
});

test('no script errors', () => {
    assert.deepEqual(errors, []);
});

// Small DOM fixtures for the shared filter paths. Called by events/test-browser.mjs.
import assert from 'node:assert/strict';

const characters = [
    ['azusa', 'Azusa', 'trinity', 'JP', 'new'],
    ['swimsuit', 'Azusa (Swimsuit)', 'trinity', 'GL', 'new'],
    ['cycling', 'Shiroko (Cycling)', 'abydos', 'GL', 'rerun'],
    ['sakurako', 'Sakurako', 'trinity', 'GL', 'new'],
    ['seia', 'Seia', 'trinity', 'JP', 'new'],
    ['punctuation', 'Demo_[.*?] (Test-A)', 'abydos', 'GL', 'rerun'],
    ['japanese', '夏の学生', 'abydos', 'JP', 'new']
];
const gifts = [
    ['base', ['Azusa', 'Shiroko'], 3],
    ['variant', ['Azusa (Swimsuit)', 'Sakurako'], 3],
    ['seia', ['Seia'], 2],
    ['mixed', ['Azusa', 'Azusa (Swimsuit)'], 3],
    ['partial', ['Azusako'], 2],
    ['japanese', ['夏の学生'], 2],
    ['punctuation', ['Demo_[.*?] (Test-A)'], 3],
    ['empty', [], 2]
];
const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function commonFilterFixture(target) {
    const controls = target === 'charactertable' ? ['school-trinity', 'school-abydos'] :
        target === 'bannertable' ? ['server-jp', 'server-gl', 'release-new', 'release-rerun'] : ['rarity-2', 'rarity-3'];
    const rows = target === 'gifttable' ? gifts.map(([id, names, rarity]) =>
        `<tr data-test-row="${id}" data-rarity="${rarity}"><td>${id}</td><td>${names.map(name => `<img src="${pixel}" alt="${escape(name)}">`).join('')}</td></tr>`
    ) : characters.map(([id, name, school, server, release]) => {
        const cells = target === 'bannertable' ? [name, ''] : ['', name];
        return `<tr data-test-row="${id}" data-school="${school}" data-server="${server.toLowerCase()}" data-release="${release}"><td>${escape(cells[0])}</td><td>${escape(cells[1])}</td></tr>`;
    });
    return `<!doctype html><meta charset="utf-8"><style>.hidden {display:none}</style>
<div id="table-filter" data-target="${target}" data-search-cell-index="${target === 'bannertable' ? 0 : 1}">
<div class="controls controls-search"></div><div class="controls">${controls.map(toggle => `<span data-toggle="${toggle}">${toggle}</span>`).join('')}</div></div>
<table id="${target}"><thead><tr><th>First</th><th>Second</th></tr></thead><tbody>${rows.join('')}</tbody></table>
<script>window.mw = {loader: {state: function() {}}};</script>
<script src="/events/upstream/jquery.js"></script>
<script>$('#${target}').data('tablesorter', {config: {sortList: []}});</script>
<script src="/tablefilter.js"></script><script>$(function() {window.filterTestReady = true;});</script>`;
}

export async function testCommonFilters({send, evaluate, origin}) {
    let run = 0;
    async function load(target, hash = '') {
        await send('Page.navigate', {url: `${origin}/filter-test/${target}?run=${++run}${hash}`});
        await evaluate(`new Promise((resolve, reject) => {
            const start = Date.now(); const timer = setInterval(() => {
                if (window.filterTestReady) { clearInterval(timer); resolve(true); }
                else if (Date.now() - start > 8000) { clearInterval(timer); reject(new Error('Filter initialization timeout')); }
            }, 25);
        })`);
    }
    const visible = () => evaluate(`Array.from(document.querySelectorAll('[data-test-row]')).filter(row => getComputedStyle(row).display !== 'none').map(row => row.dataset.testRow)`);
    const input = query => evaluate(`$('#table-search').trigger('focus').val(${JSON.stringify(query)}).trigger('input')`);
    const click = toggle => evaluate(`$('#table-search').trigger('blur'); $('[data-toggle="${toggle}"]').trigger('click')`);
    async function check(query, expected) {
        await input(query);
        assert.deepEqual(await visible(), expected, query);
    }
    const all = characters.map(row => row[0]);
    for (const target of ['charactertable', 'bannertable']) {
        console.log('Checking universal exclusions:', target);
        await load(target);
        for (const [query, expected] of [
            ['exclude:swimsuit', all.filter(id => id !== 'swimsuit')],
            ['EXCLUDE:ＳＷＩＭＳＵＩＴ', all.filter(id => id !== 'swimsuit')],
            ['exclude:"azusa (swimsuit)"', all.filter(id => id !== 'swimsuit')],
            ['azusa exclude:swimsuit', ['azusa']],
            ['exclude:azusa exclude:cycling', ['sakurako', 'seia', 'punctuation', 'japanese']],
            ['exclude:夏', all.filter(id => id !== 'japanese')],
            ['exclude:"[.*"', all.filter(id => id !== 'punctuation')],
            ['exclude:demo_[.*?]', all.filter(id => id !== 'punctuation')],
            ['exclude:test-a', all.filter(id => id !== 'punctuation')],
            ['exclude:trinity exclude:wappi', all],
            ['exclude:', all],
            ['exclude:""', all],
            ['exclude:"azusa (swimsuit)', all.filter(id => id !== 'swimsuit')],
            ['"azusa (swimsuit)"', ['swimsuit']],
            ['"[.*"', ['punctuation']],
            ['"exclude:azusa"', []]
        ]) await check(query, expected);
        await input('exclude:"azusa (swimsuit)" exclude:demo_[.*?]');
        const toggle = target === 'charactertable' ? 'school-trinity' : 'server-gl';
        await click(toggle);
        const expected = target === 'charactertable' ? ['azusa', 'sakurako', 'seia'] : ['cycling', 'sakurako'];
        assert.deepEqual(await visible(), expected, 'Toggles must preserve exclusions');
        assert((await evaluate(`$('#table-search').val()`)).includes('exclude:"azusa (swimsuit)"'));
        const hash = await evaluate('location.hash');
        await load(target, hash);
        assert.deepEqual(await visible(), expected, 'Saved URLs must restore exclusions and toggles');
        assert.equal(await evaluate(`$('[data-toggle="${toggle}"]').hasClass('active')`), true);
        await click(toggle);
        await check('', all);
        const keyword = target === 'charactertable' ? 'trinity' : 'new';
        await check(keyword + ' exclude:swimsuit', target === 'charactertable' ? ['azusa', 'sakurako', 'seia'] : ['azusa', 'sakurako', 'seia', 'japanese']);
        await load(target);
        await check('ᓀ‸ᓂ exclude:swimsuit', ['azusa']);
        await load(target);
        await check('azusa,swimsuit', ['swimsuit']);
        if (target === 'bannertable') {
            await check('wappi exclude:swimsuit', ['sakurako']);
        }
    }

    console.log('Checking universal exclusions: gifttable');
    await load('gifttable');
    const allGifts = gifts.map(row => row[0]);
    for (const [query, expected] of [
        ['exclude:swimsuit', ['base', 'seia', 'partial', 'japanese', 'punctuation', 'empty']],
        ['EXCLUDE:"Azusa (Swimsuit)"', ['base', 'seia', 'partial', 'japanese', 'punctuation', 'empty']],
        ['azusa exclude:swimsuit', ['base']],
        ['azusa sakurako', ['base', 'variant', 'mixed']],
        ['exclude:azusa exclude:夏', ['seia', 'punctuation', 'empty']],
        ['exclude:"[.*"', allGifts.filter(id => id !== 'punctuation')],
        ['exclude:', allGifts],
        ['exclude:""', allGifts],
        ['"Azusa (Swimsuit)"', ['variant', 'mixed']],
        ['"[.*"', ['punctuation']]
    ]) await check(query, expected);
    await check('azusa exclude:swimsuit', ['base']);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('img')).filter(img => img.style.borderWidth === '4px').map(img => img.alt)`), ['Azusa'], 'Only included gift matches should be highlighted');
    await click('rarity-3');
    assert.deepEqual(await visible(), ['base']);
    assert((await evaluate(`$('#table-search').val()`)).includes('exclude:swimsuit'));
    const giftHash = await evaluate(`'#' + encodeURIComponent(filtersToURI(tableFilters))`);
    await load('gifttable', giftHash);
    assert.deepEqual(await visible(), ['base'], 'Gift filter URLs must restore exclusions');
    await click('rarity-3');
    await check('', allGifts);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('img')).filter(img => img.style.borderWidth === '4px').length`), 0, 'Clearing filters must clear highlights');
    console.log('PASS: character, banner and gift exclusions; phrases, punctuation, Unicode, aliases, keywords, toggles, URLs and gift highlights.');
}

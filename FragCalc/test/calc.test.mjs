// The calculator's arithmetic against the figures the wiki's Shop page publishes (Eligma Section, 2026-09-30).
// Run, from the repository root: node --test FragCalc/test/calc.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// fragcount.js with just enough of jQuery for its arithmetic; its init waits for a document ready that never comes
const $ = () => ({ready() {}});
$.each = (list, callback) => { list.forEach((value, index) => callback.call(value, index, value)); return list; };
$.extend = Object.assign;
const context = vm.createContext({$, document: {}});
vm.runInContext(fs.readFileSync(new URL('../fragcount.js', import.meta.url), 'utf8'), context);
// Plain copies: objects made in the script's context have that context's prototypes, which deepStrictEqual tells apart
const fragCalcPlan = state => JSON.parse(JSON.stringify(context.fragCalcPlan(state)));

const [S3, S4, S5, UE30, UE40, UE50, UE60] = [3, 4, 5, 6, 7, 8, 9];
const fresh = {price: 1, can_buy: 20};
const plan = (current, target, owned = 0, shop = fresh) => fragCalcPlan({current, target, owned, ...shop});
const tiers = result => result.tiers.map(tier => [tier.elephs, tier.eligma]);

test('bullets: from the base 3★, with nothing bought yet', () => {
    for (const [target, elephs, eligma] of [[S5, 220, 900], [UE40, 340, 1500], [UE50, 520, 2400], [UE60, 720, 3400]]) {
        const result = plan(S3, target);
        assert.equal(result.needed, elephs);
        assert.equal(result.bought, elephs);
        assert.equal(result.eligma, eligma);
    }
});

test('Cumulative Cost table: 20 Elephs at each price, then 5 each', () => {
    // Buying a number of Elephs: all that 1★ to UE60 takes (830) but the ones owned
    const buy = count => plan(1, UE60, 830 - count);
    assert.deepEqual([20, 40, 60, 80, 81].map(count => buy(count).eligma), [20, 60, 120, 200, 205]);
    assert.deepEqual(tiers(buy(81)), [[20, 20], [20, 40], [20, 60], [20, 80], [1, 5]]);
    assert.deepEqual(buy(300).tiers.map(tier => tier.price), [1, 2, 3, 4, 5]);
});

test('Promotion Cost table: each promotion alone, and in total, from nothing bought', () => {
    const table = {
        1: [[2, 30, 40], [3, 80, 200, 110, 350], [4, 100, 300, 210, 850], [5, 120, 400, 330, 1450]],
        2: [[3, 80, 200], [4, 100, 300, 180, 700], [5, 120, 400, 300, 1300]],
        3: [[4, 100, 300], [5, 120, 400, 220, 900]],
        4: [[5, 120, 400]],
    };
    for (const [from, rows] of Object.entries(table)) {
        for (const [to, elephs, eligma, total_elephs = elephs, total_eligma = eligma] of rows) {
            assert.deepEqual([plan(to - 1, to).needed, plan(to - 1, to).eligma], [elephs, eligma], `${to - 1}★→${to}★`);
            assert.deepEqual([plan(+from, to).needed, plan(+from, to).eligma], [total_elephs, total_eligma], `${from}★→${to}★`);
        }
    }
});

test('Unique Weapons Upgrade Cost table, starting at price 1 and at price 5', () => {
    const at5 = {price: 5, can_buy: 20};
    for (const [to, elephs, eligma, total_elephs, total_eligma] of [[UE40, 120, 400, 120, 400], [UE50, 180, 700, 300, 1300]]) {
        assert.deepEqual([plan(to - 1, to).needed, plan(to - 1, to).eligma], [elephs, eligma]);
        assert.deepEqual([plan(UE30, to).needed, plan(UE30, to).eligma], [total_elephs, total_eligma]);
    }
    // The page gives 2,500 for the total at price 1: 500 Elephs from the first price cost 200 for 80, and 420 × 5
    assert.deepEqual([plan(UE50, UE60).needed, plan(UE50, UE60).eligma], [200, 800]);
    assert.deepEqual([plan(UE30, UE60).needed, plan(UE30, UE60).eligma], [500, 2300]);
    for (const [to, eligma, total] of [[UE40, 600, 600], [UE50, 900, 1500], [UE60, 1000, 2500]]) {
        assert.equal(plan(to - 1, to, 0, at5).eligma, eligma);
        assert.equal(plan(UE30, to, 0, at5).eligma, total);
    }
});

test('UE30 comes with 5★, and 1★ to UE60 takes 830 Elephs, 3,950 Eligma', () => {
    assert.deepEqual([plan(S5, UE30).needed, plan(S5, UE30).credits], [0, 0]);
    assert.deepEqual([plan(1, UE60).needed, plan(1, UE60).eligma], [830, 3950]);
    assert.equal(plan(1, UE60).credits, 10000 + 40000 + 200000 + 1000000 + 1000000 + 1500000 + 2000000);
});

test('the shop state: the price and how many are left at it', () => {
    // 15 left of price 3: they go first, then price 4's 20, then price 5
    const result = plan(S3, S4, 70, {price: 3, can_buy: 15});
    assert.deepEqual(tiers(result), [[0, 0], [0, 0], [15, 45], [15, 60], [0, 0]]);
    assert.deepEqual(result.after, {price: 4, can_buy: 5});
    assert.deepEqual(tiers(plan(S3, S4, 50, {price: 3, can_buy: 15})), [[0, 0], [0, 0], [15, 45], [20, 80], [15, 75]]);
    // How many are left at the last price doesn't matter: it never rises
    assert.deepEqual(plan(S3, S5, 0, {price: 5, can_buy: 3}), plan(S3, S5, 0, {price: 5, can_buy: 20}));
    assert.deepEqual(plan(S3, S5, 0, {price: 5, can_buy: 20}).after, {price: 5, can_buy: null});
    assert.deepEqual(plan(S4, S5, 101).after, {price: 1, can_buy: 1});
    assert.deepEqual(plan(S4, S5, 100).after, {price: 2, can_buy: 20});
});

test('quantities read as ItemCard shows them', () => {
    // What the wiki's parser made of {{ItemCard|Credits|quantity=…}} on 2026-09-30
    const shown = {0: '0', 1: '1', 5: '5', 9999: '9999', 10000: '10k', 10500: '11k', 250000: '250k', 999999: '1000k',
        1000000: '1M', 1200000: '1.2M', 1250000: '1.3M', 3500000: '3.5M', 5750000: '5.8M', 7750000: '7.8M'};
    for (const [value, text] of Object.entries(shown)) assert.equal(context.fragCalcQuantity(+value), text, value);
});

test('owned Elephs go first; nothing to buy when they cover the rank-up', () => {
    const result = plan(S3, S4, 130);
    assert.deepEqual([result.needed, result.bought, result.eligma, result.spare], [100, 0, 0, 30]);
    assert.deepEqual(result.after, {price: 1, can_buy: 20});
    assert.deepEqual([plan(S3, S5, 100).bought, plan(S3, S5, 100).eligma], [120, 400]);
    assert.deepEqual([plan(S4, S4).needed, plan(UE60, UE60).bought], [0, 0]);
});

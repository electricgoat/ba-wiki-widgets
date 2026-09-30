# StatCalc

The character stat calculator of [Blue Archive Wiki](https://bluearchive.wiki) and the tables that share its script: the stat table of character pages (`{{CharacterStatTable}}`), the [Characters StatChart](https://bluearchive.wiki/wiki/Characters_StatChart) with every character in one table, the affection tables (`{{CharacterAffectionTable}}`) and the potential tables (`{{CharacterPotentialTable}}`). They are separate files here and one script on the wiki, built from them.

## Files and wiki destination

| Local file | Destination |
| --- | --- |
| [calc.js](calc.js), [table.js](table.js), [chart.js](chart.js), [affection.js](affection.js), [potential.js](potential.js), [init.js](init.js) | Sources, built in this order |
| [dist/StatCalc.js](dist/StatCalc.js) | `MediaWiki:StatCalc.js`, loaded on every page by `MediaWiki:Common.js` |
| [statCalc.html](statCalc.html), [statChart.html](statChart.html) | Local previews of a character page's tables and of the chart, running `dist/StatCalc.js` |

- **calc.js**: the data tables, the stat math, each stat table's state and recalculation, and what character pages and the chart share: the rarity stars, the equipment slots and their controls' handlers.
- **table.js**: the stat table of a character page (`initStatCalc`).
- **chart.js**: the chart (`initStatChart`): its controls, its rows, the ranks and percentiles of every stat, and its two affection controls.
- **affection.js**: the affection tables, and their link into the stat tables: each takes its own table's bonus (main) and its other versions' (alt).
- **potential.js**: the potential tables.
- **init.js**: the one ready handler. It starts the affection tables, the stat table, the chart, the affection link and the potential tables, in that order, each on its own: one that throws doesn't stop the others. Each part attaches its handlers where it creates its controls.

## Where it runs

- **A character page** has one stat table; affection tables, the student's own first, then the other versions' that a DPL query on the page brings in; and a potential table.
- **The chart** is a DPL table of every character (`Template:StatChartTable` and the `Template:StatChartRow*.dpl` templates). Each row carries `data-character-id` and `data-character-name`, and hidden cells with the unique weapon, the unique gear and the affection levels. The code that looks unused on character pages carries the chart: a row's own affection by its id, its other versions' by its name.
- **Forms** (Hoshino (Battle) Attacker, Shun (Swimsuit) Kid) have no affection table of their own. On their pages the DPL brings their versions' tables; on the chart they take their version's table (`affectionFormOf`).
- `MediaWiki:Common.js` loads the script on every page of the wiki; each part does nothing where its tables aren't.

## Build and deploy

```powershell
node StatCalc/build.mjs          # writes dist/StatCalc.js
node StatCalc/build.mjs --check  # fails when dist/StatCalc.js isn't the build of the sources
node StatCalc/build.mjs --diff   # the build against the live page, blank lines aside (read-only)
```

Commit `dist/StatCalc.js` with the sources. To deploy, replace the whole of `MediaWiki:StatCalc.js` with it. Readers get the new script within about five minutes: the CDN caches the URL that Common.js loads, and an edit doesn't purge it.

## Checks

```powershell
node StatCalc/test/live-check.mjs [--baseline file] [--candidate file] [filter ...]
```

Read-only. It loads live pages (Shiroko, Yoshimi, Airi, Hoshino (Battle) Attacker and the chart) in Vector, Citizen, Citizen's mobile view and Minerva, answers their request for `MediaWiki:StatCalc.js` with the baseline (the live revision, or a file) and then with the candidate (`dist/StatCalc.js`), plays the same clicks, typing, sorting and filtering on both, and compares everything shown: stats and their tooltips, the controls, the boxes, affection totals, potential bonuses, and every chart row with its ranks. A filter keeps the runs whose "page/skin" contains it (`Shiroko`, `minerva`, `StatChart/vector`).

It exits 1 when anything differs, an action fails or the candidate throws. Differences are expected when a change is meant to alter results; a refactor has none. It needs Chrome or Edge (`STATCALC_TEST_BROWSER` names another Chromium executable) and the network, and takes about ten minutes for all 20 runs.

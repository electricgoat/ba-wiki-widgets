# StatCalc

The character stat calculator of [Blue Archive Wiki](https://bluearchive.wiki) and the tables that share its script: the stat table of character pages (`{{CharacterStatTable}}`), the [Characters StatChart](https://bluearchive.wiki/wiki/Characters_StatChart) with every character in one table, the affection tables (`{{CharacterAffectionTable}}`) and the potential tables (`{{CharacterPotentialTable}}`). They are separate files here and one script on the wiki, built from them.

## Files and wiki destination

| Local file | Destination |
| --- | --- |
| [calc.js](calc.js), [table.js](table.js), [chart.js](chart.js), [affection.js](affection.js), [potential.js](potential.js), [init.js](init.js) | Sources, built in this order |
| [dist/StatCalc.js](dist/StatCalc.js) | `MediaWiki:Gadget-StatCalc.js` (the StatCalc gadget) |
| [Category_Pages_with_StatCalc.wikitext](Category_Pages_with_StatCalc.wikitext) | `Category:Pages with StatCalc` (hidden tracking category) |
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

## Loading

The script is the StatCalc gadget, loaded only on the pages of `Category:Pages with StatCalc`: `{{CharacterStatTable}}` and `{{StatChartControls}}` add them to it (the chart gets its stat data from DPL stand-ins for the character pages' templates, so only its controls can). The category is hidden, like FragCalc's and XPtable's. The line in `MediaWiki:Gadgets-definition`:

```
* StatCalc[ResourceLoader|default|hidden|categories=Pages with StatCalc]|StatCalc.js
```

It's a gadget since 2026-10-01. Before, `MediaWiki:Common.js` loaded `MediaWiki:StatCalc.js` on every page; that page now redirects to the gadget's, and nothing should load it: on a page with the gadget, StatCalc would start twice.

- The script runs in a function of its own, so its top-level names aren't globals; nothing else on the wiki uses them (checked 2026-09-30).
- ResourceLoader checks a gadget's syntax before serving it, and serves a parse error in place of a script it rejects: MediaWiki 1.46 accepts ES2017 at most, so no optional chaining, `??` or object spread. The build uses nothing past ES2015 (`const`, template literals, `for…of`). The check below gives the page the script past that validation and unminified, so only its `--candidate served` run, after a deploy, shows what ResourceLoader made of it.
- A page loads the gadgets it was rendered with, and the CDN keeps a rendered page for a day or more. A change to `MediaWiki:Gadgets-definition` refreshes none of those copies; an edit to a template the pages use purges them all. So a gadget has to exist before its category goes on pages: on 2026-10-01 the category came nine minutes earlier, and the pages the CDN cached in between were served without StatCalc and had to be purged.

## Build and deploy

```powershell
node StatCalc/build.mjs          # writes dist/StatCalc.js
node StatCalc/build.mjs --check  # fails when dist/StatCalc.js isn't the build of the sources
node StatCalc/build.mjs --diff   # the build against the live script, blank lines aside (read-only)
```

Commit `dist/StatCalc.js` with the sources. To deploy, replace the whole of `MediaWiki:Gadget-StatCalc.js` with it. Readers get the new script within about five minutes.

## Checks

```powershell
node StatCalc/test/live-check.mjs [--baseline file] [--candidate file|served] [filter ...]
```

Read-only. It loads live pages (Shiroko, Yoshimi, Airi, Hoshino (Battle) Attacker and the chart) in Vector, Citizen, Citizen's mobile view and Minerva, gives them the baseline (the live script's revision, or a file) and then the candidate (`dist/StatCalc.js`), each swapped for the gadget's code in its ResourceLoader response. It plays the same clicks, typing, sorting and filtering on both and compares everything shown: stats and their tooltips, the controls, the boxes, affection totals, potential bonuses, and every chart row with its ranks. `--candidate served` leaves the page's script as the wiki serves it, to check a deploy. Every load is a first visit to the page as the wiki renders it now: in a browser context of its own, as ResourceLoader keeps gadgets in localStorage and one taken from there never comes by to be swapped, and at an address of its own, as the CDN keeps a copy of each address. So it doesn't show what the CDN serves readers. A filter keeps the runs whose "page/skin" contains it (`Shiroko`, `minerva`, `StatChart/vector`).

It exits 1 when anything differs, an action fails, the candidate throws, or a page doesn't load the gadget or loads the old `MediaWiki:StatCalc.js` as well. Differences are expected when a change is meant to alter results; a refactor has none. It needs Chrome or Edge (`STATCALC_TEST_BROWSER` names another Chromium executable) and the network, and takes about ten minutes for all 20 runs.

# FragCalc

A calculator of what a student's rank-up costs in the Eligma shop, for the character pages of [Blue Archive Wiki](https://bluearchive.wiki). It puts the price ladder of the [Shop page's Eligma Section](https://bluearchive.wiki/wiki/Shop#Eligma_Section) in terms of one student: which Elephs to buy at which price, and the Eligma it all takes. It follows the stat calculator in [StatCalc](../StatCalc) ([calc.js](../StatCalc/calc.js), previewed in [statCalc.html](../StatCalc/statCalc.html)): a `wikitable` whose controls row the script fills in, with the same star selectors and inputs.

It shows ranks with the wiki's [Template:Rank](https://bluearchive.wiki/wiki/Template:Rank), a rank as one star with its number over it.

Open [fragcount.html](fragcount.html) for a local preview; [fragcount-mobile.html](fragcount-mobile.html) has its images as the mobile view serves them. Published on 2026-09-30: the template, its stylesheet, the gadget and its category. The [Shop page's Eligma Section](https://bluearchive.wiki/wiki/Shop#Character_Section) uses the calculator, with Shiroko's Eleph standing in; character pages don't yet.

## Files and wiki destinations

| Local file | Destination |
| --- | --- |
| [fragcount.js](fragcount.js) | `MediaWiki:Gadget-FragCalc.js` (the FragCalc gadget) |
| [Category_Pages_with_FragCalc.wikitext](Category_Pages_with_FragCalc.wikitext) | `Category:Pages with FragCalc` (hidden tracking category) |
| [style.css](style.css) | `Template:FragCalc/styles.css` (TemplateStyles) |
| [Template_FragCalc.wikitext](Template_FragCalc.wikitext) | `Template:FragCalc` |
| [fragcount.html](fragcount.html), [fragcount-mobile.html](fragcount-mobile.html) | Local previews, built by [build-preview.mjs](build-preview.mjs) |

Create the stylesheet before the template, which uses `Template:Rank` (on the wiki since 2026-09-30). The script is a gadget (see [Loading](#loading)): create `MediaWiki:Gadget-FragCalc.js` and the category page, and add this line to `MediaWiki:Gadgets-definition`, before the template goes on pages:

```
* FragCalc[ResourceLoader|default|hidden|categories=Pages with FragCalc]|FragCalc.js
```

A character page then gets `{{FragCalc|eleph=Shiroko's Eleph}}`: `eleph` is the name of the student's Eleph item as `{{ItemCard}}` takes it (`Cherino's (Hot Spring) Eleph` for Cherino (Hot Spring)); Shiroko's stands in when it's left out. `rarity` sets the star rank the calculator starts from (3 by default).

## How it works

- **Current state:** the student's rank (5 stars, then 4 unique weapon stars as in the stat calculator), the Elephs owned (100 by default), and the shop's state as the game shows it: the Eleph's current price and how many more the shop sells at it (the MAX amount of the purchase window). At price 5 there's no count: the price never rises again.
- **Target:** a rank at or above the current one; raising the current rank takes the target along.
- **Output:** a row per price with the Elephs bought and their Eligma cost, the totals, and a summary: the rank-up as two `{{Rank}}` badges, the Elephs it needs and how many are owned, its credits, and the shop's price afterwards.
- The template renders a `{{Rank}}` badge for each rank in the hidden controls row; the script copies them into the summary, and names the selector's stars by their titles. A rank added to `fragcalc_rank_up` (UE70, say) needs its badge there too.
- The prices, the credits and the price afterwards are ItemCards with a quantity (`{{ItemCard|Eligma|quantity=1|text=}}`, `{{ItemCard|Credits|quantity=…}}`). The template renders one of each in the hidden controls row, and the script copies them with its own quantities, shortened as ItemCard shortens them: 1,250,000 credits read 1.3M, with the whole number in the tooltip.
- The rank selectors work from the keyboard as radio groups. On phones the controls stack in input order. Filters sit on the stars' spans rather than the images, since the wiki's dark mode (the DarkMode extension) inverts the page and re-inverts images with filters of their own.
- The mobile view (MobileFrontend, for phones, in Minerva and in Citizen alike) serves images as placeholders that it loads when they come into view, which those of the hidden row never do: the script makes the ones it copies images again, from the placeholders' data.
- The table has no minimum width, unlike the stat table. Beside the infobox, which floats right, Citizen gives a table only the room left, where a minimum width made it scroll sideways; the controls wrap instead.
- Seen on a live character page in each skin (`test/skin-check.mjs`, see [Checks](#checks)): Vector, the default; Citizen, light and dark, at desktop, tablet and phone widths; and Minerva, the default on phones.
- Without JavaScript, the table shows its example (3★ to 5★ with 100 Elephs owned, from price 1), the same one the script starts with.

## Loading

The script is the FragCalc gadget, loaded only on the pages of `Category:Pages with FragCalc`, which `Template:FragCalc` adds them to: the gadget definition's `categories` option, as the ModelViewer gadget does with `Category:Pages with model viewer`. The category is hidden (`__HIDDENCAT__`), like that one.

- Other pages don't load it at all, and the pages that do get it minified, with the other default gadgets they load anyway, cached for 30 days under a versioned URL. A script that `MediaWiki:Common.js` loads by URL (`action=raw`) is served unminified and cached for 60 seconds, so it's fetched again on nearly every page view, and only after Common.js has run (all measured on 2026-09-30).
- Gadget code runs in a function of its own, so the script's top-level names are not globals. The script doesn't need them to be; the browser test runs it that way.
- The gadget should also load in edit preview, as Gadgets checks the categories of the page shown; that remains to be seen, logged in, as the wiki doesn't let anonymous users edit.

**StatCalc and XPtable move to the same scheme.** `MediaWiki:Common.js` loaded `MediaWiki:StatCalc.js` (50.5 KB, 10 KB gzipped) and `MediaWiki:XPtable.js` (8 KB) on every page of the wiki, about 62,800, though the stat calculator is used on the 277 pages with `{{CharacterStatTable}}` and the stat chart, and the XP calculator on a few pages. Each gets a hidden tracking category, becomes a gadget loading on the pages of that category, and its `mw.loader.load` line leaves Common.js. XPtable is a gadget since 2026-09-30 (the ba-xptable repository); its pages add the category themselves, their calculators being no template. StatCalc is one since 2026-10-01 ([StatCalc's README](../StatCalc/README.md#loading)): its category comes from `{{CharacterStatTable}}` and, for the chart, `{{StatChartControls}}`.

Things to fix in StatCalc on the way, seen on 2026-09-30 while checking FragCalc in the skins:
- In Minerva's mobile view it throws `TypeError: Cannot read properties of undefined (reading 'split')` (`StatCalc.js` line 312, in `initStatCalc`) and doesn't start: the mobile view serves images as placeholders, so the gear image's `src` it reads isn't there. FragCalc's `fragCalcImage` shows how to read them. Fixed in [calc.js](../StatCalc/calc.js) (`page_imagesrc`), on the wiki since 2026-09-30.
- In Citizen it left out the unique weapon's stats, the unique gear and the student's rarity, and in Minerva the rarity (1★ and 2★ students started at 3★): `initStats` looked for them in the stat table's parent, which in Citizen is the wrapper that scrolls wide tables and in Minerva the collapsible section. It looks in the page content now, and copies the rank stars as `fragCalcImage` copies images, which gives them their high-resolution versions in the mobile view. Fixed in [calc.js](../StatCalc/calc.js), on the wiki since 2026-09-30.
- In Citizen, the stat table sits beside the infobox, which floats right, and its 575px minimum width makes it scroll sideways, by 40px at a 1280px window, which hides most of the unique gear's tier selector.

## Data

Every figure is the same for all released students (278 in the JP data, v1.73; 264 in Global's, patch 1750), and the same in both regions, as of 2026-09-30:

- **Price ladder:** each student's Eleph is a `SecretStone` shop product whose goods (`GoodsExcelTable`) cost 1 Eligma, with `ConsumeExtraStep` 20 ×5 and `ConsumeExtraAmount` 1–5: 20 Elephs at each price, then 5 for good. `ShopExcelTable`'s `PurchaseCountLimit` is 900 per student, `PurchaseCountResetType` None: the price never resets. 1★ to UE60 takes 830 Elephs.
- **Rank-ups** (`RecipeIngredientExcelTable`): 2★ to 5★ take 30, 80, 100 and 120 Elephs (10k, 40k, 200k and 1M credits; `CharacterTranscendenceExcelTable`); the unique weapon's UE40, UE50 and UE60 take 120, 180 and 200 (1M, 1.5M, 2M; `CharacterWeaponExcelTable`), and UE30 comes with 5★. A fifth weapon rank (UE70) is in the tables but locked (`Unlock` false), with a placeholder recipe of 1 Eleph; adding it is one more entry in `fragcalc_rank_up`, and one more `{{Rank}}` badge in the template.

All the Eligma Section's figures agree, but one: the Unique Weapons Upgrade Cost table gives 2,500 Eligma as the UE60 total at starting cost 1. 500 Elephs from price 1 cost 200 for the first 80 and 420 × 5, 2,300; 2,500 is the starting cost 5 total.

## Checks

From the repository root:

```powershell
node FragCalc/build-preview.mjs             # rebuilds the previews; also checks the template and stylesheet on the wiki
node --test FragCalc/test/calc.test.mjs     # the arithmetic, against the Shop page's figures
node --test FragCalc/test/browser.test.mjs  # the FragCalc preview in headless Chrome or Edge
node FragCalc/test/skin-check.mjs [outdir]  # the calculator on a live character page in each skin, with screenshots
```

`build-preview.mjs` is read-only: it sends the drafts to the wiki's `action=parse` with TemplateSandbox (no login, tokens or edits). It checks that the template parses without errors (every `ItemCard` found, and the wiki's `{{Rank}}` badges with their stylesheet), putting its page in the tracking category, and that TemplateStyles keeps every declaration of the stylesheet. Then it builds the previews from the parser's output.

Opened from disk, `fragcount.html` runs the script as a plain one; served over http, `?gadget` runs it as ResourceLoader runs the gadget, in a function of its own. The browser test serves it so, and needs Chrome or Edge (`FRAGCALC_TEST_BROWSER` names another Chromium executable) and the network, for jQuery and the wiki's images. It covers the defaults, the rank selectors, the shop state, typing, the keyboard, phone widths, the page without the script, that the script's ItemCards and `{{Rank}}` badges are the template's, and that the gadget leaves no globals. `fragcount-mobile.html` has the table's images as the mobile view serves them, placeholders, and the test checks that the script shows them all.

`skin-check.mjs` puts the previews' table on Shiroko's live page (read-only) where the stat table is, with its stylesheet as TemplateStyles serves it, lets the skin handle it as page content and runs the script as the gadget. It covers Vector, Citizen (light and dark, at 1280, 800 and 390 pixels) and Minerva, the phone ones in the mobile view, and fails when the page or the table scrolls sideways, an icon doesn't show or the script throws. Screenshots go to `outdir`. Errors the page throws before the table is placed are the page's own and only reported.

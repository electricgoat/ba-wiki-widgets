# Combined Events schedule

Local draft based on [Events revision 129973](https://bluearchive.wiki/w/index.php?title=Events&oldid=129973), fetched on 2026-09-12. Nothing has been published. Open [preview.html](preview.html) for the interactive preview; [desktop](preview-desktop.png), [mobile dark mode](preview-mobile.png), and [image tags with all event types shown](preview-tags.png) screenshots are also included.

## Files and wiki destinations

| Local file | Destination |
| --- | --- |
| [Module_EventTable.lua](Module_EventTable.lua) | `Module:EventTable` (Scribunto) |
| [eventtable.css](eventtable.css) | `Template:EventTable/style.css` (sanitized CSS) |
| [Template_EventTableControls.wikitext](Template_EventTableControls.wikitext) | `Template:EventTableControls` |
| [../charactertablecontrols.css](../charactertablecontrols.css) | `Template:CharacterTableControls/style.css` |
| [../tablefilter.js](../tablefilter.js) | `MediaWiki:TableFilter.js` |
| [MediaWiki_Common.js.patch](MediaWiki_Common.js.patch) | Add Events to the existing filter loader in `MediaWiki:Common.js` |
| [Events.wikitext](Events.wikitext) | Replacement for the Events Schedule section of `Events` |

Create the module, styles and controls before updating the page. Include both JavaScript changes: Common.js currently does not load TableFilter.js on Events. A complete [Common.js draft](MediaWiki_Common.js) is provided alongside its one-line patch. The script initializes only `#eventtable`, leaving the other sortable schedules on Events alone.

The shared controls stylesheet starts from live revision 129971, preserving its theme variables and focus styling, then adds scoped Events control styles. The existing local `wappi` search alias remains in tablefilter.js. No Bucket schema or getter update is required.

The `exclude:` syntax is also supported by the character, banner and gift filters; see the [shared filter notes](../README.md). Their browser checks run alongside the Events checks.

## Behavior

- JP is primary initially. Before JavaScript runs, rows are already ordered by their latest JP start date, descending, and reruns/permanent entries have `hidden` classes and CSS rules. The filter also defaults to New only.
- The primary-region radio selects JP or GL, changes title/date emphasis, and resets sorting to that region's latest start date, descending. It inherits the release toggles' colors, font, skew and inactive fading; adjacent options join at a single straight border, with rounded corners only at the outer ends. Both Period headers remain independently sortable. The preview column is unsortable.
- With GL primary, rows without a GL record form an upcoming block above announced GL entries, ordered by JP start date. GL cells remain “Not announced”; sorting does not manufacture a displayed GL date. Unlike the banner table's fixed one-year sort offset, a separate sort-key prefix keeps all JP-only entries in the upcoming block.
- Search is literal, case-insensitive and Unicode-normalized across every JP English, GL English and Japanese name. Whitespace-separated words must all match; double quotes keep a phrase together. An `exclude:` prefix hides a row if any regional title matches that word or phrase, for example `exclude:decagrammaton` or `exclude:"special operation:"`. Included and excluded filters can be combined, and multiple exclusions each apply. Empty filters are ignored; an unfinished quote keeps the remaining text together while typing. Short Japanese searches work; words such as “new”, “JP”, and “GL” remain name text rather than changing toggles.
- English and Japanese event titles share one left edge. The region label sits in a separate column, centered vertically beside the title block, including when longer titles wrap.
- Release buttons are additive. As with BannerTableControls, selecting no release buttons shows all types. Shared URLs record this explicitly as `release=all`; unrelated section anchors keep the default filters.
- Loading a `#eventtable:…` filter link or following one on the same page restores the filters and jumps to the Events Schedule heading (or the controls if the heading is absent) whenever any text follows `#eventtable:`. The jump does not validate the filter text. Editing filters uses `replaceState`, preserving the current scroll position and history length. Ordinary section links retain their native anchor target.
- Rerun and Permanent tags overlay the bottom of the preview image. Their white, normal-weight 10px text, 11px line height and translucent gray background match the Event/Limited/Anniversary labels in [CharacterTable/style.css revision 122288](https://bluearchive.wiki/w/index.php?title=Template:CharacterTable/style.css&oldid=122288). Lifecycle tags use the exact strict bounds in [Template:EventCard/IdTypes](https://bluearchive.wiki/wiki/Template:EventCard/IdTypes): New below 3000, Rerun between 10000 and 11000, Permanent between 900000 and 901000.
- Unannounced GL title lines are omitted; the GL Period cell still says “Not announced”. Matching JP/GL notes appear once without a region prefix; differing notes retain their regional labels. When GL is unannounced, a JP note also appears without a region identifier.
- Promo previews prefer the current JP image, then GL; reruns and permanent variants can fall back to their original event's promo. A missing promo stays blank except for a dash.
- Date ranges use the existing DateRange/DateTime templates with `Y/m/d` and no relative label, following the banner table's timezone behavior. Initial dates are JST; the wiki's DateTime script can apply the reader's selected timezone. This changes two historical Decagrammaton end dates from the old schedule's UTC calendar day to the following JST day. Sort keys always retain the original UTC instant. The stored 2099 end-date sentinel displays as “From [date]”; a finite end date is retained even for a Permanent ID.

## Data pairing

The page makes one BlueBucket query for Event, Collab and PermanentEvent records in both regions, with canonical field names, explicit native ordering, a 1,000-row limit and `default=[]`. The renderer receives its JSON output. BlueBucket continues to handle all database access; Lua only combines and renders the results.

The shared getter has grouping/aggregation but no conditional regional pivot that also preserves repeated periods and missing regional records. Using this small renderer avoids queries for every row, parallel aggregate arrays that lose alignment when optional fields are absent, and changes to the generic getters.

The saved 260 regional records cover 133 IDs and produce 137 table rows: 65 New, 41 Rerun and 31 Permanent. All records are retained. Special Operation: Decagrammaton uses ID 701 for all five parts; each part now has its own row, paired across regions by the explicit part number in Notes. Each row sorts by that part's regional start, shows its shared note once, and can reuse the event's promo. A missing regional part remains unannounced instead of being paired with another part by schedule position. Other IDs retain their existing grouping. The renderer does not remap IDs. Any GL-only entries follow the JP-dated rows in the initial JP ordering.

## Validation

The actual module and BlueBucket invocation passed the wiki's unsaved TemplateSandbox parse, producing 137 rows without parser warnings or Lua errors. Both stylesheets passed TemplateStyles sanitization through the same read-only API. The schedule used one Bucket query and remained well within parser/Lua limits; details are in [upstream/parse-report.json](upstream/parse-report.json).

Browser checks use the saved, actually parsed HTML and the wiki's deployed jQuery 3.7.1 and MediaWiki tablesorter. They check all 260 source periods and all names, individual Decagrammaton parts and notes, defaults with and without filter initialization, promo fallback, regional date ordering including changed GL order, literal searches, quoted phrases, exclusions across all regional titles, empty and unfinished filters, release combinations, URL restoration, radio keyboard behavior, both date headers, the unsortable image header, delayed sorter loading and mobile overflow. No JavaScript exceptions occurred.

Run the offline browser checks from the repository root:

```powershell
node table_filter/events/test-browser.mjs
```

Chrome or Edge must be installed; `EVENT_TEST_BROWSER` can specify another Chromium executable. The test uses an isolated temporary browser profile. No npm installation is needed. It does not modify wiki data. Public thumbnails are cached for the local preview; uncached images and event links use their public wiki URLs. The preview uses a small standalone skin and default JST dates, rather than emulating the wiki's entire skin or DateTime preferences UI.

To repeat the optional read-only wiki parsing checks:

```powershell
node table_filter/events/test-readonly.mjs
node table_filter/events/build-preview.mjs
```

The read-only script sends draft source only to `action=parse` with TemplateSandbox overrides. It does not log in, request edit tokens, save pages or change production modules. Public source revisions, the Bucket data snapshot and parsed HTML are recorded under `upstream/` for review.

# Table filters

`tablefilter.js` is the local source for `MediaWiki:TableFilter.js`. It supports the character, banner, event and gift tables.

All four tables accept `exclude:word` and `exclude:"a phrase"`. Examples:

- `exclude:swimsuit` hides rows whose searchable names contain “swimsuit”.
- `azusa exclude:swimsuit` combines an included name with an exclusion.
- `exclude:"azusa (swimsuit)" exclude:cycling` applies two independent exclusions.

Exclusions match literal, case-insensitive, Unicode-normalized text. They do not activate keyword buttons or interpret regular expressions. Quotes keep spaces and punctuation in one filter; empty exclusions are ignored. Character and banner exclusions search the configured name cell, Events searches all regional titles, and Gifts searches image alt text. Any excluded match hides the entire row, including a gift row that also contains an included character. Existing gift inclusion matching and highlight behavior are preserved.

Exclusions are preserved when toggles change and when existing filter URLs are serialized or restored. The Events URL format and its section-jump behavior are unchanged.

Run the browser checks from the repository root:

```powershell
node table_filter/events/test-browser.mjs
```

The runner checks the saved Events preview and the character, banner and gift fixtures in `test-common-filters.mjs`, using the cached wiki jQuery. These fixtures exercise filtering separately from sorting; the Events checks also use the deployed MediaWiki tablesorter. No wiki writes are performed.

// Unsaved MediaWiki parse only. Does not log in, request tokens, or edit pages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
const page = read('Events.wikitext');
const original = read('upstream/Events.wikitext');
const scheduleEnd = page.indexOf('=Story Events=');
if (scheduleEnd !== -1) {
    assert.equal(page.slice(scheduleEnd), original.slice(original.indexOf('=Story Events=')));
}
// Refresh the public source fixture alongside the live parse so later wiki
// data corrections do not leave the browser checks comparing different data.
const query = JSON.parse(read('upstream/events.json')).bucketQuery;
const dataParams = new URLSearchParams({action: 'bucket', query, format: 'json', formatversion: '2'});
const data = await (await fetch('https://bluearchive.wiki/w/api.php?' + dataParams)).json();
assert(Array.isArray(data.bucket), JSON.stringify(data));
const controls = read('Template_EventTableControls.wikitext').match(/<includeonly>([\s\S]*?)<\/includeonly>/)[1];
const text = page.slice(page.indexOf('=Events Schedule='), scheduleEnd === -1 ? undefined : scheduleEnd)
    .replace('{{EventTableControls}}', controls)
    .replace('<templatestyles src="EventTable/style.css" />', '');
const params = new URLSearchParams({
    action: 'parse', format: 'json', formatversion: '2', title: 'Events',
    text, contentmodel: 'wikitext', prop: 'text|parsewarnings|limitreportdata',
    templatesandboxtitle: 'Module:EventTable',
    templatesandboxtext: read('Module_EventTable.lua'),
    templatesandboxcontentmodel: 'Scribunto'
});
const result = await (await fetch('https://bluearchive.wiki/w/api.php', { method: 'POST', body: params })).json();
assert(!result.error, JSON.stringify(result.error));
assert(!result.warnings, JSON.stringify(result.warnings));
assert.deepEqual(result.parse.parsewarnings, []);
assert(!/Lua error|class="error"|mw-ext-cargo-query-error/.test(result.parse.text), result.parse.text.slice(0, 2000));
assert(!/&lt;\/?(?:thead|tbody)&gt;/.test(result.parse.text), 'MediaWiki escaped table section tags');
fs.writeFileSync(path.join(dir, 'upstream/events.json'), JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'upstream/preview.html'), result.parse.text);
fs.writeFileSync(path.join(dir, 'upstream/parse-report.json'), JSON.stringify(result.parse.limitreportdata, null, 2) + '\n');
console.log('Unsaved parse passed:', (result.parse.text.match(/data-event-id=/g) || []).length, 'combined rows.');
console.log(JSON.stringify(result.parse.limitreportdata));

for (const [file, title, output] of [
    ['../charactertablecontrols.css', 'Template:CharacterTableControls/style.css', 'controls'],
    ['eventtable.css', 'Template:EventTable/style.css', 'events']
]) {
    const cssParams = new URLSearchParams({
        action: 'parse', format: 'json', formatversion: '2', title: 'Events', contentmodel: 'wikitext',
        text: '<templatestyles src="' + title.slice(9) + '" />', prop: 'text|parsewarnings',
        templatesandboxtitle: title, templatesandboxcontentmodel: 'sanitized-css', templatesandboxtext: read(file)
    });
    const css = await (await fetch('https://bluearchive.wiki/w/api.php', {method: 'POST', body: cssParams})).json();
    assert(!css.error && !css.warnings, JSON.stringify(css));
    assert.deepEqual(css.parse.parsewarnings, []);
    assert(!/class="error"/.test(css.parse.text), css.parse.text);
    fs.writeFileSync(path.join(dir, 'upstream/' + output + '-css-preview.html'), css.parse.text);
    console.log(title + ': TemplateStyles validation passed.');
}

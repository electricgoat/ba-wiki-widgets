// Builds dist/StatCalc.js, the page MediaWiki:Gadget-StatCalc.js, from the source files in the order they run.
// node StatCalc/build.mjs           writes dist/StatCalc.js
// node StatCalc/build.mjs --check   fails when dist/StatCalc.js isn't the build of the current sources
// node StatCalc/build.mjs --diff    compares the build with the live page, blank lines aside (read-only)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const sources = ['calc.js', 'table.js', 'chart.js', 'affection.js', 'potential.js', 'init.js'];
export const output = path.join(dir, 'dist', 'StatCalc.js');

const text = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// The published script: the current revision of the gadget's page
export async function livePage() {
    const api = 'https://bluearchive.wiki/w/api.php?action=query&format=json&formatversion=2&prop=revisions&rvprop=ids|timestamp|content&rvslots=main&titles=MediaWiki:Gadget-StatCalc.js';
    const page = (await (await fetch(api, {headers: {'User-Agent': 'ba-wiki-widgets StatCalc build'}})).json()).query.pages[0];
    const revision = page.revisions[0];
    return {title: page.title, revid: revision.revid, timestamp: revision.timestamp, content: revision.slots.main.content};
}

export const build = () => `/* Built from ${sources.join(', ')} in https://github.com/electricgoat/ba-wiki-widgets */\n`
    + sources.map(name => text(path.join(dir, name)).replace(/\n*$/, '\n')).join('\n');

if (process.argv[1] && fileURLToPath(import.meta.url) == path.resolve(process.argv[1])) {
    const script = build();
    new vm.Script(script, {filename: 'StatCalc.js'});
    const mode = process.argv[2];
    if (mode == '--check') {
        if (!fs.existsSync(output) || text(output) !== script) {
            console.error('dist/StatCalc.js is not the build of the current sources: run node StatCalc/build.mjs');
            process.exit(1);
        }
        console.log('dist/StatCalc.js is up to date');
    }
    else if (mode == '--diff') {
        const revision = await livePage();
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'statcalc-diff-'));
        const live = `live-${revision.revid}.js`;
        fs.writeFileSync(path.join(tmp, live), revision.content.replace(/\r\n/g, '\n').replace(/\n*$/, '\n'));
        fs.writeFileSync(path.join(tmp, 'build.js'), script);
        const diff = spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--ignore-blank-lines', '--', live, 'build.js'], {cwd: tmp, stdio: 'inherit'});
        fs.rmSync(tmp, {recursive: true, force: true});
        console.log(diff.status ? `\nThe build differs from ${revision.title}, revision ${revision.revid} (${revision.timestamp}).` : `The build is ${revision.title}, revision ${revision.revid} (${revision.timestamp}), blank lines aside.`);
        process.exit(diff.status ? 1 : 0);
    }
    else {
        fs.mkdirSync(path.dirname(output), {recursive: true});
        fs.writeFileSync(output, script.replace(/\n/g, os.EOL));
        console.log(`Built dist/StatCalc.js from ${sources.join(', ')} (${script.split('\n').length - 1} lines)`);
    }
}

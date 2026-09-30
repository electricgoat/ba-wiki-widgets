// Internal filter array
let tableFilters = [];
let quickFilter = {}; // Groups that have quick filter buttons
let lastSearchSegments = [];

// Initial table sortlists, fist value should be the date column index
const initSortList = {
    'charactertable': [{14: "desc"}, {2: "desc"}, {1: "asc"}],
    'bannertable': [{2: "desc"}, {0: "asc"}],
    'eventtable': [{2: "desc"}, {1: "asc"}],
    'gifttable': [],
}

// Map keywords to button groups/values
const search_keywords = {
    'charactertable' : {
        'gehenna': { group: 'school', value: 'gehenna' },
        'trinity': { group: 'school', value: 'trinity' },
        'valkyrie': { group: 'school', value: 'valkyrie' },
        'highlander': { group: 'school', value: 'highlander' },
        'wildhunt': { group: 'school', value: 'wildhunt' },
        'abydos': { group: 'school', value: 'abydos' },
        'arius': { group: 'school', value: 'arius' },
        'millennium': { group: 'school', value: 'millennium' },
        'red_winter': { group: 'school', value: 'red_winter' },
        'srt': { group: 'school', value: 'srt' },
        'odyssey': { group: 'school', value: 'odyssey' },
        'etc': { group: 'school', value: 'etc' },

        'ar': { group: 'weapon', value: 'ar' },
        'ft': { group: 'weapon', value: 'ft' },
        'gl': { group: 'weapon', value: 'gl' },
        'hg': { group: 'weapon', value: 'hg' },
        'mg': { group: 'weapon', value: 'mg' },
        'rg': { group: 'weapon', value: 'rg' },
        'rl': { group: 'weapon', value: 'rl' },
        'sg': { group: 'weapon', value: 'sg' },
        'smg': { group: 'weapon', value: 'smg' },
        'sr': { group: 'weapon', value: 'sr' },

        'front': { group: 'position', value: 'front' },
        'middle': { group: 'position', value: 'middle' },
        'back': { group: 'position', value: 'back' },

        'attacker': { group: 'role', value: 'attacker' },
        'tank': { group: 'role', value: 'tank' },
        'tanker': { group: 'role', value: 'tank' },
        'healer': { group: 'role', value: 'healer' },
        'support': { group: 'role', value: 'support' },
        'tacticalsupport': { group: 'role', value: 'ts' },
        'ts': { group: 'role', value: 'ts' },
        't.s': { group: 'role', value: 'ts' },
        't.s.': { group: 'role', value: 'ts' },

        'striker': { group: 'class', value: 'striker' },
        'special': { group: 'class', value: 'special' },

        'explosive': { group: 'attack', value: 'explosive' },
        'red': { group: 'attack', value: 'explosive' },
        'mystic': { group: 'attack', value: 'mystic' },
        'blue': { group: 'attack', value: 'mystic' },
        'penetration': { group: 'attack', value: 'penetration' },
        'piercing': { group: 'attack', value: 'penetration' },
        'yellow': { group: 'attack', value: 'penetration' },
        'sonic': { group: 'attack', value: 'sonic' },
        'purple': { group: 'attack', value: 'sonic' },
        'chemical': { group: 'attack', value: 'corrosive' },
        'corrosive': { group: 'attack', value: 'corrosive' },
        'green': { group: 'attack', value: 'corrosive' },

        'light': { group: 'armor', value: 'light' },
        'heavy': { group: 'armor', value: 'heavy' },
        'specialarmor': { group: 'armor', value: 'special' },
        'elastic': { group: 'armor', value: 'elastic' },
        'composite': { group: 'armor', value: 'composite' },

        // Text search keywords
        'ᓀ‸ᓂ': { text: '"azusa"' },
        '`‸´': { text: '"kasumi"' }, //'-`‸´-': { text: 'kasumi' },
        '눈': { text: '"fuuka"' }, //'눈_눈': { text: 'fuuka' },
        '囧': { text: '"koyuki"' },
        'sexy': { text: '"seia"' },
    },
    'bannertable': {
        'gl': { group: 'server', value: 'gl' },
        'global': { group: 'server', value: 'gl' },
        'jp': { group: 'server', value: 'jp' },
        'japan': { group: 'server', value: 'jp' },

        'regular': { group: 'type', value: 'pickupgacha' },
        'normal': { group: 'type', value: 'pickupgacha' },
        'common': { group: 'type', value: 'pickupgacha' },
        'limited': { group: 'type', value: 'limitedgacha' },
        'unique': { group: 'type', value: 'limitedgacha' },
        'anni': { group: 'type', value: 'fesgacha' },
        'anniversary': { group: 'type', value: 'fesgacha' },
        'fes': { group: 'type', value: 'fesgacha' },
        'fest': { group: 'type', value: 'fesgacha' },

        'new': { group: 'release', value: 'new' },
        'rerun': { group: 'release', value: 'rerun' },
        'reprint': { group: 'release', value: 'rerun' },
        'copy': { group: 'release', value: 'rerun' },

        // Text search keywords
        'ᓀ‸ᓂ': { text: '"azusa"' },
        '`‸´': { text: '"kasumi"' }, //'-`‸´-': { text: 'kasumi' },
        '눈': { text: '"fuuka"' }, //'눈_눈': { text: 'fuuka' },
        '囧': { text: '"koyuki"' },
        'sexy': { text: '"seia"' },
        'wappi': { text: '"sakurako"' },
    },
    'eventtable': {},
    'gifttable': {},
    
};

function normalizeSearchText(value) {
    return String(value).normalize('NFKC').toLowerCase();
}

function searchSegments(query, legacySeparators = false) {
    // Quotes keep phrases together, including an unfinished phrase while typing.
    const segments = normalizeSearchText(query).match(/(?:[^\s"]|"[^"]*(?:"|$))+/g) || [];
    if (!legacySeparators) return segments;
    // Preserve the older tables' separators for ordinary filters. Exclusions
    // are literal words/phrases, so punctuation inside them is searchable.
    return segments.flatMap(segment => segment.includes('"') || segment.startsWith('exclude:') ?
        [segment] : segment.split(/[_;,+\-]+/)).filter(Boolean);
}

function searchTerms(query) {
    return searchSegments(query).map(token => {
        const exclude = token.startsWith('exclude:');
        const value = (exclude ? token.slice(8) : token).replace(/"/g, '');
        return {value, exclude};
    }).filter(term => term.value.trim());
}

function exclusionFilter(segment) {
    const value = segment.slice(8).replace(/"/g, '');
    return value.trim() ? {type: 'exclude', src: 'textfield', value} : null;
}

function exclusionText(value) {
    return 'exclude:' + (/[\s_]/.test(value) ? '"' + value + '"' : value);
}

function wholeWordSearchRegex(value) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const start = /^\w/.test(value) ? '\\b' : '';
    const end = /\w$/.test(value) ? '\\b' : '';
    return new RegExp(start + escaped + end, 'i');
}


$(document).ready(function() {
    if ($("#table-filter").data('target') === 'eventtable') {
        initEventTableFilters();
        return;
    }
    initTableFilters();
    updateFiltersUI();
    lastSearchSegments = searchSegments($("#table-search").val(), true);
});

// Events pair both regions in each row. Region toggle changes css presentation and sorting, so prevent it acting as a row-membership filter.
function initEventTableFilters() {
    const $filter = $("#table-filter");
    const $table = $("#eventtable");
    if (!$table.length) return;

    const $rows = $table.find('tbody > tr[data-event-id]');
    const $regions = $filter.find('[data-primary]');
    const $releases = $filter.find('[data-toggle^="release-"]');
    const releases = ['new', 'rerun', 'permanent'];
    const hashPrefix = '#eventtable:';
    let state;
    let sorterReady = false;

    const $search = $('<input>', {
        type: 'search', id: 'table-search', placeholder: 'Filter event names…',
        title: 'Use double quotes for a phrase; exclude:word hides matches.',
        'aria-label': 'Filter event names in English or Japanese', autocomplete: 'off'
    });
    $filter.find('.controls-search').empty().append($search);

    function readState() {
        state = { primary: 'jp', releases: new Set(['new']), query: '' };
        if (!window.location.hash.startsWith(hashPrefix)) return;
        const params = new URLSearchParams(window.location.hash.slice(hashPrefix.length));
        if (params.get('primary') === 'gl') state.primary = 'gl';
        if (params.has('release')) {
            const values = params.get('release').split(',');
            if (values.includes('all')) state.releases.clear();
            else if (values.some(value => releases.includes(value))) {
                state.releases = new Set(values.filter(value => releases.includes(value)));
            }
        }
        state.query = params.get('q') || '';
    }

    function writeState() {
        const params = new URLSearchParams({
            primary: state.primary,
            release: releases.filter(value => state.releases.has(value)).join(',') || 'all'
        });
        if (state.query) params.set('q', state.query);
        // Keep typing from adding history entries or moving the page to an anchor.
        window.history.replaceState(null, '', hashPrefix + params.toString());
    }

    function jumpToScheduleSection() {
        if (!window.location.hash.startsWith(hashPrefix) || window.location.hash.length <= hashPrefix.length) return;
        const target = document.getElementById('Events_Schedule') || $filter[0];
        target.scrollIntoView({block: 'start'});
    }

    function sortByRegion() {
        if (!sorterReady) return;
        const sorter = $table.data('tablesorter');
        const sortList = state.primary === 'gl' ? [{3: 'desc'}, {1: 'asc'}] : initSortList.eventtable;
        // MediaWiki's sort() accepts its existing internal list. Set that list
        // too, so subsequent header clicks and sortEnd handlers see this order.
        sorter.config.sortList = sortList.map(sort => {
            const [column, direction] = Object.entries(sort)[0];
            return [Number(column), direction === 'desc' ? 1 : 0];
        });
        sorter.sort();
    }

    const names = new Map();
    $rows.each(function() { names.set(this, normalizeSearchText($(this).attr('data-search') || '')); });

    function update(resort, save) {
        $table.attr('data-primary-region', state.primary);
        $regions.each(function() {
            const active = $(this).attr('data-primary') === state.primary;
            $(this).toggleClass('active', active).toggleClass('inactive', !active)
                .attr('aria-checked', String(active)).attr('tabindex', active ? '0' : '-1');
        });
        $releases.each(function() {
            const active = state.releases.has($(this).attr('data-toggle').slice(8));
            $(this).toggleClass('active', active).toggleClass('inactive', !active)
                .attr('aria-pressed', String(active));
        });
        const terms = searchTerms(state.query);
        $rows.each(function() {
            const show = (!state.releases.size || state.releases.has($(this).attr('data-release'))) &&
                terms.every(term => names.get(this).includes(term.value) !== term.exclude);
            $(this).toggleClass('visible', show).toggleClass('hidden', !show);
        });
        $table.addClass('filter-ready');
        if (resort) sortByRegion();
        if (save) writeState();
    }

    $regions.attr('role', 'radio').on('click', function() {
        const primary = $(this).attr('data-primary');
        if (state.primary === primary) return;
        state.primary = primary;
        update(true, true);
    }).on('keydown', function(event) {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (keys.includes(event.key)) {
            event.preventDefault();
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? $regions.length - 1 :
                ($regions.index(this) + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + $regions.length) % $regions.length;
            $regions.eq(index).trigger('focus').trigger('click');
        } else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            $(this).trigger('click');
        }
    });
    $releases.attr({role: 'button', tabindex: '0'}).on('click', function() {
        const value = $(this).attr('data-toggle').slice(8);
        if (state.releases.has(value)) state.releases.delete(value);
        else state.releases.add(value);
        update(false, true);
    }).on('keydown', function(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            $(this).trigger('click');
        }
    });
    $search.on('input', function() {
        state.query = $(this).val();
        update(false, true);
    });
    $(window).on('hashchange.eventtable', function() {
        readState();
        $search.val(state.query);
        update(true, false);
        jumpToScheduleSection();
    });

    readState();
    $search.val(state.query);
    update(false, false);
    jumpToScheduleSection();
    mw.loader.using('jquery.tablesorter', function() {
        if (!$table.data('tablesorter')) $table.tablesorter();
        sorterReady = true;
        sortByRegion();
    });
}

function initTableFilters() {
    const filter = $("#table-filter");
    filterTarget = filter.data('target') !== undefined ? filter.data('target') : 'charactertable'; //global
    textSearchCellIndex = filter.data('search-cell-index') !== undefined ? filter.data('search-cell-index') : 1; //global

    quickFilter.groups = new Set();
    quickFilter.filters = {};

    let initialFilters = [];

    // Hydrate controls-search
    $(".controls-search").html(
        $('<input>', {
            type: 'text',
            id: 'table-search',
            placeholder: 'Filter...',
            title: 'Use double quotes for a phrase; exclude:word hides matches.',
        })
    );

    const controlButtons = filter.find('div.controls > span')
    controlButtons.attr('role', 'button')
    controlButtons.attr('aria-pressed', 'false')
    controlButtons.attr('tabindex', '0')
    
    
    $.each(controlButtons, function() {
        //var toggle = $(this).attr('data-toggle');
        const [group, value] = $(this).attr('data-toggle').split('-');
        //console.log('Quick filter button:', group, value);
        if (typeof(group) !== 'undefined') {
            quickFilter.groups.add(group);
            if (!quickFilter.filters.hasOwnProperty(group)) quickFilter.filters[group] = new Set();
            quickFilter.filters[group].add(value);
        } 

        if ($(this).hasClass('active') && window.location.hash.length === 0) {
            initialFilters.push({type: 'param', src: 'quickfilter', group, value});
        }
    });


    
    if (window.location.hash.length > 1) {
        const uri = normalizeSearchText(decodeURIComponent(window.location.hash.substring(1)));
        const segments = new Set(uri.match(/(?:[^_"]|"[^"]*(?:"|$))+/g) || []);
        for (let seg of segments) {
            if (seg.startsWith('exclude:')) {
                const filter = exclusionFilter(seg);
                if (filter) initialFilters.push(filter);
                continue;
            }
            if (seg.includes('"')) {
                initialFilters.push({type: 'text', src: 'textfield', value: seg});
                continue;
            }
            seg = seg.replace(/^-+|-+$/g, '');
            if (search_keywords[filterTarget].hasOwnProperty(seg)) {
                if (search_keywords[filterTarget][seg].hasOwnProperty('text')) {
                    initialFilters.push({type: 'text', src: 'textfield', value: search_keywords[filterTarget][seg].text});
                } else {
                    const {group, value} = search_keywords[filterTarget][seg];
                    const is_quickfilter = quickFilter.groups.has(group);
                    initialFilters.push({type: 'param', src: is_quickfilter?'quickfilter':'textfield', group, value});
                }
            } else if (seg.includes('-')) {
                const [group, value] = seg.split('-');
                const is_quickfilter = quickFilter.groups.has(group);
                initialFilters.push({type: 'param', src: is_quickfilter?'quickfilter':'textfield', group, value});
            } else {
                initialFilters.push({type: 'text', src:'textfield', value: seg});
            }
        }
    }
    tableFilters = initialFilters;


    // Event handlers
    controlButtons.addClass('inactive')
    controlButtons.on("click", function() { tableFilterToggle($(this)); });
    controlButtons.on("keydown", function(ev) {
        if (ev.code === "Space") {
            ev.preventDefault();
        }
        if (ev.code === "Enter") {
            ev.preventDefault();
            tableFilterToggle($(this));
        }
    });
    controlButtons.on("keyup", function(ev) {
        if (ev.code === "Space") {
            ev.preventDefault();
            tableFilterToggle($(this));
        }
    });

    $("#table-search").on("input", function() {tableTextFilter($(this).val()); });


    // Sync button states
    $("#table-filter div.controls > span").each(function() {
        const toggle = $(this).attr('data-toggle');
        const [group, value] = toggle.split('-');
        const active = tableFilters.some(f => f.type === 'param' && f.group === group && f.value === value);
        $(this).toggleClass('active', active).toggleClass('inactive', !active);
    });
}


function tableFilterToggle(toggleItem) {
    const toggle = $(toggleItem).attr('data-toggle');
    const [group, value] = toggle.split('-');

    // Remove any existing filter for this group/value
    tableFilters = tableFilters.filter(f => !((f.type === 'param' || f.type === 'keyword') && f.src === 'quickfilter' && f.group === group && f.value === value));
    if (toggleItem.hasClass("inactive")) {
        //console.log('Adding filter', {type: 'param', group, value});
        toggleItem.addClass('active').removeClass('inactive');
        $(toggleItem).attr('aria-pressed', 'true')
        tableFilters.push({type: 'param', src: 'quickfilter', group, value});
    } else {
        //console.log('Removing filter', {type: 'param', group, value});
        toggleItem.addClass('inactive').removeClass('active');
        $(toggleItem).attr('aria-pressed', 'false')
        // Already removed above
    }
    updateFiltersUI();
}


function tableTextFilter(searchStr) {
    const segments = searchSegments(searchStr, true);
    // Only update if segments changed
    if (segments.join('|') === lastSearchSegments.join('|')) {
        //console.log('Offramp: No change in search segments \n' + segments.join('|') + '\n' + lastSearchSegments.join('|'));
        return;
    }
    lastSearchSegments = segments;

    // Remove all previous textfield filters from array, readd new ones
    tableFilters = tableFilters.filter(f => f.src !== 'textfield');

    for (const seg of segments) {
        if (seg.startsWith('exclude:')) {
            const filter = exclusionFilter(seg);
            if (filter) tableFilters.push(filter);
        } else if (seg.includes('"')) {
            const value = seg.replace(/"/g, '');
            if (value.trim()) tableFilters.push({type: 'text', src: 'textfield', value: '"' + value + '"'});
        } else if (search_keywords[filterTarget].hasOwnProperty(seg)) {
            //console.log('Keyword match:', seg, search_keywords[filterTarget][seg]);
            if (search_keywords[filterTarget][seg].hasOwnProperty('text')) {
                //console.log('Adding text filter:', search_keywords[filterTarget][seg].text);
                tableFilters.push({type: 'text', src: 'textfield', value: search_keywords[filterTarget][seg].text});
            } else {
                //console.log('Adding param filter:', search_keywords[filterTarget][seg]);
                const {group, value} = search_keywords[filterTarget][seg];
                const is_quickfilter = quickFilter.groups.has(group);
                tableFilters.push({type: 'param', src: is_quickfilter?'quickfilter':'textfield', group, value});
            }
        } else if (seg.length > 2 && seg.includes(':')) {
            const [group, value] = seg.split(':');
            const is_quickfilter = quickFilter.groups.has(group);
            if (quickFilter.groups.has(group) && quickFilter.filters[group].has(value)) {
                //console.log('Adding quickfilter param filter:', {group, value});
                tableFilters.push({type: 'param', src: is_quickfilter?'quickfilter':'textfield', group, value});
            } else if (quickFilter.groups.has(group)) {
                // Do nothing, wait for valid quickfilter value for this group
            }
            else {
                //console.log('Adding textfield param filter:', {group, value});
                tableFilters.push({type: 'param', src: 'textfield', group, value});
            }
        } else if (seg.length > 2) {
            tableFilters.push({type: 'text', src: 'textfield', value: seg});
        }
    }

    
    // Sync button states
    $("#table-filter div.controls > span").each(function() {
        const toggle = $(this).attr('data-toggle');
        const [group, value] = toggle.split('-');
        const active = tableFilters.some(f => f.src === 'quickfilter' && f.group === group && f.value === value);
        $(this).toggleClass('active', active).toggleClass('inactive', !active);
    });

    updateFiltersUI();
}


function handleGiftTableFiltering($table) {
    const exclusions = tableFilters.filter(f => f.type === 'exclude').map(f => f.value);
    const tokens = tableFilters
        .filter(f => f.type === 'text' || (f.type === 'param' && f.src === 'textfield'))
        .map(f => {
            let v = normalizeSearchText(f.value).trim();
            if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
            return v;
        })
        .filter(t => t.length > 0);

    const paramGroups = {};
    for (const f of tableFilters) {
        if (f.type === 'param' && f.group) {
            if (!paramGroups[f.group]) paramGroups[f.group] = new Set();
            paramGroups[f.group].add(f.value);
        }
    }

    $table.find("tr").each(function () {
        if ($(this).closest('thead').length) return;

        const $row = $(this);
        const $imgs = $row.find('img');
        let rowMatches = false;

        $imgs.css('border', '');

        // Any excluded character removes the gift row, even when another
        // character on that row matches an included name.
        if ($imgs.toArray().some(img => exclusions.some(term => normalizeSearchText(img.alt).includes(term)))) {
            $row.css('display', 'none');
            return;
        }

        // Apply param filters (additive within each group)
        let passesParams = true;
        for (const group in paramGroups) {
            if (!matchConditional(this, group, paramGroups[group])) {
                passesParams = false;
                break;
            }
        }
        if (!passesParams) {
            $row.css('display', 'none');
            return;
        }

        if (tokens.length === 0) {
            $row.css('display', 'table-row');
            return;
        }

        // Whole-word match unlike other table types
        $imgs.each(function () {
            const alt = normalizeSearchText($(this).attr('alt') || '');
            for (const t of tokens) {
                if (!t) continue;
                const re = wholeWordSearchRegex(t);
                if (re.test(alt)) {
                    rowMatches = true;
                    $(this).css('border', '4px solid red');
                    break;
                }
            }
        });

        if (rowMatches) $row.css('display', 'table-row');
        else $row.css('display', 'none');
    });

    //window.location.hash = encodeURIComponent(filtersToURI(tableFilters));
}


// Update UI and filtering
function updateFiltersUI() {
    const $table = $("#"+filterTarget);

    // Update text field (only param/text filters) IF not focused
    const $search = $("#table-search");
    if (!$search.is(":focus")) {
        $search.val(filtersToTextField(tableFilters));
    }

    // Special handling for gifttable
    if (filterTarget === 'gifttable') {
        handleGiftTableFiltering($table);
        return;
    }

    // Apply filtering to table
    $table.find("tr").each(function () {
        if ($(this).closest('thead').length) return;
        let showRow = true;
        const textSearchCell = $(this).find("td").eq(textSearchCellIndex);
        const cellText = normalizeSearchText(textSearchCell.text());

        // Collect all filters by group
        const filteredGroups = {};
        for (const f of tableFilters) {
            if (f.type === 'param' || f.type === 'keyword') {
                if (!filteredGroups[f.group]) filteredGroups[f.group] = new Set();
                filteredGroups[f.group].add(f.value);
            }
        }
        
        // Check param filters (additive within group)
        for (const group in filteredGroups) {
            if (!matchConditional(this, group, filteredGroups[group])) {
                showRow = false;
                break;
            }
        }

        if (tableFilters.some(f => f.type === 'exclude' && cellText.includes(f.value))) showRow = false;

        // Check text filters
        if (showRow) {
            for (const f of tableFilters) {
                if (f.type === 'text') {
                    if (!textSearchCell.length) {
                        showRow = false;
                        break;
                    }
                    if (f.value.startsWith('"') && f.value.endsWith('"')) {
                        // Whole-word match for quoted text
                        const quoted = f.value.slice(1, -1).toLowerCase();
                        const regex = wholeWordSearchRegex(quoted);
                        if (!regex.test(cellText)) {
                            showRow = false;
                            break;
                        }
                    } else {
                        // Partial match for normal text
                        if (cellText.indexOf(f.value) === -1) {
                            showRow = false;
                            break;
                        }
                    }
                }

            }
        }

        $(this).toggleClass('visible', showRow).toggleClass('hidden', !showRow);
    });

    $table.trigger("sortEnd.tablesorter");

    // Update URL anchor
    window.location.hash = encodeURIComponent(filtersToURI(tableFilters));
}


function matchConditional(row, key, values) {
    // Support values as a Set, Array, or single string
    let valueList = Array.isArray(values) ? values : (values instanceof Set ? Array.from(values) : [values]);

    const rowVal = $(row).data(key);
    if (rowVal === undefined) return true;

    // Check each value in the list
    for (let val of valueList) {
        let op = null, cmpVal = val;
        if (typeof val === 'string') {
            if (val.startsWith('>=')) { op = '>='; cmpVal = val.slice(2); }
            else if (val.startsWith('<=')) { op = '<='; cmpVal = val.slice(2); }
            else if (val.startsWith('>')) { op = '>'; cmpVal = val.slice(1); }
            else if (val.startsWith('<')) { op = '<'; cmpVal = val.slice(1); }
        }

        // Numeric compare
        if (op && !isNaN(cmpVal) && !isNaN(rowVal)) {
            const nRow = Number(rowVal), nVal = Number(cmpVal);
            if (op === '>' && nRow > nVal) return true;
            if (op === '>=' && nRow >= nVal) return true;
            if (op === '<' && nRow < nVal) return true;
            if (op === '<=' && nRow <= nVal) return true;
            if (!op && nRow === nVal) return true;
        }
        // Affinity compare (urban, outdoors, indoors)
        else if (['urban','outdoors','indoors'].includes(key) && op) {
            if (affinityCompare(rowVal, op, cmpVal)) return true;
        }
        // Default: string match
        else if (String(rowVal).toLowerCase() === String(cmpVal).toLowerCase()) {
            return true;
        }
    }
    return false;
}


// Helper for affinity letter order
const affinityOrder = ['d','c','b','a','s','ss'];
function affinityCompare(rowVal, op, val) {
    const rowIdx = affinityOrder.indexOf(rowVal.toLowerCase());
    const valIdx = affinityOrder.indexOf(val.toLowerCase());
    if (rowIdx === -1 || valIdx === -1) return false;
    if (op === '>') return rowIdx > valIdx;
    if (op === '>=') return rowIdx >= valIdx;
    if (op === '<') return rowIdx < valIdx;z
    if (op === '<=') return rowIdx <= valIdx;
    return rowIdx === valIdx;
}

// Utility: convert filter array to URI string
function filtersToURI(filters) {
    return filters.map(f => {
        if (f.type === 'exclude') return exclusionText(f.value);
        if (f.type === 'keyword') return f.value;
        if (f.type === 'param') return `${f.group}-${f.value}`;
        if (f.type === 'text') return f.value;
    }).join('_');
}

// Utility: convert filter array to text field string (only param/text filters)
function filtersToTextField(filters) {
    //console.log(filters);
    return filters.filter(f => f.src === 'textfield').map(f => {
        if (f.type === 'exclude') return exclusionText(f.value);
        if (f.type === 'keyword') return f.value;
        if (f.type === 'param') return `${f.group}:${f.value}`;
        if (f.type === 'text') return f.value;
    }).join(' ');
}


///
/// Release cutoff line
///
$(document).ready(function () {
    if ($("#table-filter").data('target') === 'eventtable') return;
    const $table = $("#"+filterTarget);

    //TODO
    // console.log('Setting initial sortlist ' + initSortList[filterTarget]);
    // mw.loader.using("jquery.tablesorter", function() {
    //         $("table.sortable").tablesorter({sortList: [{2: "desc"}, {1: "asc"}]});
    //     });

    $table.on("sortEnd.tablesorter", function () {
            const config = $table.data("tablesorter").config;
            const sortList = config.sortList;

            if (sortList.length >= 1 && sortList[0][0] === Number(Object.keys(initSortList[filterTarget][0])[0]) && sortList[0][1] < 2) {
                addCutoffClass($table, sortList[0][1]);
            } else {
                $table.find("tr.global-line").removeClass("global-line line-top line-bottom");
            }
        });

    // Trigger initial calculation
    $table.trigger("sortEnd.tablesorter");


});

function addCutoffClass($table, sortDirection) {
    const isAscending = sortDirection === 0;

    const now = new Date();
    const jstNow = new Date(
        now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000
    );
    const cutoffDate = new Date(
        jstNow.getFullYear(),
        jstNow.getMonth(),
        jstNow.getDate(),
        11, 0, 0
    ).getTime();

    const $rows = $table.find("tbody tr.visible");
    let cutoffIndex = -1;

    $rows.each(function (index) {
        const $row = $(this);
        const dateAttr = $row.attr("data-releasedate-gl");

        if (!dateAttr) {
            // Missing date is treated as future (ASC) or skip (DESC)
            if (isAscending) cutoffIndex = index;
            return cutoffIndex >= 0 ? false : true;
        }

        const releaseTime = new Date(dateAttr.replace(/\//g, "-")).getTime();
        if (isNaN(releaseTime)) {
            if (isAscending) cutoffIndex = index;
            return cutoffIndex >= 0 ? false : true;
        }

        if (isAscending) {
            if (releaseTime > cutoffDate) {
                cutoffIndex = index;
                return false;
            }
        } else {
            if (releaseTime <= cutoffDate) {
                cutoffIndex = index - 1;
                return false;
            }
        }
    });

    //console.log('Cutoff index is '+cutoffIndex);
    $table.find("tr.global-line").removeClass("global-line line-top line-bottom");
    if (cutoffIndex >= 0 && cutoffIndex < $rows.length) {
        $rows.eq(cutoffIndex)
            .addClass("global-line")
            .addClass(isAscending ? "line-top" : "line-bottom");
    }
}

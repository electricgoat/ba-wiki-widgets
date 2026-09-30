-- Module:EventTable. BlueBucket supplies canonical JSON; this module only combines regions by Id and renders them. 
local p = {}

-- Same logic as in Template:EventCard/IdTypes.
local function releaseType(id)
    if id < 3000 then return 'new' end
    if id > 10000 and id < 11000 then return 'rerun' end
    if id > 900000 and id < 901000 then return 'permanent' end
    return 'other'
end

local function newestFirst(a, b)
    if a.StartDate ~= b.StartDate then return a.StartDate > b.StartDate end
    if (a.EndDate or '') ~= (b.EndDate or '') then return (a.EndDate or '') > (b.EndDate or '') end
    return (a.PageName or '') < (b.PageName or '')
end

local function latest(event, region)
    return event[region][1] and event[region][1].StartDate or ''
end

local function appendUnique(values, seen, value)
    if value and value ~= '' and not seen[value] then
        values[#values + 1] = value
        seen[value] = true
    end
end

local function link(page, label)
    return '[[' .. page .. '|' .. label .. ']]'
end

local function renderNames(cell, event, region)
    if region == 'GL' and #event.GL == 0 then return end
    local container = cell:tag('div'):addClass('event-name event-region-' .. region:lower())
    container:tag('span'):addClass('event-region-label'):wikitext(region .. ' ')
    local titles = container:tag('div'):addClass('event-titles')
    if #event[region] == 0 then
        titles:tag('span'):addClass('event-unannounced'):wikitext(region == 'GL' and 'Not announced' or 'Unknown')
        return
    end
    local seen = {}
    for _, row in ipairs(event[region]) do
        local name = row.NameEN or row.PageName
        if not seen[name] then
            titles:tag('span'):addClass('event-title'):wikitext(link(row.PageName, name))
            seen[name] = true
        end
    end
    if region == 'JP' then
        local names, used = {}, {}
        for _, row in ipairs(event.JP) do appendUnique(names, used, row.NameJP) end
        if #names > 0 then
            titles:tag('div'):addClass('event-name-original'):attr('lang', 'ja'):wikitext(table.concat(names, ' / '))
        end
    end
end

local function renderPeriods(frame, cell, event, region)
    cell:addClass('event-period event-region-' .. region:lower())
    if #event[region] == 0 then
        cell:tag('span'):addClass('event-unannounced'):wikitext(region == 'GL' and 'TBD' or 'Unknown')
        return
    end
    for _, row in ipairs(event[region]) do
        local period = cell:tag('div'):addClass('event-period-entry')
        if #event[region] > 1 and row.Notes and row.Notes ~= '' then
            period:tag('div'):addClass('event-period-note'):wikitext(row.Notes)
        end
        if not row.EndDate or row.EndDate == '' or row.EndDate:sub(1, 4) == '2099' then
            period:wikitext('From ' .. frame:expandTemplate{title = 'DateTime', args = {
                row.StartDate, format = 'Y/m/d', relative = 'no'
            }})
        else
            period:wikitext(frame:expandTemplate{title = 'DateRange', args = {
                row.StartDate, row.EndDate, format = 'Y/m/d', relative = 'no'
            }})
        end
    end
end

local function findPromo(event)
    if not event then return nil end
    for _, region in ipairs({'JP', 'GL'}) do
        for _, row in ipairs(event[region]) do
            if row.Promo and row.Promo ~= '' then return row.Promo end
        end
    end
end

function p.render(frame)
    local rows = mw.text.jsonDecode(frame.args[1] or '[]')
    local byId, events = {}, {}
    for _, row in ipairs(rows) do
        local id = tonumber(row.Id)
        if id and (row.Server == 'JP' or row.Server == 'GL') then
            local event = byId[id]
            if not event then
                event = {id = id, release = releaseType(id), JP = {}, GL = {}}
                byId[id] = event
            end
            event[row.Server][#event[row.Server] + 1] = row
        end
    end
    for _, event in pairs(byId) do
        table.sort(event.JP, newestFirst)
        table.sort(event.GL, newestFirst)
        if event.id == 701 then
            -- All Special Operation: Decagrammaton parts share Id 701.
            local parts = {}
            for _, region in ipairs({'JP', 'GL'}) do
                for _, row in ipairs(event[region]) do
                    local part = tonumber((row.Notes or ''):lower():match('part%s+(%d+)'))
                    local key = part or ''
                    if not parts[key] then
                        parts[key] = {id = event.id, part = part, release = event.release, JP = {}, GL = {}}
                        events[#events + 1] = parts[key]
                    end
                    local records = parts[key][region]
                    records[#records + 1] = row
                end
            end
        else
            events[#events + 1] = event
        end
    end
    table.sort(events, function(a, b)
        local ad, bd = latest(a, 'JP'), latest(b, 'JP')
        if ad ~= bd then return ad > bd end
        if a.id ~= b.id then return a.id < b.id end
        return (a.part or 0) < (b.part or 0)
    end)

    local html = mw.html.create('table'):attr('id', 'eventtable')
        :addClass('wikitable sortable eventtable limitwidth-1280'):attr('data-primary-region', 'jp')
    -- Wikitext's HTML sanitizer does not accept explicit thead/tbody tags.
    -- The browser supplies tbody; MediaWiki tablesorter moves the header row.
    local header = html:tag('tr')
    header:tag('th'):addClass('unsortable event-promo'):attr('scope', 'col'):wikitext('Preview')
    header:tag('th'):attr('scope', 'col'):wikitext('Event')
    header:tag('th'):attr('scope', 'col'):attr('data-sort-type', 'text'):wikitext('JP Period')
    header:tag('th'):attr('scope', 'col'):attr('data-sort-type', 'text'):wikitext('GL Period')
    header:tag('th'):attr('scope', 'col'):wikitext('Notes')
    local body = html
    for _, event in ipairs(events) do
        local names, seen = {}, {}
        for _, region in ipairs({'JP', 'GL'}) do
            for _, row in ipairs(event[region]) do
                appendUnique(names, seen, row.NameEN)
                appendUnique(names, seen, row.NameJP)
            end
        end
        local jp, gl = latest(event, 'JP'), latest(event, 'GL')
        local row = body:tag('tr'):attr('data-event-id', event.id):attr('data-release', event.release)
            :attr('data-search', table.concat(names, ' ')):attr('data-releasedate-jp', jp):attr('data-releasedate-gl', gl)
        if event.part then row:attr('data-event-part', event.part) end
        if event.release == 'rerun' or event.release == 'permanent' then row:addClass('hidden') end
        if gl == '' then row:addClass('event-upcoming-gl') end
        local first = event.JP[1] or event.GL[1]
        local imageCell = row:tag('td'):addClass('event-promo')
        local preview = imageCell:tag('div'):addClass('event-promo-image')
        local originalId = event.release == 'rerun' and event.id - 10000 or event.release == 'permanent' and event.id - 900000
        local promo = findPromo(event) or findPromo(byId[event.id]) or (originalId and findPromo(byId[originalId]))
        if promo then
            preview:wikitext('[[' .. promo .. '|160px|link=' .. first.PageName .. '|alt=' .. (first.NameEN or first.PageName) .. ']]')
        else
            preview:addClass('event-promo-missing'):tag('span'):addClass('event-no-preview'):wikitext('—')
        end
        if event.release == 'rerun' or event.release == 'permanent' then
            preview:tag('span'):addClass('event-tag event-tag-' .. event.release)
                :wikitext(event.release == 'rerun' and 'Rerun' or 'Permanent')
        end
        local nameCell = row:tag('td'):addClass('event-names'):attr('data-sort-value', first.NameEN or first.PageName)
        renderNames(nameCell, event, 'JP')
        renderNames(nameCell, event, 'GL')
        renderPeriods(frame, row:tag('td'):attr('data-sort-value', jp), event, 'JP')
        -- Unannounced GL entries sort as an upcoming block in JP order. The prefix used as a sort key
        renderPeriods(frame, row:tag('td'):attr('data-sort-value', gl ~= '' and '0:' .. gl or '1:' .. jp), event, 'GL')
        local notes = row:tag('td'):addClass('event-notes')
        local regionalNotes = {}
        for _, region in ipairs({'JP', 'GL'}) do
            -- Repeated periods carry their own notes beside each range.
            if #event[region] == 1 then
                local note = mw.text.trim(event[region][1].Notes or '')
                if note ~= '' and note:lower() ~= event.release then
                    regionalNotes[region] = note
                end
            end
        end
        if regionalNotes.JP and (gl == '' or regionalNotes.JP == regionalNotes.GL) then
            notes:wikitext(regionalNotes.JP)
        else
            for _, region in ipairs({'JP', 'GL'}) do
                if regionalNotes[region] then
                    notes:tag('div'):addClass('event-region-' .. region:lower()):wikitext(region .. ': ' .. regionalNotes[region])
                end
            end
        end
    end
    return tostring(html)
end

return p

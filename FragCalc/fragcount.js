/* Eleph shop calculator (FragCalc) - start */
const fragcalc_price_steps = [20, 20, 20, 20, 20];	// Elephs sold at each price before it rises
const fragcalc_prices = [1, 2, 3, 4, 5];			// Eligma per Eleph
const fragcalc_purchase_limit = 900;				// Elephs of a student the shop sells in all; 1★ to UE60 takes 830

const fragcalc_rank_up = [
	{'elephs': 30,	'credits': 10000},
	{'elephs': 80,	'credits': 40000},
	{'elephs': 100,	'credits': 200000},
	{'elephs': 120,	'credits': 1000000},
	{'elephs': 0,	'credits': 0},
	{'elephs': 120,	'credits': 1000000},
	{'elephs': 180,	'credits': 1500000},
	{'elephs': 200,	'credits': 2000000},
];
const fragcalc_star_ranks = 5;	// ranks shown with character stars; the ones after them with weapon stars
const fragcalc_max_rank = fragcalc_rank_up.length + 1;
const fragcalc_max_owned = 9999;
const fragcalc_defaults = {'current': 3, 'target': 6, 'owned': 100, 'price': 1, 'can_buy': 20};

const fragcalc_titles = {
	'owned': 'Elephs of this student you have now',
	'price': 'What this student\'s Eleph costs in the Eligma shop now. It rises by 1 after every '+fragcalc_price_steps[0]+' Elephs bought, up to '+fragcalc_prices[fragcalc_prices.length-1]+'.',
	'can_buy': 'How many more Elephs the shop sells at this price (the MAX amount of the purchase window)',
	'can_buy_last': 'No limit: '+fragcalc_prices[fragcalc_prices.length-1]+' is the final price. The shop sells up to '+fragcalc_purchase_limit+' Elephs of a student in total.',
};

var fragCalc = {};
var fragCalcCounter = 0;


$( document ).ready(function() {
	initFragCalc();
});


function initFragCalc(){
	$(".ba-template-fragcalc").each(function(){
		var table = $(this);
		var id = 'fragcalc-'+(++fragCalcCounter);
		table.attr('id', id);

		var state = fragCalc[id] = $.extend({}, fragcalc_defaults);
		var rarity = parseInt(table.attr('data-rarity'));
		if (rarity >= 1 && rarity <= fragcalc_star_ranks) state.current = rarity;
		if (state.target < state.current) state.target = state.current;

		// The template renders the icons (the student's Eleph among them) into the hidden controls row, and ItemCards with a
		// quantity: the quantity's pill, the icon, and the item's name unless the card leaves it out
		var icon = function(name, css_class){
			return fragCalcImage(table.find(".fragcalc-icons .icon-"+name).find("img, .lazy-image-placeholder").first()).addClass('mw-no-invert '+css_class);
		};
		var cards = {};
		$.each(['price', 'eligma', 'credits'], function(index, name){
			cards[name] = table.find(".fragcalc-icons .card-"+name).contents().not('style, link, noscript').clone();
			cards[name].find('noscript').remove();
			cards[name].find("img, .lazy-image-placeholder").each(function(){ $(this).replaceWith(fragCalcImage($(this))); });
		});
		table.data('fragcalc-cards', cards);
		// A {{Rank}} badge for each rank, whose title names it
		var ranks = table.find(".fragcalc-icons .fragcalc-ranks .ba-template-rank").clone();
		table.data('fragcalc-ranks', ranks);

		// Controls: the rank selectors, with owned Elephs and the shop's price next to them
		var owned = $('<label class="fragcalc-field fragcalc-owned"></label>').attr('title', fragcalc_titles.owned)
			.append('<span class="fragcalc-label">Owned Elephs</span>', icon('eleph', 'fragcalc-eleph'),
				$('<input type="number" step="1" min="0">').attr('max', fragcalc_max_owned).val(state.owned));
		var shop = $('<span class="fragcalc-field fragcalc-shop"></span>').append(
			$('<label class="fragcalc-price"></label>').attr('title', fragcalc_titles.price)
				.append('<span class="fragcalc-label">Shop price</span>', icon('eligma', 'fragcalc-eligma'), fragCalcPriceSelect(state.price)),
			$('<label class="fragcalc-can-buy"></label>').attr('title', fragcalc_titles.can_buy)
				.append('<span class="fragcalc-label">can buy</span>', $('<input type="number" step="1" min="1">').val(state.can_buy)));

		var star = icon('star', ''), weapon_star = icon('weapon-star', '');
		$('<div class="fragcalc-panel"></div>').append(
			$('<div class="fragcalc-line"></div>').append(fragCalcRankSelector('current', 'Current', star, weapon_star, ranks), owned),
			$('<div class="fragcalc-line"></div>').append(fragCalcRankSelector('target', 'Target', star, weapon_star, ranks), shop)
		).appendTo(table.find(".fragcalc-controls > td"));

		// Output: a row per price, then the totals and a summary of the rank-up, in place of the template's example rows
		var header = table.find("tr.fragcalc-header");
		header.nextAll().remove();
		var rows = [];
		$.each(fragcalc_prices, function(index, price){
			var price_cell = $('<td></td>').append(fragCalcCard(cards.price, price));
			rows.push($('<tr class="fragcalc-tier"></tr>').attr('data-price', price).append(price_cell, '<td></td><td></td>'));
		});
		rows.push('<tr class="fragcalc-total"><th>Total</th><th></th><th></th></tr>', '<tr class="fragcalc-summary"><td colspan="3"></td></tr>');
		header.after(rows);

		table.find(".fragcalc-rank .control")
			.on("click", function(){ fragCalcSetRank(table, $(this).closest(".fragcalc-rank").attr('data-rank-type'), parseInt($(this).attr('data-rank'))); })
			.on("keydown", function(event){ fragCalcStarKey(table, $(this), event); });
		table.find(".fragcalc-controls input, .fragcalc-controls select")
			.on("input", function(){ fragCalcUpdate(table, false); })
			.on("change", function(){ fragCalcUpdate(table, true); });

		table.find(".fragcalc-controls").css("display", "");
		fragCalcUpdate(table, true);
	});
}


function fragCalcRankSelector(rank_type, label, star, weapon_star, ranks){
	var stars = $('<span class="fragcalc-stars" role="radiogroup"></span>').attr('aria-label', label+' rank');
	for (var rank = 1; rank <= fragcalc_max_rank; rank++) {
		var name = fragCalcRankTitle(ranks, rank);
		// A rank-up that costs nothing comes with the rank before it: the unique weapon's first rank
		var free = (rank > 1 && fragcalc_rank_up[rank-2].elephs == 0 && fragcalc_rank_up[rank-2].credits == 0);
		$('<span class="control" role="radio"></span>')
			.attr({'data-rank': rank, 'aria-label': name, 'title': free ? name+' (comes with '+fragCalcRankTitle(ranks, rank - 1)+')' : name})
			.toggleClass('weapon', rank > fragcalc_star_ranks)
			.append((rank > fragcalc_star_ranks ? weapon_star : star).clone())
			.appendTo(stars);
	}
	return $('<div class="fragcalc-rank"></div>').attr('data-rank-type', rank_type)
		.append($('<span class="fragcalc-label"></span>').text(label), stars);
}


function fragCalcPriceSelect(selected){
	var select = $('<select></select>');
	$.each(fragcalc_prices, function(index, price){
		$('<option></option>').val(price).text(price).prop('selected', price == selected).appendTo(select);
	});
	return select;
}


/* A copy of one of the template's images, to show. MobileFrontend's mobile view serves images as placeholders it loads when
   they come into view, which those of the hidden row never do: a placeholder's copy is the image it stands for. */
function fragCalcImage(image){
	if (!image.hasClass('lazy-image-placeholder')) return image.clone().removeAttr('loading');
	return $('<img decoding="async">').attr({
		'src': image.attr('data-mw-src'),
		'srcset': image.attr('data-mw-srcset') || null,
		'alt': image.attr('data-alt') || '',
		'width': image.attr('data-width'),
		'height': image.attr('data-height'),
		'class': image.attr('data-class') || null,
	});
}


// A rank's {{Rank}} badge, as the template renders it, and its name
function fragCalcBadge(ranks, rank){
	return ranks.eq(rank - 1).clone();
}

function fragCalcRankTitle(ranks, rank){
	return ranks.eq(rank - 1).attr('title') || 'Rank '+rank;
}


// A copy of one of the template's ItemCards for another quantity, with the whole number in a tooltip where it's shortened
function fragCalcCard(card, value){
	var quantity = fragCalcQuantity(value);
	return card.clone().filter('.item-quantity').text(quantity).attr('title', (quantity == String(value)) ? null : value.toLocaleString('en')).end();
}


// Quantities as ItemCard shows them: whole below 10000, then rounded to thousands (k), and from a million to tenths of millions (M)
function fragCalcQuantity(value){
	if (value < 10000) return String(value);
	if (value < 1000000) return Math.round(value / 1000)+'k';
	return Math.round(value / 100000) / 10+'M';
}


// The target stays at or above the current rank: a higher current rank takes the target along, a lower target stops at it
function fragCalcSetRank(table, rank_type, rank){
	var state = fragCalc[table.attr('id')];
	state[rank_type] = rank;
	if (state.target < state.current) state.target = state.current;
	fragCalcUpdate(table, false);
}


// Keyboard use of a rank selector, as of a radio group: arrows, Home and End move the selection, Enter and Space pick the star
function fragCalcStarKey(table, star, event){
	var rank = parseInt(star.attr('data-rank'));
	var moves = {'ArrowRight': rank + 1, 'ArrowUp': rank + 1, 'ArrowLeft': rank - 1, 'ArrowDown': rank - 1, 'Home': 1, 'End': fragcalc_max_rank, 'Enter': rank, ' ': rank};
	if (!(event.key in moves)) return;

	event.preventDefault();
	var selector = star.closest(".fragcalc-rank");
	fragCalcSetRank(table, selector.attr('data-rank-type'), Math.min(fragcalc_max_rank, Math.max(1, moves[event.key])));
	selector.find('.control[tabindex="0"]').trigger('focus');
}


/* Reads the inputs into the state and recalculates. Committing (on change) writes the checked values back into the inputs;
   while typing (on input), values that aren't numbers yet leave the previous ones in effect. */
function fragCalcUpdate(table, commit){
	var state = fragCalc[table.attr('id')];
	var controls = table.find(".fragcalc-controls");

	state.owned = fragCalcNumber(controls.find(".fragcalc-owned input"), 0, fragcalc_max_owned, state.owned, commit);
	state.price = fragCalcNumber(controls.find(".fragcalc-price select"), fragcalc_prices[0], fragcalc_prices[fragcalc_prices.length-1], state.price, commit);

	// How many are left only matters before the last price, which never rises
	var step = fragcalc_prices.indexOf(state.price);
	var last_price = (step == fragcalc_prices.length - 1);
	var can_buy = controls.find(".fragcalc-can-buy input").attr('max', fragcalc_price_steps[step]).prop('disabled', last_price).attr('placeholder', last_price ? '∞' : '');
	can_buy.closest("label").attr('title', last_price ? fragcalc_titles.can_buy_last : fragcalc_titles.can_buy);
	if (last_price) can_buy.val('');
	else {
		if (commit && can_buy.val() === '') can_buy.val(state.can_buy);
		state.can_buy = fragCalcNumber(can_buy, 1, fragcalc_price_steps[step], state.can_buy, commit);
	}

	fragCalcRender(table, state, fragCalcPlan(state));
}


function fragCalcNumber(input, min, max, fallback, commit){
	var value = parseInt(input.val());
	if (isNaN(value)) value = fallback;
	value = Math.min(max, Math.max(min, value));
	if (commit && String(value) !== input.val()) input.val(value);
	return value;
}


/* The Elephs a rank-up needs, and what buying the missing ones costs: the Elephs bought at each price, starting from the
   shop's current price and how many are left at it */
function fragCalcPlan(state){
	var plan = {'needed': 0, 'credits': 0, 'bought': 0, 'eligma': 0, 'tiers': []};

	for (var rank = state.current; rank < state.target; rank++) {
		plan.needed += fragcalc_rank_up[rank-1].elephs;
		plan.credits += fragcalc_rank_up[rank-1].credits;
	}
	plan.spare = Math.max(0, state.owned - plan.needed);
	var to_buy = Math.max(0, plan.needed - state.owned);

	// Elephs bought so far, as far as the price tells: at the last price, how many were bought at it doesn't matter
	var step = fragcalc_prices.indexOf(state.price);
	var sold = 0;
	for (var index = 0; index < step; index++) sold += fragcalc_price_steps[index];
	if (step < fragcalc_prices.length - 1) sold += fragcalc_price_steps[step] - state.can_buy;

	var step_end = 0;
	$.each(fragcalc_prices, function(index, price){
		step_end += fragcalc_price_steps[index];
		var count = (index == fragcalc_prices.length - 1) ? to_buy : Math.min(to_buy, Math.max(0, step_end - sold));
		plan.tiers.push({'price': price, 'elephs': count, 'eligma': count * price});
		plan.bought += count;
		plan.eligma += count * price;
		sold += count;
		to_buy -= count;
	});

	plan.after = fragCalcShopState(sold);
	return plan;
}


// The shop's price after a number of Elephs bought, and how many are left at it (null at the last price)
function fragCalcShopState(sold){
	var step_end = 0;
	for (var index = 0; index < fragcalc_prices.length - 1; index++) {
		step_end += fragcalc_price_steps[index];
		if (sold < step_end) return {'price': fragcalc_prices[index], 'can_buy': step_end - sold};
	}
	return {'price': fragcalc_prices[fragcalc_prices.length-1], 'can_buy': null};
}


function fragCalcRender(table, state, plan){
	var cards = table.data('fragcalc-cards');
	var ranks = table.data('fragcalc-ranks');
	var number = function(value){ return value.toLocaleString('en'); };

	table.find(".fragcalc-rank").each(function(){
		var rank = state[$(this).attr('data-rank-type')];
		$(this).find(".control").each(function(){
			var star = parseInt($(this).attr('data-rank'));
			$(this).toggleClass('active', star <= rank).toggleClass('inactive', star > rank)
				.attr({'aria-checked': String(star == rank), 'tabindex': (star == rank) ? 0 : -1});
		});
	});

	$.each(plan.tiers, function(index, tier){
		var cells = table.find('tr.fragcalc-tier[data-price="'+tier.price+'"]').toggleClass('unused', tier.elephs == 0).children();
		cells.eq(1).text(tier.elephs ? number(tier.elephs) : '–');
		cells.eq(2).text(tier.elephs ? number(tier.eligma) : '–');
	});

	var totals = table.find("tr.fragcalc-total").children();
	totals.eq(1).text(number(plan.bought));
	totals.eq(2).text(number(plan.eligma));

	var summary = [];
	if (state.target <= state.current) summary.push('Pick a target rank above the current one.');
	else {
		var elephs = (plan.needed == 0) ? 'no Elephs'
			: number(plan.needed)+' Elephs' + (plan.bought ? ': '+number(state.owned)+' owned, '+number(plan.bought)+' to buy' : ', all owned');
		summary.push([fragCalcBadge(ranks, state.current), ' → ', fragCalcBadge(ranks, state.target),
			' needs '+elephs + (plan.spare ? ' ('+number(plan.spare)+' to spare)' : '')]);
		if (plan.credits) summary.push($('<span class="fragcalc-credits"></span>').append(fragCalcCard(cards.credits, plan.credits)));
	}
	if (plan.bought) summary.push($('<span class="fragcalc-after"></span>').append('Shop price afterwards: ', fragCalcCard(cards.eligma, plan.after.price),
		(plan.after.can_buy === null) ? '' : ', can buy '+plan.after.can_buy));

	var cell = table.find("tr.fragcalc-summary > td").empty();
	$.each(summary, function(index, part){
		if (index) cell.append('<span class="fragcalc-separator"> · </span>');
		cell.append(part);
	});
}
/* Eleph shop calculator (FragCalc) - end */

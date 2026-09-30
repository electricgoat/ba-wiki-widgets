/* Character affection table - start */
const affection_start = 50;
const affection_cap = 50;

var affection_data = {};
var affectionTableCounter = 0;


function initAffectionTable(){
	$(".character-affectiontable").each(function(){
		var id = ++affectionTableCounter;
        if ($(this).parent().attr('data-character-id') !== undefined) id = $(this).parent().attr('data-character-id');
		$(this).attr('id', 'affectionTable-'+id);
		$(this).attr('data-character-id', id);

		var data = {};

		$(this).find(".affection-data > div").each(function(){
			var level = $(this).attr('data-level');
			data[level] = {};
			var bonus = $(this).attr('data-stats').split(' ');

			$.each( bonus, function( index ) {
				bonus[index] = bonus[index].split('+');
				data[level][bonus[index][0]] =  parseInt(bonus[index][1]);
			});
		});
		affection_data[id] = data;

		$(this).find(".affection-level").html('<input type="number" value="'+affection_start+'" step="1" min="1" max="'+affection_cap+'" />');
		$(this).find(".affection-level input").on("input change", function(event){var table = $(this).closest("table"); affectionChange(table, inputNumber($(this), 1, affection_cap, affection_data[table.attr('data-character-id')].level, event.type == 'change'));});
		$(this).find(".affection-data").children("div").on("click", function(){$(this).closest("table").find(".affection-level input").val($(this).attr('data-level')); affectionChange($(this).closest("table"),$(this).attr('data-level'));});

		affectionChange($(this), affection_start, false);
	});
}


function affectionChange (affectionTable, level, call_statCalc){
	call_statCalc = (typeof call_statCalc !== 'undefined') ? call_statCalc : true;

	var html_out = '';

	level = (typeof level !== 'undefined' && !isNaN(level)) ? level : 1 ;

	if (level < 1) 	 			{ affectionTable.find(".affection-level input").val(1);	level = 1; }
	if (level > affection_cap) 	{ affectionTable.find(".affection-level input").val(affection_cap); level = affection_cap; }

	var effective_bonus = affectionGetBonus(affectionTable.attr('data-character-id'), level);

	$.each( effective_bonus, function(stat_name, stat_value){
		html_out += '<b>' + stat_name + '</b>' + ' +' + stat_value + ', ';
	});

	affection_data[affectionTable.attr('data-character-id')].current = effective_bonus;
	affection_data[affectionTable.attr('data-character-id')].level = level;

	affectionTable.find(".affection-total").html(html_out.substring(0,html_out.length-2));


	//update StatCalc if present
	if (call_statCalc && typeof statCalc !== 'undefined') {

		var type = 'main';
		if (affectionTable.attr('data-character-id') > 1) type = 'alt';

		if (type == 'main') {
			Object.keys(statCalc).forEach(function (id){
				statCalc[id].affection['main_level'] = level;
			});
		}
		else {
			Object.keys(statCalc).forEach(function (id){
				statCalc[id].affection.alt_level[statCalc[id].affection.alt_id.indexOf(affectionTable.attr('data-character-id'))] = level;
			});
		}

		affectionRecalc();
		statTablesRecalc();
	}
}


function affectionGetBonus (id, level) {
	var effective_bonus = {};

	for (var index = 2; index <= level; index++) {
		$.each( affection_data[id][index], function(stat_name, stat_value){
			if (typeof effective_bonus[stat_name] == 'undefined') effective_bonus[stat_name] = 0;
			effective_bonus[stat_name] += stat_value;
		});
	}

	return effective_bonus;
}


// The stat tables' affection: each takes its own table (main) and its other versions' (alt)
function initAffectionLink() {
	Object.keys(statCalc).forEach(function (id){
		affectionMainLink(id);
		affectionAltLink(id);
	});

	affectionRecalc();
	statTablesRecalc();
}


function affectionMainLink(id) {
	if (typeof affection_data[id] !== 'undefined') {
		statCalc[id].affection.main_id.push(id);
	}
	else if (typeof affection_data[1] !== 'undefined') {
		statCalc[id].affection.main_id.push(1);
	}
	else if (typeof statCalc[id].character_name !== 'undefined') {
		// A form without a table of its own has its version's: Hoshino (Battle) Attacker, Hoshino (Battle)'s
		var version = affectionFormOf(statCalc[id].character_name);
		Object.keys(statCalc).forEach(function (element){
			if (statCalc[element].character_name === version && typeof affection_data[element] !== 'undefined') statCalc[id].affection.main_id.push(element);
		});
	}

	statCalc[id].affection.main_level = affection_start;
}


function affectionAltLink(id) {
	if (typeof statCalc[id].character_name !== 'undefined') {
		var name_normalized = affectionBaseName(statCalc[id].character_name);

		Object.keys(statCalc).forEach(function (element){
			if (id !== element && statCalc[id].affection.main_id.indexOf(element) < 0 && name_normalized == affectionBaseName(statCalc[element].character_name)) {
				statCalc[id].affection.alt_id.push(element);
				statCalc[id].affection.alt_level.push(affection_start);
			}
		});
	}

	if (typeof statCalc[id].character_name == 'undefined' && typeof affection_data[2] !== 'undefined') {
		Object.keys(affection_data).forEach(function (element){
			if (element > 1) {
				statCalc[id].affection.alt_id.push(element);
				statCalc[id].affection.alt_level.push(affection_start);
			}
		});
	}
}


// The name a character's versions share: Shiroko for Shiroko (Riding), Hoshino for Hoshino (Battle) Attacker
function affectionBaseName(name) {
	return String(name).split(' (')[0];
}

// The version a form belongs to: Hoshino (Battle) for Hoshino (Battle) Attacker; null when the name isn't a form's
function affectionFormOf(name) {
	var match = /^(.*\)) [^()]+$/.exec(name);
	return match ? match[1] : null;
}


function affectionRecalc(){

	Object.keys(statCalc).forEach(function (id){
		stats_list.forEach(function (element){
			statCalc[id].affection.bonus[element] = 0;
			statCalc[id].affection.bonus[element+'%'] = 0;
		});

		for (var affectionTable of statCalc[id].affection.main_id) if (typeof affection_data[affectionTable] !== 'undefined') {
			var bonus = affectionGetBonus(affectionTable, statCalc[id].affection.main_level);

			Object.keys(bonus).forEach(function (statName){
				statCalc[id].affection.bonus[statName.toLowerCase()] += bonus[statName];
			});
		}

		for (var affectionTable of statCalc[id].affection.alt_id) if (typeof affection_data[affectionTable] !== 'undefined') {
			var bonus = affectionGetBonus(affectionTable, statCalc[id].affection.alt_level[statCalc[id].affection.alt_id.indexOf(String(affectionTable))]);
			Object.keys(bonus).forEach(function (statName){
				statCalc[id].affection.bonus[statName.toLowerCase()] += bonus[statName];
			});
		}

	});

}
/* Character affection table - end */

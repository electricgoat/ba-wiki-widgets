/* Character stat chart - start */
// StatChart controls
const statchart_equipment_preset = {
    1: {"type": "hat", "image": false, "title": "Slot 1 equipment"},
    2: {"type": "bag", "image": false, "title": "Slot 2 equipment"},
	3: {"type": "watch", "image": false, "title": "Slot 3 equipment"},
    4: {"type": "gear", "image": "https://static.miraheze.org/bluearchivewiki/d/db/Gear_Icon_10000.png", "title": "Unique gear"},
}

var percentile_brackets = [];


function initStatChart(){

	if ($('#statchart-controls').length > 0) {
		// Initialize controls
		var controlsTable = $('#statchart-controls');
		// Character rarity
		rarityControls(controlsTable.find(".stattable-rarity-selector"));

		// Level
		controlsTable.find(".equipment-controls").append('<span class="stattable-level-selector">Level: <input class="stattable-level" type="number" value="'+level_cap+'" step="1" min="1" max="100" /></span>');

		// Equipment
		var equipmentControlsHTML = '';
		for (var index = 1; index <= 4; index++) equipmentControlsHTML += equipmentControl(index, statchart_equipment_preset[index]);
		controlsTable.find(".equipment-controls").append('<span class="stattable-equipment-selector">'+equipmentControlsHTML+'</span>');


		// Affection
		controlsTable.find(".affection-controls > .affection").append('<input type="number" value="50" step="1" min="1" max="50">');
		controlsTable.find(".affection-controls > .affection input").on("change", function(){affectionChartUpdate($(this).closest("div.affection"));affectionRecalc();statTablesRecalc();});
		controlsTable.find(".affection-icon").on("click", function(){affectionChartToggle($(this).closest("div.affection"));affectionRecalc();statTablesRecalc();});

		bindStatControls(controlsTable);
	 }


	$(".statchart tr.stattable-stats").each(function(){
		var id = 'statTable-'+(++tableCounter);
		if ($(this).attr('data-character-id') !== undefined) id = $(this).attr('data-character-id');
		$(this).attr('id',id);

		initStats($(this), $(this), id);

		if (!hasNull(statCalc[id].stats))
		{
			// Estimate raw numbers
			if (reverse_ingame_stats && ($(this).attr('data-source') == 'ingame')) { reverseStats(id); }


			// Equipment
			for (var index = 1; index <= ((typeof statCalc[id].gear.table_id !== 'undefined')?4:3); index++) {
				if (index <= 3) statCalc[id].equipment[index] = {'type': $(this).find(".equipment-"+index).attr('data-value'), 'image': $(this).find(".equipment-"+index).find("a").html()};
				else statCalc[id].equipment[index] = {'type': 'gear', 'image': $(this).find(".geartable").html(), 'title': "Unique gear"};
			}

			levelChange($(this), level_cap);
			equipmentChange($(this));
			rarityChange($(this), statCalc[id].stats.rarity);
			statTableRecalc($(this));

		}
		else
		{ console.log('StatCalc - init cancelled due to incomplete data'); }

	});

	calcPercentileBrackets();
	rankCharacters();
}


function calcPercentileBrackets() {
	for (var i = 20; i > 0; i--) {
		var ordinal_rank =  i*5/100 * Object.keys(statCalc).length;
		percentile_brackets.push(Math.ceil(ordinal_rank));
	}
}

function rankCharacters() {

	stats_list.forEach(function (element){
		rank(element);
	});
}

function rank(stat_name) {
	var stats = [];

	$.each( statCalc, function( key, value ) {
		stats.push(value.current[stat_name]);
	});

	stats.sort(function(a, b){return b - a;});

	$.each( statCalc, function( key, value ) {
		var rank = stats.indexOf(value.current[stat_name])+1;
		$('#'+key).find('.stat-'+stat_name).removeClass(function (index, className) {return (className.match (/(^|\s)rank-\S+/g) || []).join(' ');}).addClass('rank-'+rank);

		var percentile = 0;
		percentile_brackets.forEach(function (element){
			if (rank <= element) percentile = (percentile_brackets.indexOf(element)+1)*5;
		});
		$('#'+key).find('.stat-'+stat_name).removeClass(function (index, className) {return (className.match (/(^|\s)percentile-\S+/g) || []).join(' ');}).addClass('percentile-'+percentile);
	});
}


function affectionChartUpdate (element){
	var type = element.attr('data-affection-type');
	var input = element.find('input');
	var level = input.val();

	level = (typeof level !== 'undefined' && !isNaN(level)) ? level : 1 ;

	if (level < 1) 	 			{ input.val(1);	level = 1; }
	if (level > affection_cap) 	{ input.val(affection_cap); level = affection_cap; }

	//Flip element to active state on level change
	if (element.hasClass("inactive")) element.addClass('active').removeClass('inactive');

	affectionChartLevel(type, level);
}


function affectionChartToggle (element){
	var type = element.attr('data-affection-type');

	(element.hasClass("inactive")) ? element.addClass('active').removeClass('inactive') : element.addClass('inactive').removeClass('active');

	affectionChartLevel(type, element.hasClass("inactive") ? 1 : $(".stattable-controls .affection-"+type+" input").val());
}


// Every row's affection level: of its own table (main), or of its other versions' (alt)
function affectionChartLevel (type, level){
	Object.keys(statCalc).forEach(function (id){
		if (type == 'main') statCalc[id].affection.main_level = level;
		else for (var i = 0; i < statCalc[id].affection.alt_level.length; i++) statCalc[id].affection.alt_level[i] = level;
	});
}
/* Character stat chart - end */

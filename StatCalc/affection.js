/* Character affection table - start */
const affection_start = 50;
const affection_cap = 50;
	
var affection_data = {};
var affectionTableCounter = 0;

	
$( document ).ready(function() {
	//if (typeof statCalc == 'undefined') initAffectionTable(); //Affection tables init is normally called from statcalc
	$(".affection-level input").on("change mouseup keyup click", function(){affectionChange($(this).closest("table"), $(this).val());});
	$(".affection-data").children("div").on("click", function(){affectionChange($(this).closest("table"),$(this).attr('data-level'));});
});
	

function initAffectionTable(){
	$(".character-affectiontable").each(function(){
		var id = ++affectionTableCounter;
        if ($(this).parent().attr('data-character-id') !== undefined) id = $(this).parent().attr('data-character-id');
		$(this).attr('id', 'affectionTable-'+id);
		$(this).attr('data-character-id', id);
		
		//console.log('Initializing affection table '+id)
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
		//console.log(data);
		affection_data[id] = data;

		$(this).find(".affection-level").html('<input type="number" value="'+affection_start+'" step="1" min="1" max="'+affection_cap+'" />'); 
		
		affectionChange($(this), affection_start, false);
	});
}
	

function affectionChange (affectionTable, level, call_statCalc){
	call_statCalc = (typeof call_statCalc !== 'undefined') ? call_statCalc : true;

	var effective_bonus = {};
	var html_out = '';

	level = (typeof level !== 'undefined' && !isNaN(level)) ? level : 1 ;
	
	if (level < 1) 	 			{ affectionTable.find(".affection-level input").val(1);	level = 1; }
	if (level > affection_cap) 	{ affectionTable.find(".affection-level input").val(affection_cap); level = affection_cap; }

	
	for (var index = 2; index <= level; index++) {
		$.each( affection_data[affectionTable.attr('data-character-id')][index], function(stat_name, stat_value){
			if (typeof effective_bonus[stat_name] == 'undefined') effective_bonus[stat_name] = 0;
			effective_bonus[stat_name] += stat_value;
		});
	}
	
	$.each( effective_bonus, function(stat_name, stat_value){
		html_out += '<b>' + stat_name + '</b>' + ' +' + stat_value + ', ';
	});

	affection_data[affectionTable.attr('data-character-id')].current = effective_bonus;
	affection_data[affectionTable.attr('data-character-id')].level = level;

	if (affectionTable.find(".affection-level input").val() !== level) affectionTable.find(".affection-level input").val(level);
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

	//console.log('getting affection bonus from table '+id +' at level '+level);

	for (var index = 2; index <= level; index++) {
		$.each( affection_data[id][index], function(stat_name, stat_value){
			if (typeof effective_bonus[stat_name] == 'undefined') effective_bonus[stat_name] = 0;
			effective_bonus[stat_name] += stat_value;
		});
	}

	return effective_bonus;
}


/* Character affection table - end */

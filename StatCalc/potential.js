/* Character potential table - start */
const potential_start = 0;
const potential_cap = 25;

var potential_data = {};
var potentialtableCounter = 0;


function initPotentialTable(){
	$(".character-potentialtable").each(function(){
		var table = $(this);
		var id = 'potentialtable-'+(++potentialtableCounter);
		$(this).attr('id',id);

		var data = {};

		$(this).find(".level").each(function(){
			var level = $(this).attr('data-level');
			data[level] = {
                            'attack': $(this).attr('data-stat-attack'),
                            'hp': $(this).attr('data-stat-hp'),
                            'healing': $(this).attr('data-stat-healing'),
                        };

		});
		potential_data[id] = data;
        potential_data[id].current = {};
        potential_data[id].level = {};

		$(this).find(".summary [class^='potential-level']").html('<input type="number" value="'+potential_start+'" step="1" min="0" max="'+potential_cap+'" />');
		$.each(['attack', 'hp', 'healing'], function(index, stat_name){
			table.find(".potential-level-"+stat_name+" input").on("input change", function(event){potentialChange(table, stat_name, inputNumber($(this), 0, potential_cap, potential_data[id].level[stat_name], event.type == 'change'));});
		});
		table.find(".level .stat").on("click", function(){table.find(".potential-level-"+$(this).attr('data-stat')+" input").val($(this).parent().attr('data-level')); potentialChange(table, $(this).attr('data-stat'), $(this).parent().attr('data-level'));});

		potentialChange($(this), 'attack', potential_start);
        potentialChange($(this), 'hp', potential_start);
        potentialChange($(this), 'healing', potential_start);
	});
}


function potentialChange (potentialtable, stat_name, level){
	var effective_bonus = 0;
    var display_bonus = 0;

	level = (typeof level !== 'undefined' && !isNaN(level)) ? level : 0 ;

	if (level < 0) 	 			{ potentialtable.find(".potential-level-"+stat_name+" input").val(0);	level = 0; }
	if (level > potential_cap) 	{ potentialtable.find(".potential-level-"+stat_name+" input").val(potential_cap); level = potential_cap; }

    effective_bonus = potential_data[potentialtable.attr('id')][level][stat_name];
	potential_data[potentialtable.attr('id')].current[stat_name] = effective_bonus;
	potential_data[potentialtable.attr('id')].level[stat_name] = level;

    //if StatCalc is present, calculate actual bonus value instead of percentages
    if (typeof statCalc['statTable-1'] !== 'undefined') {
        display_bonus = Math.ceil(calcStat(statCalc['statTable-1'].stats.level, 1, stat_name, statCalc['statTable-1'].stats[stat_name+'_min'], statCalc['statTable-1'].stats[stat_name+'_max']) / 10000 * effective_bonus);
    }
    else display_bonus = effective_bonus/100 + '%';

    potentialtable.find(".potential-bonus-"+stat_name).html('+'+display_bonus);

	//update StatCalc if present
	if (typeof statCalc['statTable-1'] !== 'undefined') {
        statCalc['statTable-1'].potential.level[stat_name] = level;
        statCalc['statTable-1'].potential.bonus[stat_name] = display_bonus;
		statTableRecalc($(".character-stattable"));
	}
}
/* Character potential table - end */

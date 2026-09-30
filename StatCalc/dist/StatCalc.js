/* Built from calc.js, table.js, chart.js, affection.js, potential.js, init.js in https://github.com/electricgoat/ba-wiki-widgets */
/* Character stat calc - start */
const level_cap = 90;
const max_tier = [4, 10, 10, 10, 2]; // Max tier for Weapon, Equipment 1, 2, 3, Gear
const reverse_ingame_stats = false; // Estimate raw numbers if provided data is sourced ingame

// Unique weapon max levels per rank
const weapon_level_preset = {1:30, 2:40, 3:50, 4:60, 5:70};


const rarity_bonus = {
	"attack"	: [0, 0, 1000,	2200, 3600, 5300 ],
	"defense"	: [0, 0, 0,		0,    0, 	0 	 ],
	"healing"	: [0, 0, 750, 	1750, 2950, 4450 ],
	"hp"		: [0, 0, 500, 	1200, 2100, 3500 ]
};

const equipment_stats = {
'hat' : {
	//	param		  	   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'attack%' 		: [0,	8, 		13,		18,		25,		30,		35,		40, 	45,		48,		50	],
		'crit_damage' 	: [0,	0, 		0, 		0,		800, 	1200,	1600,	1800, 	2000,	2000,	2000],
	},

'gloves' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'attack%'		: [0,	6.4, 	10.4,	14.4,	20,		25,		30,		35,		40,		46,		50	],
		'crit_rate'	 	: [0,	0, 		0, 		0,		70,		200,	300,	350,	370,	450,	500	],
		'accuracy' 		: [0,	0, 		0, 		0,		0, 		0,		30,		200,	220,	220,	220	],
	},

'shoes' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'attack%'		: [0,	4, 		6.5,	9,		12.5,	20,		25,		30, 	35,		42,		46],
		'hp%'			: [0,	0, 		0, 		0,		6, 		9,		12,		13.5,	15,		17.5, 	20],
	},

'bag' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'hp'			: [0,	600,	975,	1350,	1875,	3500,	5500,	7500,	9500,	12000,	14000],
		'defense'		: [0,	0, 		0, 		0,		1000, 	1100,	1200,	1300,	1400, 	1600, 	1700],
		'hp%'			: [0,	0, 		0, 		0,		0, 		0,		0,		0,		0,	 	5,		5],
	},

'badge' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'hp'			: [0,	800,	1300,	1800,	2500,	4500,	6500,	9500,	12000,	14000, 	16000],
		'healing_inc'	: [0,	0, 		0, 		0,		1000, 	2000,	3000,	3200,	3400,	3500,	3500],
		'hp%'			: [0,	0, 		0, 		0,		0,	 	10,		18,		22,		24,		25,		25	],
		'evasion'		: [0,	0, 		0, 		0,		0,	 	0,		0,		400,	450,	450,	450	],
	},

'hairpin' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'hp'			: [0,	400,	650,	950,	1250,	3000,	4500,	6500,	8500,	11000,	13000],
		'cc_res%'	 	: [0,	0, 		0, 		0,		10,		20,		24,		28, 	32,		34,		36 ],
		'crit_rate'	 	: [0,	0, 		0, 		0,		0,		0,		0,		0,		0,		150,	150	],
	},

'charm' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'crit_res'		: [0,	80, 	130,	180,	250,	280,	320,	360,	380,	400,	420	],
		'critdamage_res': [0,	0, 		0, 		0,		1000,	1500,	1800,	2100,	2400,	2700,	3000],
		'crit_rate'		: [0,	0, 		0, 		0,		0,		120,	150,	180,	200,	250,	300	],
	},

'watch' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'crit_rate'		: [0,	80, 	130,	180,	250,	280,	320,	360,	400,	440,	480	],
		'crit_damage' 	: [0,	0, 		0, 		0,		1000,	1500,	1800,	2100,	2400,	2500,	2600],
		'hp%' 			: [0,	0, 		0, 		0,		0,		5,		7,		9,		11,		13,		15],
	},

'necklace' : {
	//	param			   N	T1		T2		T3		T4		T5		T6		T7		T8		T9		T10
		'healing%' 		: [0,	8, 		13, 	18,		25, 	28,		32,		35,		38,		40,		42],
		'cc_str%' 		: [0,	8, 		13, 	18,		25, 	28,		32,		35,		38,		38,		38],
		'attack%' 		: [0,	0, 		0, 		0,		0,		4,		6,		8,		10,		14,		18],
	},

};

/* WikiMedia file storage uses first two characters of an md5 filename hash */
/* Prehashed here as t1~t10 table is smaller than code for runtime calculation */
/* see https://www.mediawiki.org/wiki/Manual:$wgHashedUploadDirectory */
const equipment_icon_hashes = {
    "hat": 		["fd", "76", "49", "f0", "b0", "2d", "0f", "8a", "01", "8a"],
    "gloves": 	["c4", "1f", "45", "f3", "7b", "fb", "7f", "b3", "27", "2f"],
    "shoes": 	["3f", "fd", "1b", "d2", "67", "37", "d4", "99", "cf", "e1"],
    "bag": 		["1a", "7c", "95", "40", "3f", "4d", "ae", "6d", "21", "19"],
    "badge": 	["a8", "93", "a5", "1a", "15", "b3", "d6", "b5", "6b", "2e"],
    "hairpin": 	["1b", "73", "4d", "6f", "84", "72", "bf", "e9", "52", "b3"],
    "charm": 	["d4", "99", "1b", "5b", "af", "0e", "42", "94", "a2", "f1"],
    "watch": 	["c5", "e3", "33", "15", "c3", "61", "67", "da", "5f", "a6"],
    "necklace": ["f4", "3a", "66", "ae", "58", "ce", "26", "24", "05", "ea"]
};

const stats_list = [
	'attack', 'defense', 'healing', 'hp',
	'crit_damage', 'crit_rate', 'accuracy', 'evasion', 'cc_str', 'cc_res', 'crit_res', 'critdamage_res', 'healing_inc', 'attack_speed', 'stability'
];

const stats_list_map = {
	'Attack' : 'attack',
	'Defense': 'defense',
	'HP': 'hp',
	'Healing': 'healing',
	'Accuracy': 'accuracy',
	'Evasion': 'evasion',
	'Critical Rate': 'crit_rate',
	'Critical Damage': 'crit_damage',
	'Stability': 'stability',
	'Firing Range': 'range',
	'CC Strength': 'cc_str%',
	'CC Resistance': 'cc_res%',
	'Attack Speed': 'attack_speed',
	'Movement Speed': 'move_speed',
	'Cost Recovery': 'regen_cost',
	'Ammo Count': 'ammo_count',
	'Ammo Cost': 'ammo_cost',
};

var statCalc = {};
var tableCounter = 0;



// The rarity stars: five character stars, then the unique weapon's, copied from the template's
function rarityControls(raritySelector){
	raritySelector.html(repeat(page_image($(".stattable-rarity-selector").find(".star-character")).prop('outerHTML'), 5)+" "+repeat(page_image($(".stattable-rarity-selector").find(".star-weapon")).prop('outerHTML'), max_tier[0]));
	raritySelector.children("img").addClass('mw-no-invert').wrap( '<span class="control"></span>' )
	raritySelector.children("span.control").each(function(index){$(this).attr('data-rarity',index+1);});
}


// One slot of the equipment controls: the item's icon and its tier selector
function equipmentControl(index, item){
	var filename = '';
	var hash = '';
	var itemTiersHTML = '';
	for (var tier = 1; tier <= max_tier[index]; tier++){
		if (index <= 3){
			filename = `Equipment_Icon_${item.type.charAt(0).toUpperCase() + item.type.slice(1)}_Tier${tier}.png`;
			hash = equipment_icon_hashes[item.type][tier-1];

			//Preload equipment icons so they'd flip instantly upon switch
			if (tier !== max_tier[index]) {
				const link = $('<link>', {
					rel: 'preload',
					as: 'image',
					href: wiki_imagesrc(filename, hash, 44),
					imagesrcset: wiki_srcset(filename, hash, 44)
				});
				$('head').append(link);
			}
		}
		else {
			var imgsrc = item.image.split('/');
			filename = imgsrc.pop();
			hash = imgsrc.pop();
		}

		itemTiersHTML += `<option value="${tier}" ${(tier == max_tier[index]?' selected':'')} data-icon-filename="${filename}" data-icon-hash="${hash}">T${tier}</option>`;
	}

	const label = (item.title) ? item.title : item.type.charAt(0).toUpperCase() + item.type.slice(1);
	const imageHTML = `<img alt="${label}" src="${wiki_imagesrc(filename, hash, 44)}" decoding="async" class="mw-no-invert" srcset="${wiki_srcset(filename, hash, 44)}">`;
	return '<div class="equipment-item equipment-'+index+'" data-type="'+item.type+'" data-slot="'+index+'" title="'+label+'">' + imageHTML + '<span class="stattable-equipment-tier-selector"><select class="stattable-tier">'+itemTiersHTML+'</select></span>' + '</div>';
}


// The controls a stat table and the chart share: rarity stars, level and equipment
function bindStatControls(controls){
	controls.find(".stattable-level-selector input").on("input change", function(event){updateLevel(inputNumber($(this), 1, 100, statCalc[Object.keys(statCalc)[0]].stats.level, event.type == 'change'));statTablesRecalc();});
	controls.find(".stattable-rarity-selector").children("span.control").on("click", function(){updateRarity($(this).attr('data-rarity'));statTablesRecalc();});
	controls.find(".stattable-equipment-selector select").on("change", function(){updateEquipment();statTablesRecalc();});
	controls.find(".stattable-equipment-selector").find("img").on("click", function(){updateEquipment($(this).parent().attr('data-slot'));statTablesRecalc();});
}



function initStats(scope, statTable, id){

	statCalc[id] = {};

	if (statTable.attr('data-character-name') !== undefined) {
		statCalc[id].character_name = statTable.attr('data-character-name');
	}

	var attack_data = statTable.find(".stat-attack").html().split('/');
	var defense_data = statTable.find(".stat-defense").html().split('/');
	var hp_data = statTable.find(".stat-hp").html().split('/');
	var healing_data = statTable.find(".stat-healing").html().split('/');
	var ammo_data = statTable.find(".stat-ammo").html().split('/');


	statCalc[id].stats = {};
	statCalc[id].stats.rarity = !isNaN(parseInt(scope.find(".character-rarity").attr('data-value'))) ? parseInt(scope.find(".character-rarity").attr('data-value')) : 3 ;
	statCalc[id].stats.level = level_cap;

	statCalc[id].stats.attack_min	= parseInt(attack_data[0]) > 0 ? parseInt(attack_data[0]) : null;
	statCalc[id].stats.attack_max	= parseInt(attack_data[1]) > 0 ? parseInt(attack_data[1]) : null;
	statCalc[id].stats.defense_min	= parseInt(defense_data[0]) > 0 ? parseInt(defense_data[0]) : null;
	statCalc[id].stats.defense_max	= parseInt(defense_data[1]) > 0 ? parseInt(defense_data[1]) : null;
	statCalc[id].stats.hp_min		= parseInt(hp_data[0]) > 0 ? parseInt(hp_data[0]) : null;
	statCalc[id].stats.hp_max		= parseInt(hp_data[1]) > 0 ? parseInt(hp_data[1]) : null;
	statCalc[id].stats.healing_min	= parseInt(healing_data[0]) > 0 ? parseInt(healing_data[0]) : null;
	statCalc[id].stats.healing_max	= parseInt(healing_data[1]) > 0 ? parseInt(healing_data[1]) : null;

	statCalc[id].stats.accuracy		= parseInt(statTable.find(".stat-accuracy").html()) > 0 ? parseInt(statTable.find(".stat-accuracy").html()) : null;
	statCalc[id].stats.evasion		= parseInt(statTable.find(".stat-evasion").html()) > 0 ? parseInt(statTable.find(".stat-evasion").html()) : null;
	statCalc[id].stats.crit_rate	= parseInt(statTable.find(".stat-crit_rate").html()) > 0 ? parseInt(statTable.find(".stat-crit_rate").html()) : null;
	statCalc[id].stats.crit_damage	= parseInt(statTable.find(".stat-crit_damage").html()) > 0 ? parseInt(statTable.find(".stat-crit_damage").html()) : null;
	statCalc[id].stats.stability	= parseInt(statTable.find(".stat-stability").html()) > 0 ? parseInt(statTable.find(".stat-stability").html()) : null;
	statCalc[id].stats.range		= parseInt(statTable.find(".stat-range").html()) > 0 ? parseInt(statTable.find(".stat-range").html()) : null;
	statCalc[id].stats.cc_str		= parseInt(statTable.find(".stat-cc_str").html()) > 0 ? parseInt(statTable.find(".stat-cc_str").html()) : null;
	statCalc[id].stats.cc_res		= parseInt(statTable.find(".stat-cc_res").html()) > 0 ? parseInt(statTable.find(".stat-cc_res").html()) : null;
	statCalc[id].stats.attack_speed	= parseInt(statTable.find(".stat-attack_speed").html()) > 0 ? parseInt(statTable.find(".stat-attack_speed").html()) : null;
	statCalc[id].stats.move_speed	= parseInt(statTable.find(".stat-move_speed").html()) > 0 ? parseInt(statTable.find(".stat-move_speed").html()) : null;
	statCalc[id].stats.ammo_count	= parseInt(ammo_data[0]) > 0 ? parseInt(ammo_data[0]) : null;
	statCalc[id].stats.ammo_cost	= parseInt(ammo_data[1]) > 0 ? parseInt(ammo_data[1]) : null;
	statCalc[id].stats.regen_cost	= parseInt(statTable.find(".stat-regen_cost").html()) > 0 ? parseInt(statTable.find(".stat-regen_cost").html()) : null;


	statCalc[id].equipment = {};
	statCalc[id].equipment.bonus = {};


	var weapon_table = scope.find(".weapontable");
	statCalc[id].weapon = {};
	statCalc[id].weapon.bonus = {};
	statCalc[id].weapon.rarity = 0;
	statCalc[id].weapon.table_id = 'weapontable-'+id;
	weapon_table.attr('id',statCalc[id].weapon.table_id);

	statCalc[id].weapon.attack_min	= !isNaN(parseInt(weapon_table.attr('data-attack-val1'))) ? parseInt(weapon_table.attr('data-attack-val1')) : 0;
	statCalc[id].weapon.attack_max	= !isNaN(parseInt(weapon_table.attr('data-attack-val100'))) ? parseInt(weapon_table.attr('data-attack-val100')) : 0;
	statCalc[id].weapon.defense_min	= !isNaN(parseInt(weapon_table.attr('data-defense-val1'))) ? parseInt(weapon_table.attr('data-defense-val1')) : 0;
	statCalc[id].weapon.defense_max	= !isNaN(parseInt(weapon_table.attr('data-defense-val100'))) ? parseInt(weapon_table.attr('data-defense-val100')) : 0;
	statCalc[id].weapon.hp_min		= !isNaN(parseInt(weapon_table.attr('data-hp-val1'))) ? parseInt(weapon_table.attr('data-hp-val1')) : 0;
	statCalc[id].weapon.hp_max		= !isNaN(parseInt(weapon_table.attr('data-hp-val100'))) ? parseInt(weapon_table.attr('data-hp-val100')) : 0;
	statCalc[id].weapon.healing_min	= !isNaN(parseInt(weapon_table.attr('data-healing-val1'))) ? parseInt(weapon_table.attr('data-healing-val1')) : 0;
	statCalc[id].weapon.healing_max	= !isNaN(parseInt(weapon_table.attr('data-healing-val100'))) ? parseInt(weapon_table.attr('data-healing-val100')) : 0;


	var gear_table = scope.find(".geartable");
	statCalc[id].gear = {};
	statCalc[id].gear.stats = {};
	statCalc[id].gear.bonus = {};
	statCalc[id].gear.rarity = 0;

	if (gear_table.length)
	{
		statCalc[id].gear.table_id = 'geartable-'+id;
		gear_table.attr('id',statCalc[id].gear.table_id);

		statCalc[id].gear.stats[stats_list_map[gear_table.attr('data-stat-t1')]] = !isNaN(parseInt(gear_table.attr('data-stat-t1-value'))) ? parseInt(gear_table.attr('data-stat-t1-value')) : 0;
	}

	statCalc[id].affection = {};
	statCalc[id].affection.bonus = {};
	statCalc[id].affection.main_id = [];
	statCalc[id].affection.alt_id = [];
	statCalc[id].affection.alt_level = [];

	statCalc[id].potential = {};
	statCalc[id].potential.level = {};
	statCalc[id].potential.bonus = {};

	statCalc[id].current = {};

}



function reverseStats (id){
	console.log('StatCalc - Data source is set to ingame, calculator will attempt to estimate RAW values');
	var fixedStats = calcReverseStat(level_cap,statCalc[id].stats.rarity,'attack',statCalc[id].stats.attack_min,statCalc[id].stats.attack_max);
	statCalc[id].stats.attack_min = fixedStats[0];
	statCalc[id].stats.attack_max = fixedStats[1];

	fixedStats = calcReverseStat(level_cap,statCalc[id].stats.rarity,'defense',statCalc[id].stats.defense_min,statCalc[id].stats.defense_max);
	statCalc[id].stats.defense_min = fixedStats[0];
	statCalc[id].stats.defense_max = fixedStats[1];

	fixedStats = calcReverseStat(level_cap,statCalc[id].stats.rarity,'hp',statCalc[id].stats.hp_min,statCalc[id].stats.hp_max);
	statCalc[id].stats.hp_min = fixedStats[0];
	statCalc[id].stats.hp_max = fixedStats[1];

	fixedStats = calcReverseStat(level_cap,statCalc[id].stats.rarity,'healing',statCalc[id].stats.healing_min,statCalc[id].stats.healing_max);
	statCalc[id].stats.healing_min = fixedStats[0];
	statCalc[id].stats.healing_max = fixedStats[1];
}



function updateLevel (level){
	Object.keys(statCalc).forEach(function (element){
		levelChange ($('#'+element), level);
	});

}


function updateEquipment (toggleSlot){
	toggleSlot = (typeof toggleSlot !== 'undefined') ? toggleSlot : false; //default false, ES5 does not support function defaults

	if (toggleSlot) {
		var item_slot = $(".statchart-controls .equipment-"+toggleSlot);
		(item_slot.hasClass("inactive")) ? item_slot.addClass('active').removeClass('inactive') : item_slot.addClass('inactive').removeClass('active');
	}

	Object.keys(statCalc).forEach(function (element){
		equipmentChange ($('#'+element), toggleSlot);
	});

}


function updateRarity (rarity){
	Object.keys(statCalc).forEach(function (element){
		rarityChange ($('#'+element), rarity);
	});

}


function statTablesRecalc(){
	Object.keys(statCalc).forEach(function (element){
		statTableRecalc ($('#'+element));
	});

	rankCharacters();
}



function levelChange (statTable, level){
	if (level < 1) 	 { statTable.find(".stattable-level").val(1);	level = 1; }
	if (level > 100) { statTable.find(".stattable-level").val(100); level = 100; }

	statCalc[statTable.attr('id')].stats.level = level;
}


function equipmentChange (statTable, toggleSlot){
	var id = statTable.attr('id');
	toggleSlot = (typeof toggleSlot !== 'undefined') ? toggleSlot : false; //default false, ES5 does not support function defaults

	if (toggleSlot) {
		var item_slot = statTable.find(".equipment-"+toggleSlot);
		(item_slot.hasClass("inactive")) ? item_slot.addClass('active').removeClass('inactive') : item_slot.addClass('inactive').removeClass('active');
	}


	stats_list.forEach(function (element){
		statCalc[id].equipment.bonus[element] = 0;
		statCalc[id].equipment.bonus[element+'%'] = 0;
		statCalc[id].gear.bonus[element] = 0;
		statCalc[id].gear.bonus[element+'%'] = 0;
	});


	var selector = $(document).find(".stattable-equipment-selector");
	for (var index = 1; index <= 3; index++) {
		const control = selector.find(".equipment-"+index);
		if (!control.hasClass("inactive"))
		{
			var eq_type = statCalc[id].equipment[index].type;
			var eq_tier = control.find("select").val();

			stats_list.forEach(function (element){
				statCalc[id].equipment.bonus[element] += ((typeof equipment_stats[eq_type][element] !== 'undefined' && typeof equipment_stats[eq_type][element][eq_tier] !== 'undefined')?equipment_stats[eq_type][element][eq_tier]:0);
				statCalc[id].equipment.bonus[element+'%'] += ((typeof equipment_stats[eq_type][element+'%'] !== 'undefined' && typeof equipment_stats[eq_type][element+'%'][eq_tier] !== 'undefined')?equipment_stats[eq_type][element+'%'][eq_tier]:0);
			});
		}

		const option = control.find("select > option:selected");
		if (control.children('img').attr('src') !== wiki_imagesrc(option.data('icon-filename'), option.data('icon-hash'), 44)) control.children('img').attr('src', wiki_imagesrc(option.data('icon-filename'), option.data('icon-hash'), 44)).attr('srcset', wiki_srcset(option.data('icon-filename'), option.data('icon-hash'), 44));
	}

	if (!selector.find(".equipment-4").hasClass("inactive"))
		{
			stats_list.forEach(function (element){
				statCalc[id].gear.bonus[element] += ((typeof statCalc[id].gear.stats[element] !== 'undefined')?statCalc[id].gear.stats[element]:0);
				statCalc[id].gear.bonus[element+'%'] += ((typeof statCalc[id].gear.stats[element+'%'] !== 'undefined')?statCalc[id].gear.stats[element+'%']:0);
			});
		}
}


function rarityChange (statTable, rarity){
	var id = statTable.attr('id');

	statCalc[id].stats.rarity = (rarity > 5) ? 5 : rarity;
	statCalc[id].weapon.rarity = (rarity > 5) ? rarity-5 : 0;

	statCalc[id].weapon.bonus.attack = statCalc[id].weapon.rarity>0 ? calcWeaponStat( weapon_level_preset[statCalc[id].weapon.rarity], statCalc[id].weapon.attack_min, statCalc[id].weapon.attack_max ) : 0;
	statCalc[id].weapon.bonus.defense = statCalc[id].weapon.rarity>0 ? calcWeaponStat( weapon_level_preset[statCalc[id].weapon.rarity], statCalc[id].weapon.defense_min, statCalc[id].weapon.defense_max ) : 0;
	statCalc[id].weapon.bonus.hp = statCalc[id].weapon.rarity>0 ? calcWeaponStat( weapon_level_preset[statCalc[id].weapon.rarity], statCalc[id].weapon.hp_min, statCalc[id].weapon.hp_max ) : 0;
	statCalc[id].weapon.bonus.healing = statCalc[id].weapon.rarity>0 ? calcWeaponStat( weapon_level_preset[statCalc[id].weapon.rarity], statCalc[id].weapon.healing_min, statCalc[id].weapon.healing_max ) : 0;


	$( document ).find(".stattable-rarity-selector").children().each(function(){
		($(this).attr('data-rarity') <= rarity) ? $(this).addClass('active').removeClass('inactive') : $(this).addClass('inactive').removeClass('active');
	});
}


function statTableRecalc(statTable){
	var id = statTable.attr('id');

	['attack', 'defense', 'hp', 'healing'].forEach(function (statName){
		statCalc[id].current[statName] = totalStat(	statCalc[id].stats.level,
													statCalc[id].stats.rarity,
													statName,
													statCalc[id].stats[statName+'_min'],
													statCalc[id].stats[statName+'_max'],
													statCalc[id].equipment.bonus[statName+'%'],
													statCalc[id].equipment.bonus[statName] + statCalc[id].weapon.bonus[statName] + statCalc[id].affection.bonus[statName] + ((statCalc[id].gear.bonus[statName] !== undefined)?statCalc[id].gear.bonus[statName]:0) + ((statCalc[id].potential.bonus[statName] !== undefined)?statCalc[id].potential.bonus[statName]:0),
												);
		statTable.find(".stat-"+statName).html(statCalc[id].current[statName] );
	});

	['crit_damage', 'crit_rate', 'accuracy', 'evasion', 'cc_str', 'cc_res', 'crit_res', 'critdamage_res', 'healing_inc', 'attack_speed', 'stability'].forEach(function (statName){
		statCalc[id].current[statName] = addBonus( statCalc[id].stats[statName],
													statCalc[id].equipment.bonus[statName+'%'] + statCalc[id].gear.bonus[statName+'%'],
													statCalc[id].equipment.bonus[statName] + statCalc[id].gear.bonus[statName] );
		statTable.find(".stat-"+statName).html(statCalc[id].current[statName]);
	});


	//secondary values
	statCalc[id].stats.damage_floor = statCalc[id].stats.stability * 10000 / (statCalc[id].stats.stability + 1000) + 2000;
	statCalc[id].stats.one_cost_time = 10000 / statCalc[id].stats.regen_cost;


	statTable.find("[class^=stat-]").each(function () {
		$(this).attr("title", statTooltip(id, $(this).attr('class').match (/(^|\s)stat-\S+/g)[0].substring(5)));
	});
}


function statTooltip(id, statName){
	var tooltip = '';

	tooltip += (typeof statCalc[id].stats[statName+'_min'] !== 'undefined' && statCalc[id].stats[statName+'_min'] > 0) ? 'Base: ' + calcStat(statCalc[id].stats.level, statCalc[id].stats.rarity, statName, statCalc[id].stats[statName+'_min'], statCalc[id].stats[statName+'_max']) : '';
	tooltip += (typeof statCalc[id].stats[statName] !== 'undefined' && statCalc[id].stats[statName] > 0) ? 'Base: ' + statCalc[id].stats[statName] : '';
	tooltip += (typeof statCalc[id].equipment.bonus[statName] !== 'undefined' && statCalc[id].equipment.bonus[statName] > 0) ? '\r\nEquipment: ' + statCalc[id].equipment.bonus[statName] : '';
	tooltip += (typeof statCalc[id].gear.bonus[statName] !== 'undefined' && statCalc[id].gear.bonus[statName] > 0) ? '\r\nGear: ' + statCalc[id].gear.bonus[statName] : '';
	tooltip += (typeof statCalc[id].weapon.bonus[statName] !== 'undefined' && statCalc[id].weapon.bonus[statName] > 0) ? '\r\nWeapon: ' + statCalc[id].weapon.bonus[statName] : '';
	tooltip += (typeof statCalc[id].affection.bonus[statName] !== 'undefined' && statCalc[id].affection.bonus[statName] > 0) ? '\r\nAffection: ' + statCalc[id].affection.bonus[statName] : '';
	tooltip += (typeof statCalc[id].potential.bonus[statName] !== 'undefined' && statCalc[id].potential.bonus[statName] > 0) ? '\r\Potential: ' + statCalc[id].potential.bonus[statName] : '';

	if (stats_list.indexOf(statName) < 4)
		tooltip += (statCalc[id].equipment.bonus[statName+'%'] > 0) ? '\r\nEquipment: ' + statCalc[id].equipment.bonus[statName+'%']+'%'
		+ ' ('+ (parseInt(totalStat(statCalc[id].stats.level, statCalc[id].stats.rarity, statName, statCalc[id].stats[statName+'_min'], statCalc[id].stats[statName+'_max'], statCalc[id].equipment.bonus[statName+'%'], statCalc[id].equipment.bonus[statName] + statCalc[id].weapon.bonus[statName] + statCalc[id].affection.bonus[statName] + statCalc[id].gear.bonus[statName]))-parseInt(totalStat(statCalc[id].stats.level, statCalc[id].stats.rarity, statName, statCalc[id].stats[statName+'_min'], statCalc[id].stats[statName+'_max'], 0, statCalc[id].equipment.bonus[statName] + statCalc[id].weapon.bonus[statName] + statCalc[id].affection.bonus[statName] + statCalc[id].gear.bonus[statName]))) +')' : '';
	else
		tooltip += (statCalc[id].equipment.bonus[statName+'%'] > 0) ? '\r\nEquipment: ' + statCalc[id].equipment.bonus[statName+'%']+'%'
		+ ' ('+ (addBonus( statCalc[id].stats[statName], statCalc[id].equipment.bonus[statName+'%'], 0 )) +')' : '';

	if (statName == 'stability') tooltip += '\r\n——————————\r\nDamage floor: ' + (statCalc[id].stats.damage_floor / 100).toFixed(2) + '%';
	if (statName == 'regen_cost') tooltip += '\r\n——————————\r\nSeconds per 1 cost: ' + (statCalc[id].stats.one_cost_time).toFixed(2);
	if (statName == 'ammo') tooltip += 'Magazine size: ' + statCalc[id].stats.ammo_count + '\r\n' + ((statCalc[id].stats.ammo_cost>1)?'Ammo per burst: ':'Ammo per attack: ') + statCalc[id].stats.ammo_cost;

	return tooltip;
}


function totalStat(level,rarity,statName,val1,val100,bonus_percent,bonus_flat){
	var stat_value = calcStat(level,rarity,statName,val1,val100);
	stat_value = (stat_value+bonus_flat)*(1 + bonus_percent/100);

	return Math.ceil(stat_value);
}


function addBonus(stat_value,bonus_percent,bonus_flat){
	return Math.ceil((stat_value+bonus_flat)*(1 + bonus_percent/100));
}


function calcStat(level,rarity,statName,val1,val100){
	return Math.ceil( Math.round(val1 + (val100 - val1) * (Math.round((level - 1) / 99 * 10000) / 10000)) * (10000 + rarity_bonus[statName][rarity]) / 10000 );
}


function calcReverseStat(startingLevel,startingRarity,statName,val1,val100){
	var rawVal1 = val1 / (10000 + rarity_bonus[statName][startingRarity]) * 10000;
	var rawVal100 = (val100 / (10000 + rarity_bonus[statName][startingRarity]) * 10000 - rawVal1) / (startingLevel - 1) * 99 + rawVal1;

	return [Math.floor(rawVal1), Math.floor(rawVal100)];
}


function calcWeaponStat(level,val1,val100){
	return Math.ceil(val1 + (val100 - val1) * Math.round((level - 1) / 99 * 10000) / 10000);
}


function hasNull(target) {
    for (var member in target) {
        if (target[member] == null)
            return true;
    }
    return false;
}


function repeat(string, count) {
    return new Array(count + 1).join(string);
}


// A number box's value between min and max, the fallback while it isn't a number yet; committing (on change) writes it back
function inputNumber(input, min, max, fallback, commit) {
	var value = parseInt(input.val());
	if (isNaN(value)) value = fallback;
	value = Math.min(max, Math.max(min, value));
	if (commit && String(value) !== input.val()) input.val(value);
	return value;
}


function wiki_imagesrc(filename, hash, size) {
	size = (typeof size !== 'undefined') ? size : 44; //default, ES5 does not support function defaults
	return `https://static.miraheze.org/bluearchivewiki/thumb/${String(hash).charAt(0)}/${hash}/${filename}/${size}px-${filename}`;
}

function wiki_srcset(filename, hash, size) {
	size = (typeof size !== 'undefined') ? size : 44; //default, ES5 does not support function defaults
	return `//static.miraheze.org/bluearchivewiki/thumb/${String(hash).charAt(0)}/${hash}/${filename}/${Math.ceil(size*1.5)}px-${filename} 1.5x, //static.miraheze.org/bluearchivewiki/thumb/${String(hash).charAt(0)}/${hash}/${filename}/${size*2}px-${filename} 2x`;
}

// Address of the first image in an element. MobileFrontend serves images as placeholders, with the address in data-mw-src
function page_imagesrc(element) {
	var image = element.find("img, .lazy-image-placeholder").first();
	return image.hasClass('lazy-image-placeholder') ? image.attr('data-mw-src') : image.attr('src');
}

// A copy of the first image in an element; for a MobileFrontend placeholder, the image it stands for
function page_image(element) {
	var image = element.find("img, .lazy-image-placeholder").first();
	if (!image.hasClass('lazy-image-placeholder')) return image.clone();
	return $('<img decoding="async">').attr({'src': image.attr('data-mw-src'), 'srcset': image.attr('data-mw-srcset') || null, 'alt': image.attr('data-alt') || '',
		'width': image.attr('data-width'), 'height': image.attr('data-height'), 'class': image.attr('data-class') || null});
}
/* Character stat calc - end */

/* Character stat table - start */
function initStatCalc(){
	$(".character-stattable").each(function(){
		var id = 'statTable-'+(++tableCounter);
		$(this).attr('id',id);

		initStats($(this).closest('.mw-parser-output, body'), $(this), id);

		if (!hasNull(statCalc[id].stats))
		{
			// Estimate raw numbers
			if (reverse_ingame_stats && ($(this).attr('data-source') == 'ingame')) { reverseStats(id); }

			// Character rarity
			rarityControls($(this).find(".stattable-rarity-selector"));

			// Level
			$(this).find(".stattable-controls td").append('<div><span class="stattable-level-selector">Level: <input class="stattable-level" type="number" value="'+level_cap+'" step="1" min="1" max="100" /></span></div>');

			// Equipment
			var equipmentTable = $('.character-equipment');
			var equipmentControlsHTML = '';

			for (var index = 1; index <= ((typeof statCalc[id].gear.table_id !== 'undefined')?4:3); index++) {
				statCalc[id].equipment[index] = (index <= 3)?{'type': equipmentTable.find(".equipment-"+index).attr('data-value'), 'image': false, 'title': false}:{'type': 'gear', 'image': page_imagesrc($(document).find(".geartable-summary a")), 'title': "Unique gear"};
				equipmentControlsHTML += equipmentControl(index, statCalc[id].equipment[index]);
			}

			$(this).find(".stattable-controls td>div").append('<span class="stattable-equipment-selector">'+equipmentControlsHTML+'</span>');

			$(this).find(".stattable-controls").css( "display", "" );
			bindStatControls($(this).find(".stattable-controls"));

			levelChange($(this), level_cap);
			equipmentChange($(this));
			rarityChange($(this), statCalc[id].stats.rarity);
			statTableRecalc($(this));

		}
		else
		{ console.log('StatCalc - init cancelled due to incomplete data'); }

	});
}
/* Character stat table - end */

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

/* StatCalc init - start */
// The parts start in turn once the page is ready, each on its own: one that fails doesn't stop the others
$( document ).ready(function() {
	[initAffectionTable, initStatCalc, initStatChart, initAffectionLink, initPotentialTable].forEach(function (init){
		try { init(); }
		catch (error) { setTimeout(function(){ throw error; }); }
	});
});
/* StatCalc init - end */

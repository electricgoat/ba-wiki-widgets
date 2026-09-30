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

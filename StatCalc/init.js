/* StatCalc init - start */
// The parts start in turn once the page is ready, each on its own: one that fails doesn't stop the others
$( document ).ready(function() {
	[initAffectionTable, initStatCalc, initStatChart, initAffectionLink, initPotentialTable].forEach(function (init){
		try { init(); }
		catch (error) { setTimeout(function(){ throw error; }); }
	});
});
/* StatCalc init - end */

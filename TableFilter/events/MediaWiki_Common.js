/* Any JavaScript here will be loaded for all users on every page load. <pre>*/

$(function() {
    function initCountdown() {
        var reset = new Date();
        reset.setUTCHours(19, 0, 0, 0);
        
        function pad(n) {
            return ("0" + (n | 0)).slice(-2);
        }

        function tick() {
            var now = new Date();
            if (now > reset) {
            reset.setUTCDate(reset.getUTCDate() + 1);
            }
            var remaining = ((reset - now) /  1000);
            var hours = (remaining / 3600) % 60;
            var minutes = (remaining / 60) % 60;
            var seconds = remaining % 60;
            document.getElementById("resetCountdown").innerHTML = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
            setTimeout(tick, 1000);
        }

        tick();
    }

    if (document.getElementsByClassName("server-toggle-parent").length > 0 || document.getElementsByClassName("server-toggle-jp-button").length > 0 || document.getElementsByClassName("tabber__tabs").length > 0) {
        //console.log("Loading server switching js");
        mw.loader.load ( '/wiki/MediaWiki:ServerToggle.js?action=raw&ctype=text/javascript' );
    }

    function initCharacterTable() {
        mw.loader.using("jquery.tablesorter", function() {
            $("table.sortable").tablesorter({sortList: [{14: "desc"}, {2: "desc"}, {1: "asc"}]});
        });
    }
    function initBannerTable() {
        mw.loader.using("jquery.tablesorter", function() {
            $("table.sortable").tablesorter({sortList: [{2: "desc"}, {0: "asc"}]});
        });
    }
    if (mw.config.get("wgIsArticle")) {
    	// These won't run in Edit mode
	    if (mw.config.get("wgPageName") === "Main_Page") {
	        initCountdown();
	        initBirthdays();
	    }
		if (mw.config.get("wgPageName") === "Characters") {
	        initCharacterTable();
	    }
        if (mw.config.get("wgPageName") === "Banner_List" || mw.config.get("wgPageName") === "Banner_List_(Global)") {
	        initBannerTable();
	    }
	    if (mw.config.get("wgPageName") === "Characters" || mw.config.get("wgPageName") === "Characters_StatChart" || mw.config.get("wgPageName") === "Banner_List" || mw.config.get("wgPageName") === "Banner_List_(Global)" || mw.config.get("wgPageName") === "Affection" || mw.config.get("wgPageName") === "Events") {
			mw.loader.load( '/wiki/MediaWiki:TableFilter.js?action=raw&ctype=text/javascript' );
	    }
		if (mw.config.get("wgPageName") === "An_Unconcealed_Heart/Mitcher") {
	        mw.loader.load( '/wiki/MediaWiki:Mitcher.js?action=raw&ctype=text/javascript' );
	    }
        if (mw.config.get("wgPageName") === "A_Game_Before_the_New_Year's_Feast_~_One-and-Done_Match_~/Junby") {
	        mw.loader.load( '/wiki/MediaWiki:Junby.js?action=raw&ctype=text/javascript' );
	    }
    }
});

$(document).ready(function () {
    //mw.loader.load( '/wiki/MediaWiki:DateTime.js?action=raw&ctype=text/javascript' );
	mw.loader.load( '/wiki/MediaWiki:AudioPause.js?action=raw&ctype=text/javascript' );
	if (document.getElementsByClassName("audio-player").length > 0) {
    	mw.loader.load( 'https://cdn.jsdelivr.net/gh/lihaohong6/MirahezeDevScripts@037d0da8fcb1642a44bdab32c7abd8b081bafb9a/dist/AudioPlayer/gadget-impl.js' );
    }
    if (document.getElementsByClassName("story-container").length > 0) {
    	mw.loader.load( '/wiki/MediaWiki:Story.js?action=raw&ctype=text/javascript' );
    }
    if (document.querySelector(".momotalk-container")) {
    	mw.loader.load( '/wiki/MediaWiki:MomotalkChoice.js?action=raw&ctype=text/javascript' ); 
    }
});


/* TopNav tabs replacement - start */
$(document).ready(function () {
    const topNav = $('#top-nav');
    if (topNav.length === 0) return; //no top-nav

    const skin = mw.config.get('skin');
    let targetList, mainItem, discussionItem;
    if (skin === 'vector') {
        targetList = $('.vector-menu-content-list');
        mainItem = targetList.find('#ca-nstab-main');
        discussionItem = targetList.find('#ca-talk');
    } else if (skin === 'minerva') {
        targetList = $('#p-associated-pages');
        mainItem = targetList.find('.minerva__tab.selected');
        discussionItem = targetList.find('.minerva__tab a[data-event-name="tabs.talk"]').closest('li');
    }

    if (targetList.length === 0) {
        topNav.show();
        return; //yes top-nav, no skin-specific menu; fallback to content buttons
    }

    let mainItemProcessed = false;

    topNav.find('.top-nav-button').each(function () {
        const button = $(this);
        const link = button.find('a');
        const accessKey = button.data('accesskey');

        if (link.hasClass('selflink') && mainItem.length > 0) {
            mainItem.find('a').text(link.text()).attr('title', link.attr('title'));
            if (accessKey) mainItem.find('a').attr('accesskey', accessKey).attr('title', `${link.attr('title')} [alt-shift-${accessKey}]`);
            mainItemProcessed = true;
            return;
        }
        
        const listItem = $('<li></li>').addClass(skin === 'vector' ? 'mw-list-item' : 'minerva__tab');
        const newLink = $('<a></a>', {
            href: link.attr('href'),
            title: link.attr('title'),
            text: link.text()
        });

        if (accessKey) {
            newLink.attr('accesskey', accessKey);
            newLink.attr('title', `${link.attr('title')} [alt-shift-${accessKey}]`);
        }

        listItem.append(newLink);
        listItem.insertBefore(mainItemProcessed ? discussionItem : mainItem);
    });

    topNav.remove();
});
/* TopNav tabs replacement - end */


/* Character stat calc & affection table */
mw.loader.load( '/wiki/MediaWiki:StatCalc.js?action=raw&ctype=text/javascript' );


/* Character birthdays - start */
function initBirthdays() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = month => months.indexOf(month);
    var birthdays = [];
    var data_out = [];
    var html_out = '';
    var raw_data = $('#character-birthdays').attr('data-birthdays').split('&').filter(Boolean);

    raw_data.forEach(function(character) {
        var char_data = character.split(' |');
        char_data.push(char_data[0].split('(')[0].trim());
        // Avoid duplicates by character name
        if (!birthdays.some(function(data) {
            return data[2] === char_data[2];
        })) {
            birthdays.push(char_data);
        }
    });

    birthdays.sort(function(a, b) {
        let [monthA, dayA] = a[1].split(' ');
        let [monthB, dayB] = b[1].split(' ');
        return monthIndex(monthA) - monthIndex(monthB) || dayA - dayB;
    });

    for (var index = 0; index <= 30; index++) {
        var date = new Date();
        date.setDate(date.getDate() + index);
        data_out = data_out.concat(birthdays.filter(function(data) {
            return data[1] === months[date.getMonth()] + ' ' + date.getDate();
        }));
        if (data_out.length >= 5) {
            break;
        }
    }
    data_out.forEach(function(character) {
        html_out += '<a href="/wiki/' + character[0] + '">' + character[2] + '&nbsp;(' + character[1].replace(' ', '&nbsp;') + ')</a>';
    });
    $('#character-birthdays').append(html_out).css("display", "");
}
/* Character birthdays - end */


/* Character voice preview - start */
$( document ).ready(function() {
	initCharacterVoice();
});

function initCharacterVoice(){
    var voice = $(".character td.character-voice");
    if (voice.length && voice.attr('data-voice').length) {
        voice.addClass('character-voice-preview').on("click", function(){playCharacterVoice();});
        voice.wrapInner('<span>');
        if (voice.find("span").width() > voice.width()-36 ) voice.css('padding-right', '16px');
        voice.find("span").children().unwrap();
    }
}

function playCharacterVoice(){
    var voice = $(".character td.character-voice");
    if (voice.find('audio').length == 0) {
        voice.append('<audio class="voice-clip" src="'+voice.attr('data-voice')+'"></audio>');
        voice.find('audio')[0].volume=0.6;
    }
    voice.find('audio')[0].play();
}
/* Character voice preview - end */


/* Character video preview - start */
$( document ).ready(function() {
    //if video tab is open on inital page display
    if ($(".character-images #tabber-tab-Chibi-0").attr('aria-selected') == 'true' || window.location.hash == '#tabber-Chibi' || window.location.hash == '#tabber-Other' || window.location.hash == '#tabber-tabpanel-Other-1' ) initCharacterVideo($('.character-images'));

    //Tabber initializes late so events are bound at first click on parent div
    $(".character-images div.tabber").on("click", function(){ 
        initCharacterVideo($('.character-images'));
    });
})

function initCharacterVideo(element) {
    var container = element.find('div.video');
    if (!container.attr('data-video-initialized')) {
        var video_src = container.attr('data-videosrc');
        container.html('<video autoplay loop playsinline><source src="'+video_src+'" type="video/webm" /></video>');
        container.on("click", function(){playToggle(container)});
        container.attr('data-video-initialized', true);
    }
}

function playToggle(element) {
    var video = element.find('video').get(0);
    if (video.paused) video.play();
    else video.pause();
}
/* Character video preview - end */


/* Tip toggle */
$(document).ready(function() {
    $('.tip-button').on('click', function() {
        const $tip = $(this).closest('.tip');
        
        if ($tip.hasClass('inactive')) {
            $tip.removeClass('inactive').addClass('active');
        } else if ($tip.hasClass('active')) {
            $tip.removeClass('active').addClass('inactive');
        }
    });
});


/* XP tables */
mw.loader.load( '/wiki/MediaWiki:XPtable.js?action=raw&ctype=text/javascript' );

/*</pre>*/
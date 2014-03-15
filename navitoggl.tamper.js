// ==UserScript==
// @name      	Naviweep
// @namespace 	https://github.com/erlendve/Naviweep
// @homepage	https://github.com/erlendve/Naviweep
// @downloadURL https://raw.github.com/erlendve/Naviweep/master/Naviweep.tamper.js
// @version   	0.12
// @description Theme to make Naviwep less awful
// @match      	https://naviwep.steria.no/NaviWEB/timereg_direct.aspx
// @copyright  	2014+, Erlend Vestad
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// ==/UserScript==

function fillWeekdaysWithHours(event) {
    //$("td:contains(description)").parent().find('td > span > input:not(:hidden)').slice(0, -2).val(hours);
    //alert(event.data.hours);
    //event.target.data('foo', 'bar');
    //alert('moo');
    $(event.target).parent().parent().find('td > span > input:not(:hidden)').slice(0, -2).val(7.5);
}

// common function in css to change css style
function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

function test() {
    $("tr.rgEditRow > td:nth-child(5)").append('<button data-hours="7.5" type="button" style="float: right">Roar er lat</button>');//.click({hours: 7.5}, fillWeekdaysWithHours);
    $("tr.rgEditRow > td:nth-child(5) > button").click(fillWeekdaysWithHours);
   	
    $('link').attr('href',"//netdna.bootstrapcdn.com/bootswatch/3.0.3/flatly/bootstrap.min.css");
    //$('link').attr('href',"//netdna.bootstrapcdn.com/bootstrap/3.0.3/css/bootstrap.min.css");  
    
    $('#ctl00_DIV_Menu').addClass('navbar navbar-default').css('margin-bottom', '0px');
    $('ul.rmRootGroup').addClass('nav navbar-nav');
    //$('ul.rmRootGroup > .rmItem').css('color', 'red');
    var center = $('.MenuItemCenter');
    center.removeClass('.MenuItemCenter');
    center.find('span').addClass('navbar-brand');
    var username = $('#ctl00_RadMenu1_i12_LBL_UserInfo');
    username.removeClass().addClass("navbar-text navbar-right");
    var logout = $('#ctl00_RadMenu1_i12_LoginStatus');
    logout.removeClass().addClass("navbar-link");
    logout.wrap('<p class="navbar-text navbar-right">' + username.text() + ' ' + '</p>');
    username.unwrap();
    username.unwrap();
    username.remove();
    
    //var usercontent = logout.parent().contents();
    //logout.parent().parent().replaceWithContent(usercontent);
    
    $('ul.rmRootGroup > .rmItem li').unwrap();
    $('ul.rmRootGroup > li.rmSeparator').remove();
    $('ul.rmRootGroup > li.rmItem').addClass('dropdown');
    $('ul.rmRootGroup > li.rmItem').hover(
        function() {
    		$( this ).addClass( "open" );
  		}
        , function() {
    		$( this ).removeClass( "open" );
  		}
		);
    $('ul.rmRootGroup > li.rmItem > .rmSlide').wrap('<ul class="dropdown-menu"></ul>');
    $('ul.rmRootGroup > li.rmItem > .rmSlide > li').removeClass();
    
    addGlobalStyle('ul.nav li.dropdown:hover > ul.dropdown-menu {display: block;}');
    
    $('.rgMasterTable').addClass('table table-striped table-condensed');
    $('table[style]').removeAttr('style');
    
    $('.rgCommandCell input:even').addClass('btn btn-default');
    $('.rgCommandCell input:odd').addClass('btn btn-primary');

	$('.CurrentPeriod').attr('align', 'center');
	$('#TimeSheetTableDiv').css('font', '12px/16px "segoe ui",arial,sans-serif');    
}

test();

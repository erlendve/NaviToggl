// ==UserScript==
// @name       NaviToggl2
// @namespace  https://github.com/erlendve/NaviToggl
// @downloadURL https://raw.github.com/erlendve/NaviToggl/master/navitoggl.tamper.js
// @version    0.1
// @description  imports toggl.com weekly hours into Naviwep
// @match      https://naviwep.steria.no/NaviWEB/timereg_direct.aspx
// @copyright  2014+, Erlend Vestad
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// ==/UserScript==

if ( !String.prototype.contains ) {
    String.prototype.contains = function() {
        return String.prototype.indexOf.apply( this, arguments ) !== -1;
    };
}

String.prototype.appearsIn = function() {
    return String.prototype.indexOf.apply( arguments[0], this ) !== -1;
};

function onPeriodChange(handler){
    $(".CurrentPeriod").on("DOMNodeInserted", function(e){
        if (e.target.id == "ctl00_ContentPlaceHolder1_LBL_Approved"){
            handler();
        }
    });
}

function initPage(){
    if ("/period_direct.aspx".appearsIn(document.location.pathname)){
        initPeriodDirectView();
    }
    
    getWeekFromToggl();
    togglButton = $("div#ctl00_ContentPlaceHolder1_DIV_SELECT_PERIOD").append('<button style="float: right; font-size:250%; width: 93px; height: 45px; padding: 5px 20px 5px 36px; border: none; outline:0; -webkit-border-top-left-radius: 50px; -webkit-border-bottom-left-radius: 50px; background: #333 url(https://new.toggl.com/app/images/abad730e.toggl-logo.png) 8px no-repeat;"></button>');
    togglButton.click(clickedTogglButton);
    
    $( "#togglLogin" ).submit(function( event ) {
        alert( "Handler for .submit() called." );
        event.preventDefault();
    });
}

function clickedTogglButton(event) {
    if (meny.isOpen()) {
        meny.close()   
    } else {
        meny.open();   
    }
    
    //authenticateTogglUser();
    event.preventDefault();
}

function initPeriodDirectView(){
    //onPeriodChange(getWeekFromToggl);
    //getWeekFromToggl();
}

function authenticateTogglUser() {
    if (GM_getValue("api_token", 0) === 0) { 
        //var username = new prompt("Toggl.com username (email)?");
        //var password = new prompt("Toggl.com password?");
        //var basicAuthUsernameAndPassword = "Basic " + btoa(username + ":" + password);
        var answer = prompt("Toggl.com api token?");
        GM_setValue("api_token", answer);
    }
    
    var apiToken = GM_getValue("api_token", 0);
    var basicAuth = "Basic " + btoa(apiToken + ":api_token");
    
    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://www.toggl.com/api/v8/me',
        headers: {"Authorization": basicAuth, 'Content-Type': 'application/json'},
        onload: function(response) {
            console.log(eval('(' + response.responseText + ')'));
        }
    });
}

function getWeekFromToggl() {
    var dates = getDateRange();
    var userAgent = 'erlendve@hotmail.com';
    var workspaceId = '485650';
    var startDate = dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6);
    console.log("startdate= " + dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6));
    console.log('https://toggl.com/reports/api/v2/weekly?user_agent=' + userAgent + '&workspace_id=' + workspaceId + '&since=' + startDate + '&grouping=users');
    
    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://toggl.com/reports/api/v2/weekly?user_agent=' + userAgent + '&workspace_id=' + workspaceId + '&since=' + startDate + '&grouping=users',
        headers: {"Authorization": "Basic NGM1Mzk1OTVlMjdjMDU1NmU0NmNkZTJhNGNkMDg2MTE6YXBpX3Rva2Vu", 'Content-Type': 'application/json'},
        onload: function(response) {
            //alert(response.responseText);
            console.log(eval('(' + response.responseText + ')'));
            result = eval('(' + response.responseText + ')');
            //console.log(result.data[0][1].details);
            details = result.data[0].details;
            
            for (var index in details) {
                var project = details[index];
                updateNaviwepField(project, dates);
            }
        }
    });
}

function getDateRange() {
    var days = $("a[title^='Date']" );
    var dates = new Array();   
    for (var i = 0; i < days.length; i++) {
        dates[i] = days[i].title.substring(6);
    }
    console.log(dates);
    return dates;
}

function updateNaviwepField(project, dates) {
    var projectName = project.title.project;
    var clientName = project.title.client;
    var hours = project.totals;
    var trInDom = $("tr:contains(" + projectName + ")").css('background-color', '#39b3d7');
    console.log('Updating ' + project.title.project + ' for ' + project.title.client + " " + trInDom.find('td').length);
    
    for (var i = 0; i < dates.length; i++) {
        if (!hours[i]) continue;
        var md = trInDom.find('input[id$="_RNTB_' + dates[i] + '"]');
        md.val((hours[i]/3600000).toFixed(2));
        md.width("100px");
    }
    //console.log(md);
}

initPage();

$("<style type='text/css'> .meny { display: none; padding: 20px;overflow: auto; background: #333; color: #eee; -webkit-box-sizing: border-box; -moz-box-sizing: border-box; box-sizing: border-box;} " + 
  ".meny ul {   margin-top: 10px; }' + '.meny ul li { display: inline-block; width: 200px; list-style: none; font-size: 20px; padding: 3px 10px; }" + 
  ".meny ul li:before { content: '-'; margin-right: 5px; color: rgba( 255, 255, 255, 0.2 ); }" +
  "a { color: #c2575b; text-decoration: none; -webkit-transition: 0.15s color ease; } a:hover { color: #f76f76; }" + "</style>").appendTo("head");

var menyHtml = '<div class="meny">' +
            '<h1>Log in to Toggl</h1>' +
            '<form id="togglLogin">' +
                '<label for="exampleInputEmail1">Email address</label>' +
                '<input type="email" class="form-control" id="togglmail" placeholder="Enter email">' +
                '<label for="exampleInputPassword1">Password</label>' +
                '<input type="password" class="form-control" id="togglpass" placeholder="Password"><br />' +
                '<button id="login" type="submit" class="btn btn-default">Submit</button>' +
            '</form>' +
        '</div>';
/*!
 * meny 1.4
 * http://lab.hakim.se/meny
 * MIT licensed
 *
 * Created by Hakim El Hattab (http://hakim.se, @hakimel)
 */
var Meny={create:function(options){return function(){if(!options||(!options.menuElement||!options.contentsElement))throw"You need to specify which menu and contents elements to use.";if(options.menuElement.parentNode!==options.contentsElement.parentNode)throw"The menu and contents elements must have the same parent.";var POSITION_T="top",POSITION_R="right",POSITION_B="bottom",POSITION_L="left";var supports3DTransforms="WebkitPerspective"in document.body.style||("MozPerspective"in document.body.style||
("msPerspective"in document.body.style||("OPerspective"in document.body.style||"perspective"in document.body.style)));var config={width:300,height:300,position:POSITION_L,threshold:40,overlap:6,transitionDuration:"0.5s",transitionEasing:"ease",mouse:true,touch:true};var dom={menu:options.menuElement,contents:options.contentsElement,wrapper:options.menuElement.parentNode,cover:null};var indentX=dom.wrapper.offsetLeft,indentY=dom.wrapper.offsetTop,touchStartX=null,touchStartY=null,touchMoveX=null,touchMoveY=
null,isOpen=false,isMouseDown=false;var menuTransformOrigin,menuTransformClosed,menuTransformOpened,menuStyleClosed,menuStyleOpened,contentsTransformOrigin,contentsTransformClosed,contentsTransformOpened,contentsStyleClosed,contentsStyleOpened;var originalStyles={},addedEventListeners=[];var menuAnimation,contentsAnimation,coverAnimation;configure(options);function configure(o){Meny.extend(config,o);setupPositions();setupWrapper();setupCover();setupMenu();setupContents();bindEvents()}function setupPositions(){menuTransformOpened=
"";contentsTransformClosed="";switch(config.position){case POSITION_T:menuTransformOrigin="50% 0%";menuTransformClosed="rotateX( 30deg ) translateY( -100% ) translateY( "+config.overlap+"px )";contentsTransformOrigin="50% 0";contentsTransformOpened="translateY( "+config.height+"px ) rotateX( -15deg )";menuStyleClosed={top:"-"+(config.height-config.overlap)+"px"};menuStyleOpened={top:"0px"};contentsStyleClosed={top:"0px"};contentsStyleOpened={top:config.height+"px"};break;case POSITION_R:menuTransformOrigin=
"100% 50%";menuTransformClosed="rotateY( 30deg ) translateX( 100% ) translateX( -2px ) scale( 1.01 )";contentsTransformOrigin="100% 50%";contentsTransformOpened="translateX( -"+config.width+"px ) rotateY( -15deg )";menuStyleClosed={right:"-"+(config.width-config.overlap)+"px"};menuStyleOpened={right:"0px"};contentsStyleClosed={left:"0px"};contentsStyleOpened={left:"-"+config.width+"px"};break;case POSITION_B:menuTransformOrigin="50% 100%";menuTransformClosed="rotateX( -30deg ) translateY( 100% ) translateY( -"+
config.overlap+"px )";contentsTransformOrigin="50% 100%";contentsTransformOpened="translateY( -"+config.height+"px ) rotateX( 15deg )";menuStyleClosed={bottom:"-"+(config.height-config.overlap)+"px"};menuStyleOpened={bottom:"0px"};contentsStyleClosed={top:"0px"};contentsStyleOpened={top:"-"+config.height+"px"};break;default:menuTransformOrigin="100% 50%";menuTransformClosed="translateX( -100% ) translateX( "+config.overlap+"px ) scale( 1.01 ) rotateY( -30deg )";contentsTransformOrigin="0 50%";contentsTransformOpened=
"translateX( "+config.width+"px ) rotateY( 15deg )";menuStyleClosed={left:"-"+(config.width-config.overlap)+"px"};menuStyleOpened={left:"0px"};contentsStyleClosed={left:"0px"};contentsStyleOpened={left:config.width+"px"};break}}function setupWrapper(){Meny.addClass(dom.wrapper,"meny-"+config.position);originalStyles.wrapper=dom.wrapper.style.cssText;dom.wrapper.style[Meny.prefix("perspective")]="800px";dom.wrapper.style[Meny.prefix("perspectiveOrigin")]=contentsTransformOrigin}function setupCover(){if(dom.cover)dom.cover.parentNode.removeChild(dom.cover);
dom.cover=document.createElement("div");dom.cover.style.position="absolute";dom.cover.style.display="block";dom.cover.style.width="100%";dom.cover.style.height="100%";dom.cover.style.left=0;dom.cover.style.top=0;dom.cover.style.zIndex=1E3;dom.cover.style.visibility="hidden";dom.cover.style.opacity=0;try{dom.cover.style.background="rgba( 0, 0, 0, 0.4 )";dom.cover.style.background="-ms-linear-gradient("+config.position+", rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.65) 100%)";dom.cover.style.background="-moz-linear-gradient("+
config.position+", rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.65) 100%)";dom.cover.style.background="-webkit-linear-gradient("+config.position+", rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.65) 100%)"}catch(e){}if(supports3DTransforms)dom.cover.style[Meny.prefix("transition")]="all "+config.transitionDuration+" "+config.transitionEasing;dom.contents.appendChild(dom.cover)}function setupMenu(){var style=dom.menu.style;switch(config.position){case POSITION_T:style.width="100%";style.height=config.height+"px";break;case POSITION_R:style.right=
"0";style.width=config.width+"px";style.height="100%";break;case POSITION_B:style.bottom="0";style.width="100%";style.height=config.height+"px";break;case POSITION_L:style.width=config.width+"px";style.height="100%";break}originalStyles.menu=style.cssText;style.position="fixed";style.display="block";style.zIndex=1;if(supports3DTransforms){style[Meny.prefix("transform")]=menuTransformClosed;style[Meny.prefix("transformOrigin")]=menuTransformOrigin;style[Meny.prefix("transition")]="all "+config.transitionDuration+
" "+config.transitionEasing}else Meny.extend(style,menuStyleClosed)}function setupContents(){var style=dom.contents.style;originalStyles.contents=style.cssText;if(supports3DTransforms){style[Meny.prefix("transform")]=contentsTransformClosed;style[Meny.prefix("transformOrigin")]=contentsTransformOrigin;style[Meny.prefix("transition")]="all "+config.transitionDuration+" "+config.transitionEasing}else{style.position=style.position.match(/relative|absolute|fixed/gi)?style.position:"relative";Meny.extend(style,
contentsStyleClosed)}}function bindEvents(){if("ontouchstart"in window)if(config.touch){Meny.bindEvent(document,"touchstart",onTouchStart);Meny.bindEvent(document,"touchend",onTouchEnd)}else{Meny.unbindEvent(document,"touchstart",onTouchStart);Meny.unbindEvent(document,"touchend",onTouchEnd)}if(config.mouse){Meny.bindEvent(document,"mousedown",onMouseDown);Meny.bindEvent(document,"mouseup",onMouseUp);Meny.bindEvent(document,"mousemove",onMouseMove)}else{Meny.unbindEvent(document,"mousedown",onMouseDown);
Meny.unbindEvent(document,"mouseup",onMouseUp);Meny.unbindEvent(document,"mousemove",onMouseMove)}}function open(){if(!isOpen){isOpen=true;Meny.addClass(dom.wrapper,"meny-active");dom.cover.style.height=dom.contents.scrollHeight+"px";dom.cover.style.visibility="visible";if(supports3DTransforms){Meny.bindEventOnce(dom.wrapper,"transitionend",function(){Meny.dispatchEvent(dom.menu,"opened")});dom.cover.style.opacity=1;dom.contents.style[Meny.prefix("transform")]=contentsTransformOpened;dom.menu.style[Meny.prefix("transform")]=
menuTransformOpened}else{menuAnimation&&menuAnimation.stop();menuAnimation=Meny.animate(dom.menu,menuStyleOpened,500);contentsAnimation&&contentsAnimation.stop();contentsAnimation=Meny.animate(dom.contents,contentsStyleOpened,500);coverAnimation&&coverAnimation.stop();coverAnimation=Meny.animate(dom.cover,{opacity:1},500)}Meny.dispatchEvent(dom.menu,"open")}}function close(){if(isOpen){isOpen=false;Meny.removeClass(dom.wrapper,"meny-active");if(supports3DTransforms){Meny.bindEventOnce(dom.wrapper,
"transitionend",function(){Meny.dispatchEvent(dom.menu,"closed")});dom.cover.style.visibility="hidden";dom.cover.style.opacity=0;dom.contents.style[Meny.prefix("transform")]=contentsTransformClosed;dom.menu.style[Meny.prefix("transform")]=menuTransformClosed}else{menuAnimation&&menuAnimation.stop();menuAnimation=Meny.animate(dom.menu,menuStyleClosed,500);contentsAnimation&&contentsAnimation.stop();contentsAnimation=Meny.animate(dom.contents,contentsStyleClosed,500);coverAnimation&&coverAnimation.stop();
coverAnimation=Meny.animate(dom.cover,{opacity:0},500,function(){dom.cover.style.visibility="hidden";Meny.dispatchEvent(dom.menu,"closed")})}Meny.dispatchEvent(dom.menu,"close")}}function destroy(){dom.wrapper.style.cssText=originalStyles.wrapper;dom.menu.style.cssText=originalStyles.menu;dom.contents.style.cssText=originalStyles.contents;if(dom.cover&&dom.cover.parentNode)dom.cover.parentNode.removeChild(dom.cover);Meny.unbindEvent(document,"touchstart",onTouchStart);Meny.unbindEvent(document,"touchend",
onTouchEnd);Meny.unbindEvent(document,"mousedown",onMouseDown);Meny.unbindEvent(document,"mouseup",onMouseUp);Meny.unbindEvent(document,"mousemove",onMouseMove);for(var i in addedEventListeners)this.removeEventListener(addedEventListeners[i][0],addedEventListeners[i][1]);addedEventListeners=[]}function onMouseDown(event){isMouseDown=true}function onMouseMove(event){if(!isMouseDown){var x=event.clientX-indentX,y=event.clientY-indentY;switch(config.position){case POSITION_T:if(y>config.height)close();
else if(y<config.threshold)open();break;case POSITION_R:var w=dom.wrapper.offsetWidth;if(x<w-config.width)close();else if(x>w-config.threshold)open();break;case POSITION_B:var h=dom.wrapper.offsetHeight;if(y<h-config.height)close();else if(y>h-config.threshold)open();break;case POSITION_L:if(x>config.width)close();else if(x<config.threshold)open();break}}}function onMouseUp(event){isMouseDown=false}function onTouchStart(event){touchStartX=event.touches[0].clientX-indentX;touchStartY=event.touches[0].clientY-
indentY;touchMoveX=null;touchMoveY=null;Meny.bindEvent(document,"touchmove",onTouchMove)}function onTouchMove(event){touchMoveX=event.touches[0].clientX-indentX;touchMoveY=event.touches[0].clientY-indentY;var swipeMethod=null;if(Math.abs(touchMoveX-touchStartX)>Math.abs(touchMoveY-touchStartY))if(touchMoveX<touchStartX-config.threshold)swipeMethod=onSwipeRight;else{if(touchMoveX>touchStartX+config.threshold)swipeMethod=onSwipeLeft}else if(touchMoveY<touchStartY-config.threshold)swipeMethod=onSwipeDown;
else if(touchMoveY>touchStartY+config.threshold)swipeMethod=onSwipeUp;if(swipeMethod&&swipeMethod())event.preventDefault()}function onTouchEnd(event){Meny.unbindEvent(document,"touchmove",onTouchMove);if(touchMoveX===null&&touchMoveY===null)onTap()}function onTap(){var isOverContent=config.position===POSITION_T&&touchStartY>config.height||(config.position===POSITION_R&&touchStartX<dom.wrapper.offsetWidth-config.width||(config.position===POSITION_B&&touchStartY<dom.wrapper.offsetHeight-config.height||
config.position===POSITION_L&&touchStartX>config.width));if(isOverContent)close()}function onSwipeLeft(){if(config.position===POSITION_R&&isOpen){close();return true}else if(config.position===POSITION_L&&!isOpen){open();return true}}function onSwipeRight(){if(config.position===POSITION_R&&!isOpen){open();return true}else if(config.position===POSITION_L&&isOpen){close();return true}}function onSwipeUp(){if(config.position===POSITION_B&&isOpen){close();return true}else if(config.position===POSITION_T&&
!isOpen){open();return true}}function onSwipeDown(){if(config.position===POSITION_B&&!isOpen){open();return true}else if(config.position===POSITION_T&&isOpen){close();return true}}return{configure:configure,open:open,close:close,destroy:destroy,isOpen:function(){return isOpen},addEventListener:function(type,listener){addedEventListeners.push([type,listener]);dom.menu&&Meny.bindEvent(dom.menu,type,listener)},removeEventListener:function(type,listener){dom.menu&&Meny.unbindEvent(dom.menu,type,listener)}}}()},
animate:function(element,properties,duration,callback){return function(){var interpolations={};for(var p in properties)interpolations[p]={start:parseFloat(element.style[p])||0,end:parseFloat(properties[p]),unit:typeof properties[p]==="string"&&properties[p].match(/px|em|%/gi)?properties[p].match(/px|em|%/gi)[0]:""};var animationStartTime=Date.now(),animationTimeout;function step(){var progress=1-Math.pow(1-(Date.now()-animationStartTime)/duration,5);for(var p in interpolations){var property=interpolations[p];
element.style[p]=property.start+(property.end-property.start)*progress+property.unit}if(progress<1)animationTimeout=setTimeout(step,1E3/60);else{callback&&callback();stop()}}function stop(){clearTimeout(animationTimeout)}step();return{stop:stop}}()},extend:function(a,b){for(var i in b)a[i]=b[i]},prefix:function(property,el){var propertyUC=property.slice(0,1).toUpperCase()+property.slice(1),vendors=["Webkit","Moz","O","ms"];for(var i=0,len=vendors.length;i<len;i++){var vendor=vendors[i];if(typeof(el||
document.body).style[vendor+propertyUC]!=="undefined")return vendor+propertyUC}return property},addClass:function(element,name){element.className=element.className.replace(/\s+$/gi,"")+" "+name},removeClass:function(element,name){element.className=element.className.replace(name,"")},bindEvent:function(element,ev,fn){if(element.addEventListener)element.addEventListener(ev,fn,false);else element.attachEvent("on"+ev,fn)},unbindEvent:function(element,ev,fn){if(element.removeEventListener)element.removeEventListener(ev,
fn,false);else element.detachEvent("on"+ev,fn)},bindEventOnce:function(element,ev,fn){var me=this;var listener=function(){me.unbindEvent(element,ev,listener);fn.apply(this,arguments)};this.bindEvent(element,ev,listener)},dispatchEvent:function(element,type,properties){if(element){var event=document.createEvent("HTMLEvents",1,2);event.initEvent(type,true,true);Meny.extend(event,properties);element.dispatchEvent(event)}},getQuery:function(){var query={};location.search.replace(/[A-Z0-9]+?=([\w|:|\/\.]*)/gi,
function(a){query[a.split("=").shift()]=a.split("=").pop()});return query}};if(typeof Date.now!=="function")Date.now=function(){return(new Date).getTime()};

//$('head').prepend(menyCss);
$('.form_style').prepend(menyHtml);

var meny = Meny.create({
    // The element that will be animated in from off screen
    menuElement: document.querySelector( '.meny' ),

    // The contents that gets pushed aside while Meny is active
    contentsElement: document.querySelector( '#contentDiv' ),

    // The alignment of the menu (top/right/bottom/left)
    position: 'right',

    // The height of the menu (when using top/bottom position)
    height: 200,

    // The width of the menu (when using left/right position)
    width: 260,

    // The mouse distance from menu position which can trigger menu to open.
    threshold: 40,

    // Width(in px) of the thin line you see on screen when menu is in closed position.
    overlap: 50,

    // The total time taken by menu animation.
    transitionDuration: '0.5s',

    // Transition style for menu animations
    transitionEasing: 'ease',

    // Use mouse movement to automatically open/close
    mouse: false,

    // Use touch swipe events to open/close
    touch: true
});

//$('#contentDiv').click(function() {if (!meny.isOpen())meny.close();});
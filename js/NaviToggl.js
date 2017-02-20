function getProjectRows() {
    return document.querySelectorAll("tr.rgRow, tr.rgAltRow");
}
(function () {
	if (!String.prototype.contains) {
		String.prototype.contains = function() {
			return String.prototype.indexOf.apply( this, arguments ) !== -1;
		};
	}

	String.prototype.appearsIn = function() {
		return String.prototype.indexOf.apply( arguments[0], this ) !== -1;
	};

	if (!String.prototype.format) {
		String.prototype.format = function() {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function(match, number) {
				return typeof args[number] != 'undefined'
				? args[number]
				: match
				;
			});
		};
	}

	function onPeriodChange(handler){
		$(".CurrentPeriod").on("DOMNodeInserted", function(e){
			if (e.target.id == "ctl00_ContentPlaceHolder1_LBL_Approved"){
				handler();
			}
		});
	}

	function multiLineString(f) {
		return f.toString().
		replace(/^[^\/]+\/\*!?/, '').
		replace(/\*\/[^\/]+$/, '');
	}

	var menuObject = function() {
		var isOpen = false;

		return {
			isOpen: function() {
				return isOpen;
			},
			open: function() {
				var button = document.querySelector("#togglButton");
				button.style.transition = "right 0.2s";
				button.style.right = "210px";
				var menuElement = document.querySelector(".menu");
				menuElement.style.display = "block";
				menuElement.style.transition = "right 0.2s";
				menuElement.style.right = "0px";
				menuElement.style.boxShadow = "0 0 5px 5px rgba(0,0,0,0.5)";
				isOpen = true;
			},
			close: function() {
				var button = document.querySelector("#togglButton");
				button.style.transition = "right 0.2s";
				button.style.right = "0px";
				var menuElement = document.querySelector(".menu");
				menuElement.style.transition = "right 0.2s";
				menuElement.style.right = "-270px";
				setTimeout(function(){ menuElement.style.display = "none";}, 200);
				menuElement.style.boxShadow = "0 0 0 0 rgba(0,0,0,0.5)";

				isOpen = false;
			},
			init: function() {
				var apiToken = userdata.apiToken();
				if (apiToken === null) {
					menuObject.showLogin();
					return false;
				} else {
					toggl.loadUserData();
				}
			},
			showLogin: function() {
				var loginForm = document.querySelector("#loginSection");
				loginForm.style.display = "block";

				var userSection = document.querySelector("#togglUserSection");
				userSection.style.display = "none";
			},
			showUser: function(email, name) {
				var loginForm = document.querySelector("#loginSection");
				loginForm.style.display = "none";

				var userSection = document.querySelector("#togglUserSection");
				userSection.style.display = "block";
				document.querySelector("#togglUserMail").innerText = email;
				document.querySelector("#togglFullName").innerText = name;
			}
		};
	}();

	var toggl = function() {
		var isAuthenticated = false;

		var addProject = function(projectName, clientId) {
			console.log("add " + projectName + ' to toggl');
			var newProjectData = '{"project":{"name":"{0}","wid":{1},"cid":{2}}}'.format(projectName, userdata.workspaceId(), clientId);
			console.log(newProjectData);
			headers: toggl.createAuthenticationHeader()
			GM_xmlhttpRequest({
				method: "POST",
				url: 'https://www.toggl.com/api/v8/projects',
				data: newProjectData,
				onload: function(response) {
					if (response.status === 200 && response.readyState === 4) {
						console.log(projectName + " added to Toggl.com");
						naviwep.hideAddToTogglButton(projectName, "blue");
					} else {
						console.log(response);
						console.log(clientName + "was not added to Toggl.com")
					}
				}
			});
		}

		return {
			loginUser: function(username, password) {
				if (username == "" || password == "") {
					alert("please fill in username and password");
					return false;
				}

				var basicAuthUsernameAndPassword = "Basic " + btoa(username + ":" + password);

				GM_xmlhttpRequest({
					method: "GET",
					url: 'https://www.toggl.com/api/v8/me',
					headers: {"Authorization": basicAuthUsernameAndPassword, 'Content-Type': 'application/json'},
					onload: function(response) {
						if (response.status === 200 && response.readyState === 4) {
							var data = JSON.parse(response.responseText).data;
							userdata.apiToken(data.api_token);
							toggl.loadUserData();
						} else {
							alert("Login to toggl.com failed. StatusCode: " + response.status + "\n" +
								"StatusText: " + response.statusText);
							isAuthenticated = false;
						}
					}
				});
			},
			isAuthenticated: function() {
				return isAuthenticated;
			},
			createAuthenticationHeader: function() {
				var basicAuthUsernameAndPassword = "Basic " + btoa(userdata.apiToken() + ":api_token");
				return {"Authorization": basicAuthUsernameAndPassword, 'Content-Type': 'application/json'};
			},
			loadUserData: function() {
				GM_xmlhttpRequest({
					method: "GET",
					url: 'https://www.toggl.com/api/v8/me',
					headers: this.createAuthenticationHeader(),
					onload: function(response) {
						if (response.status === 200 && response.readyState === 4) {
							isAuthenticated = true;
							var data = JSON.parse(response.responseText).data;
							userdata.workspaceId(data.default_wid);
							userdata.email(data.email);
							menuObject.showUser(data.email, data.fullname);
							toggl.getWeekFromToggl();
							toggl.getWorkspaceClients(data.default_wid);
							toggl.getWorkspaceProjects(data.default_wid);
						} else {
							menuObject.showLogin();
							console.log("Ooops, user does not authenticate");
							isAuthenticated = false;
						}
					}
				})
			},
			getWeekFromToggl: function () {
				var dates = naviwep.getDateRange();
				var userAgent = userdata.email();
				var workspaceId = userdata.workspaceId();
				var startDate = dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6);
				GM_xmlhttpRequest({
					method: "GET",
					url: 'https://toggl.com/reports/api/v2/weekly?user_agent=' + userAgent + '&workspace_id=' + workspaceId + '&since=' + startDate + '&grouping=users',
					headers: toggl.createAuthenticationHeader(),
					onload: function(response) {
						var data = JSON.parse(response.responseText).data;
						details = data[0].details;
						for (var index in details) {
							var project = details[index];
							naviwep.updateNaviwepField(project, dates);
						}
					}
				});
			},
			getWorkspaceProjects : function(wid) {
				GM_xmlhttpRequest({
					method: "GET",
					url: 'https://www.toggl.com/api/v8/workspaces/' + wid + '/projects',
					headers: toggl.createAuthenticationHeader(),
					onload: function(response) {
						var data = JSON.parse(response.responseText);
						userdata.projects(data);
						for (var i = data.length - 1; i >= 0; i--) {
							naviwep.hideAddToTogglButton(data[i].name, data[i].color);
						};
					}
				});
			},
			getWorkspaceClients : function(wid) {
				GM_xmlhttpRequest({
					method: "GET",
					url: 'https://www.toggl.com/api/v8/workspaces/' + wid + '/clients',
					headers: toggl.createAuthenticationHeader(),
					onload: function(response) {
						var data = JSON.parse(response.responseText);
						userdata.clients(data);
					}
				});
			},
			addToToggl: function(client, project) {
				console.log("Trying to add " + client + ": " + project + " to toggl");
				var clients = userdata.clients();
				var clientData;
				for (var i = clients.length - 1; i >= 0; i--) {
					if (clients[i].name == client) {
						clientData = clients[i];
					}
				};

				if(clientData == null) {
					console.log("client not found");
					toggl.addClient(client, project, addProject);
				} else {
					addProject(project, clientData.id);
				}
			},
			addClient: function(clientName, projectName, success) {
				GM_xmlhttpRequest({
					method: "POST",
					url: 'https://www.toggl.com/api/v8/clients',
					data: '{"client":{"name":"' + clientName + '", "wid":'+ userdata.workspaceId() + '}}',
					headers: toggl.createAuthenticationHeader(),
					onload: function(response) {
						if (response.status === 200 && response.readyState === 4) {
							console.log(clientName + " added to Toggl.com");
							var data = JSON.parse(response.responseText).data;
							success(projectName, data.id);
						} else {
							console.log(clientName + "was not added to Toggl.com")
						}
					}
				});
			}
		};
	}();

	var userdata = function() {
		var clients, projects;

		return {
			apiToken: function(newToken)
			{
				if (newToken == null) {
					return localStorage.getItem("togglApiToken");
				} else {
					localStorage.setItem("togglApiToken", newToken);
				}
			},
			premium: function() {
				return true;
			},
			workspaceId: function (id)
			{
				if (id == null) {
					return localStorage.getItem("workspaceId");
				} else {
					localStorage.setItem("workspaceId", id);
				}
			},
			email: function (address)
			{
				if (address == null) {
					return localStorage.getItem("togglEmail");
				} else {
					localStorage.setItem("togglEmail", address);
				}
			},
			clients: function(json)
			{
				if (clients == null)
					clients = json;
				else
					return clients;
			},
			projects: function(json) {
				if (projects == null)
					projects = json;
				else
					return projects;
			}
		};
	}();

	var htmlHelper = function () {
		var append = function(appendTo, newElement) {
			if (appendTo === null || newElement === null) {
				console.log("one of the elements to the append function is null");
				return;
			}

			appendTo.appendChild(newElement);
			return newElement;
		};

		var addCssToHead = function (css) {
			var style = document.createElement('style');
			style.type = 'text/css';
			style.innerHTML = css;
			document.getElementsByTagName('head')[0].appendChild(style);
		};

		var clickedMenuButton = function() {
			if (menuObject.isOpen()) {
				menuObject.close();
			} else {
				menuObject.open();
			}
			return false;
		};

		var clickedTogglButton = function() {
			toggl.getWeekFromToggl();
		}

		return {
			createDrawerHtml: function()
			{
				var container = document.createElement("div");
				container.setAttribute("class", "pure-container");
				container.setAttribute("data-effect", "pure-effect-slide");
				container.innerHTML = '<input type="checkbox" id="pure-toggle-right" class="pure-toggle" data-toggle="right"></label> <div class="pure-drawer" data-position="right"></div> <div class="pure-pusher-container"> <div class="pure-pusher"></div> </div> <label class="pure-overlay" for="pure-toggle-right" data-overlay="right"></label>';
				append(document.body, container);

				var label = document.createElement("label");
				label.setAttribute("class", "pure-toggle-label");
				label.setAttribute("for", "pure-toggle-right");
				label.setAttribute("data-toggle", "right");
				label.innerHTML = '<span class="pure-toggle-icon"></span>';
				append(document.getElementById("ctl00_ContentPlaceHolder1_DIV_SELECT_PERIOD"), label);

				var form = document.body.removeChild(document.getElementById("aspnetForm"));
				append(document.body.querySelector(".pure-pusher"), form);

				var externalCss = document.createElement('link');
				externalCss.rel = 'stylesheet';
				externalCss.type = "text/css";
				externalCss.href = "https://raw.githubusercontent.com/mac81/pure-drawer/master/src/css/pure-drawer.css";
				document.getElementsByTagName('head')[0].appendChild(externalCss);
			},
			createMenuHtml: function () {
				var menu = document.createElement("div");
				menu.setAttribute("class" , "menu");
				menu.innerHTML = multiLineString(function() {
				/*
					<br />
					<br />
					<br />
					<br />
					<section id="loginSection" style="display: none">
					<p>Log in with your toggl.com user:</p>
						<form id="togglLogin" method="POST">
						<table><tr>
						<td><label for="exampleInputEmail1">Email address</label></td>
						<td><input type="email" class="form-control" id="togglmail" placeholder="Enter email" name="togglMail"></td>
						<tr><td><label for="exampleInputPassword1">Password</label></td>
						<td><input type="password" class="form-control" id="togglpass" placeholder="Password" name="togglPass"></td></tr>
						<br />
						<tr></tr>
						<tr><td><button id="login" type="submit" class="btn btn-default">Submit</button></td></tr>
						</form>
						</table>
					</section>
					<section id="togglUserSection">
					<p>You are logged in to toggl.com as:</p>
					<p id="togglUserMail"></p>
					<p id="togglFullName"></p>
					</section>
					*/
				});

				append(document.querySelector(".pure-drawer"), menu);

				function submitLoginForm(event) {
					event.preventDefault();
					var username = document.querySelector('#togglmail');
					var password = document.querySelector('#togglpass');
					toggl.loginUser(username.value, password.value);
					return false;
				};

				var form = document.getElementById('togglLogin');
				if (form.attachEvent) {
					form.attachEvent("submit", submitLoginForm);
				} else {
					form.addEventListener("submit", submitLoginForm);
				}

				return menu;
			},
			createAddProjectButtonHtml: function()
			{
				var getNewAddButton = function (rowElement) {
					var newButton = document.createElement("button");
					newButton.type = "newButton";
					newButton.innerText = "Add";
					newButton.style.color = "whiteSmoke";
					newButton.style.border = "1px solid rgb(255, 255, 255)";
					newButton.style.borderRadius = "3px";
					newButton.style.borderColor = "#333";
					newButton.style.background = "#333";
					newButton.onclick = function(e) {
						var clientText = rowElement.children[0].innerText;
						var projectText = rowElement.children[2].innerText + " -- " + rowElement.children[4].innerText;
						toggl.addToToggl(clientText, projectText);
						return false;
					}

					var newElem = document.createElement("span");
					newElem.setAttribute("class", "projectColorSpan");
					append(tr[i].children[5], newElem);

					return newButton;
				}

				var tr = getProjectRows()
				for (var i = tr.length - 1; i >= 0; i--) {
					append(tr[i].children[5], getNewAddButton(tr[i]));
				};

				var spanCss = multiLineString(function() {/*
					.projectColorSpan {
					    background-position: 50% 50%;
					    bottom: 0px;
					    box-sizing: border-box;
					    color: rgb(34, 34, 34);
					    cursor: pointer;
					    display: none;
					    height: 25px;
					    left: 0px;
					    position: relative;
					    right: 0px;
					    top: 0px;
					    width: 25px;
					    align-self: stretch;
					    perspective-origin: 12.5px 12.5px;
					    transform-origin: 12.5px 12.5px;
					    background: rgb(188, 133, 230) none no-repeat scroll 50% 50% / auto padding-box border-box;
					    border: 1px solid rgb(255, 255, 255);
					    border-radius: 3px 3px 3px 3px;
					    font: normal normal normal normal 12px/normal 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif;
					    outline: rgb(34, 34, 34) none 0px;
					    transition: border-color 0.1s ease 0s;
					}
					*/});

					addCssToHead(spanCss);
			},
			colorMeRad: function(row, color) {
				row.style.transition = "background 0.8s";
				row.style.background = color;

				var c = color.substring(1);      // strip #
				var rgb = parseInt(c, 16);   // convert rrggbb to decimal
				var r = (rgb >> 16) & 0xff;  // extract red
				var g = (rgb >>  8) & 0xff;  // extract green
				var b = (rgb >>  0) & 0xff;  // extract blue

				var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
				// console.log(row.innerText + " LUMA: " + luma);

				if (luma < 100) {
					row.style.color = "#F5F5F5";
				}
			}
		};
	}();

	var naviwep = function () {
		var togglColors = new Array();
		togglColors[0] = '#4dc3ff';
		togglColors[1] = '#bc85e6';
		togglColors[2] = '#df7baa';
		togglColors[3] = '#f68d38';
		togglColors[4] = '#b27636';
		togglColors[5] = '#8ab734';
		togglColors[6] = '#14a88e';
		togglColors[7] = '#268bb5';
		togglColors[8] = '#6668b4';
		togglColors[9] = '#a4506c';
		togglColors[10] = '#67412c';
		togglColors[11] = '#3c6526';
		togglColors[12] = '#094558';
		togglColors[13] = '#bc2d07';
		togglColors[14] = '#999999';

		return {
			getDateRange: function () {
				var days = document.querySelectorAll("a[title^='Date']");
				var dates = new Array();
				for (var i = 0; i < days.length; i++) {
					dates[i] = days[i].getAttribute("title").substring(6);
				}
				return dates;
			},
			updateNaviwepField: function (project, dates) {
				var projectName = project.title.project;
				var clientName = project.title.client;
				var hours = project.totals;
				var tr = getProjectRows();
				var projectRowIndex = -1;
				for (var i = tr.length - 1; i >= 0; i--) {
					var projectText = tr[i].children[2].innerText + " -- " + tr[i].children[4].innerText;
					if (projectText == projectName) {
						projectRowIndex = i;
					}
				};
				var trInDom = tr[projectRowIndex];
				if(trInDom == null) {
					console.log("can not find project with name " + projectName + " in naviwep");
					return;
				}

				if (userdata.premium()) {
					htmlHelper.colorMeRad(trInDom, project.title.hex_color);
				} else {
					trInDom.style.background = '#39b3d7';
				}

				for (var i = 0; i < dates.length; i++) {
					if (!hours[i]) continue;
					var md = trInDom.querySelector('input[id$="_RNTB_' + dates[i] + '"]');
					md.value = (hours[i]/3600000).toFixed(2);
				}
			},
			hideAddToTogglButton: function(projectName, colorCode) {
				var tr = getProjectRows();
				for (var i = tr.length - 1; i >= 0; i--) {
					var projectText = tr[i].children[2].innerText + " -- " + tr[i].children[4].innerText;
					if (projectName == projectText) {
						tr[i].children[5].lastChild.style.display = "none";
						tr[i].children[5].firstChild.style.display = "block";
						tr[i].children[5].firstChild.style.backgroundColor = togglColors[colorCode];
					}
				};
			}
		};
	}();

	function initPage(){
		if ("/period_direct.aspx".appearsIn(document.location.pathname)){
			initPeriodDirectView();
		}

		htmlHelper.createDrawerHtml();
		htmlHelper.createMenuHtml();
		htmlHelper.createAddProjectButtonHtml();
		menuObject.init();

		var drawerCss = multiLineString(function() {
			/*
			html, body {
			  height: 100%; }

			.pure-container {
			  position: relative;
			  height: 100%;
			  -webkit-overflow-scrolling: touch; }

			.pure-toggle {
			  left: -9999px;
			  position: absolute;
			  top: -9999px; }
			  .pure-toggle:focus ~ .pure-toggle-label {
			    border-color: #1fc08e;
			    color: #1fc08e; }

			.pure-toggle-label {
			  display: none;
			  cursor: pointer;
			  display: block;
			  position: absolute;
			  top: 30px;
			  right: 10px;
			  z-index: 99;
			  color: #5d809d;
			  width: 70px;
			  height: 70px;
			  transition: all 400ms ease-in-out;
			  border: 2px solid #5d809d;
			  border-radius: 50%;
			  -webkit-user-select: none;
			  -moz-user-select: none;
			  -ms-user-select: none;
			  -o-user-select: none;
			  user-select: none;
			  -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }
			  .pure-toggle-label:hover {
			    border-color: #1fc08e;
			    color: #1fc08e; }
			    .pure-toggle-label:hover .pure-toggle-icon, .pure-toggle-label:hover .pure-toggle-icon:before, .pure-toggle-label:hover .pure-toggle-icon:after {
			      background-color: #1fc08e; }
			  .pure-toggle-label:active {
			    -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }
			  .pure-toggle-label .pure-toggle-icon, .pure-toggle-label .pure-toggle-icon:before, .pure-toggle-label .pure-toggle-icon:after {
			    position: absolute;
			    top: 50%;
			    left: 50%;
			    height: 4px;
			    width: 35px;
			    cursor: pointer;
			    background: #5d809d;
			    display: block;
			    content: '';
			    transition: all 500ms ease-in-out; }
			  .pure-toggle-label .pure-toggle-icon {
			    transform: translate3d(-50%, -4px, 0);
			    -webkit-transform: translate3d(-50%, -4px, 0); }
			  .pure-toggle-label .pure-toggle-icon:before {
			    transform: translate3d(-50%, -14px, 0);
			    -webkit-transform: translate3d(-50%, -14px, 0); }
			  .pure-toggle-label .pure-toggle-icon:after {
			    transform: translate3d(-50%, 10px, 0);
			    -webkit-transform: translate3d(-50%, 10px, 0); }

			.pure-toggle-label[data-toggle-label='left'] {
			  left: 15px;
			  right: auto; }

			.pure-toggle-label[data-toggle-label='right'] {
			  right: 28px;
			  left: auto; }

			.pure-toggle-label[data-toggle-label='top'] {
			  left: 50%;
			  -webkit-transform: translate3d(-50%, 0, 0);
			  transform: translate3d(-50%, 0, 0); }

			.pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label:not([data-toggle-label='left']), .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label:not([data-toggle-label='right']), .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label:not([data-toggle-label='top']) {
			  opacity: 0;
			  z-index: -1; }

			.pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'], .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'], .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] {
			  border-color: #1fc08e;
			  color: #1fc08e; }
			  .pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'] .pure-toggle-icon, .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'] .pure-toggle-icon, .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] .pure-toggle-icon {
			    background-color: transparent; }
			  .pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'] .pure-toggle-icon:before, .pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'] .pure-toggle-icon:after, .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'] .pure-toggle-icon:before, .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'] .pure-toggle-icon:after, .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] .pure-toggle-icon:before, .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] .pure-toggle-icon:after {
			    top: 0; }
			  .pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'] .pure-toggle-icon:before, .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'] .pure-toggle-icon:before, .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] .pure-toggle-icon:before {
			    transform: translateX(-50%) rotate(45deg);
			    -webkit-transform: translateX(-50%) rotate(45deg); }
			  .pure-toggle[data-toggle='left']:checked ~ .pure-toggle-label[data-toggle-label='left'] .pure-toggle-icon:after, .pure-toggle[data-toggle='right']:checked ~ .pure-toggle-label[data-toggle-label='right'] .pure-toggle-icon:after, .pure-toggle[data-toggle='top']:checked ~ .pure-toggle-label[data-toggle-label='top'] .pure-toggle-icon:after {
			    transform: translateX(-50%) translateY(-10px) rotate(-45deg);
			    -webkit-transform: translateX(-50%) translateY(-10px) rotate(-45deg);
			    top: 10px; }

			.pure-drawer {
			  position: fixed;
			  top: 0;
			  left: 0;
			  z-index: 1;
			  height: 100%;
			  visibility: hidden;
			  background-color: #374c5d;
			  transition-property: all;
			  transition-duration: 500ms;
			  transition-timing-function: ease-out;
			  width: 100%; }
			  @media only screen and (min-width:40.063em) {
			    .pure-drawer {
			      width: 300px; } }
			  @media only screen and (min-width:64.063em) {
			    .pure-drawer {
			      width: 300px; } }

			.pure-drawer[data-position='right'] {
			  left: auto;
			  right: 0; }

			.pure-drawer[data-position='top'] {
			  height: 100%;
			  width: 100%; }
			  @media only screen and (min-width:40.063em) {
			    .pure-drawer[data-position='top'] {
			      height: 100%; } }
			  @media only screen and (min-width:64.063em) {
			    .pure-drawer[data-position='top'] {
			      height: 100px; } }

			.pure-pusher-container {
			  position: relative;
			  height: 100%;
			  overflow: hidden; }

			.pure-pusher {
			  position: relative;
			  height: 100%;
			  overflow-y: auto;
			  left: 0;
			  z-index: 2;
			  background-color: #fff;
			  transition-property: transform;
			  transition-duration: 500ms;
			  transition-timing-function: ease-out; }

			.pure-overlay {
			  position: fixed;
			  top: 0;
			  bottom: 0;
			  right: 0;
			  width: 0;
			  height: 0;
			  opacity: 0;
			  background-color: rgba(0, 0, 0, 0.4);
			  transition-property: opacity;
			  transition-duration: 500ms;
			  transition-delay: 500ms;
			  transition-timing-function: ease-in-out; }

			.pure-toggle[data-toggle='left']:checked ~ .pure-overlay[data-overlay='left'] {
			  left: 100%; }
			  @media only screen and (min-width:40.063em) {
			    .pure-toggle[data-toggle='left']:checked ~ .pure-overlay[data-overlay='left'] {
			      left: 300px; } }
			  @media only screen and (min-width:64.063em) {
			    .pure-toggle[data-toggle='left']:checked ~ .pure-overlay[data-overlay='left'] {
			      left: 300px; } }

			.pure-toggle[data-toggle='right']:checked ~ .pure-overlay[data-overlay='right'] {
			  right: 100%; }
			  @media only screen and (min-width:40.063em) {
			    .pure-toggle[data-toggle='right']:checked ~ .pure-overlay[data-overlay='right'] {
			      right: 300px; } }
			  @media only screen and (min-width:64.063em) {
			    .pure-toggle[data-toggle='right']:checked ~ .pure-overlay[data-overlay='right'] {
			      right: 300px; } }

			.pure-toggle[data-toggle='top']:checked ~ .pure-overlay[data-overlay='top'] {
			  top: 100%; }
			  @media only screen and (min-width:40.063em) {
			    .pure-toggle[data-toggle='top']:checked ~ .pure-overlay[data-overlay='top'] {
			      top: 100%; } }
			  @media only screen and (min-width:64.063em) {
			    .pure-toggle[data-toggle='top']:checked ~ .pure-overlay[data-overlay='top'] {
			      top: 100px; } }

			.pure-toggle[data-toggle='left']:checked ~ .pure-overlay[data-overlay='left'], .pure-toggle[data-toggle='right']:checked ~ .pure-overlay[data-overlay='right'], .pure-toggle[data-toggle='top']:checked ~ .pure-overlay[data-overlay='top'] {
			  width: 100%;
			  height: 100%;
			  opacity: 1;
			  z-index: 2; }

			[data-effect='pure-effect-slide'] .pure-drawer {
			  z-index: 3;
			  transition-duration: 500ms; }

			[data-effect='pure-effect-slide'] .pure-drawer[data-position='left'] {
			  -webkit-transform: translate3d(-100%, 0, 0);
			  transform: translate3d(-100%, 0, 0); }

			[data-effect='pure-effect-slide'] .pure-drawer[data-position='right'] {
			  -webkit-transform: translate3d(100%, 0, 0);
			  transform: translate3d(100%, 0, 0); }

			[data-effect='pure-effect-slide'] .pure-drawer[data-position='top'] {
			  -webkit-transform: translate3d(0, -100%, 0);
			  transform: translate3d(0, -100%, 0); }

			[data-effect='pure-effect-slide'] .pure-toggle[data-toggle='left']:checked ~ .pure-drawer[data-position='left'], [data-effect='pure-effect-slide'] .pure-toggle[data-toggle='right']:checked ~ .pure-drawer[data-position='right'], [data-effect='pure-effect-slide'] .pure-toggle[data-toggle='top']:checked ~ .pure-drawer[data-position='top'] {
			  visibility: visible;
			  -webkit-transform: translate3d(0, 0, 0);
			  transform: translate3d(0, 0, 0); }

			[data-effect='pure-effect-slide'] .pure-overlay {
			  transition-duration: 500ms;
			  transition-delay: 250ms; }
			*/
		});

		var style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = drawerCss;
		document.getElementsByTagName('head')[0].appendChild(style);
	}

	function initPeriodDirectView(){
		//onPeriodChange(getWeekFromToggl);
		// getWeekFromToggl();
	}

	initPage();

})();

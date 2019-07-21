/* -*- js-indent-level: 8 -*- */
/*
* Control.Menubar
*/

/* global $ _ _UNO vex revHistoryEnabled closebutton L */
L.Control.XmlMenubar = L.Control.extend({
	// TODO: Some mechanism to stop the need to copy duplicate menus (eg. Help)
	options: {
		commandStates: {},

		// Only these menu options will be visible in readonly mode
		allowedReadonlyMenus: ['file', 'downloadas', 'view', 'help'],

		allowedViewModeActions: [
			'downloadas-pdf', 'downloadas-odt', 'downloadas-doc', 'downloadas-docx', 'downloadas-rtf', // file menu
			'downloadas-odp', 'downloadas-ppt', 'downloadas-pptx', 'print', // file menu
			'downloadas-ods', 'downloadas-xls', 'downloadas-xlsx', 'closedocument', // file menu
			'downloadas-csv', 'downloadas-html', 'downloadas-txt',  // file menu
			'fullscreen', 'zoomin', 'zoomout', 'zoomreset', // view menu
			'about', 'keyboard-shortcuts' // help menu
		]
	},

	onAdd: function (map) {
		this._initialized = false;
		this._menubarCont = L.DomUtil.get('main-menu');

		map.on('doclayerinit', this._onDocLayerInit, this);
		map.on('updatepermission', this._onRefresh, this);
		map.on('addmenu', this._addMenu, this);
		map.on('commandvalues', this._onInitMenu, this);
		map.on('updatetoolbarcommandvalues', this._onStyleMenu, this);
	},

	_addMenu: function (e) {
		var alreadyExists = L.DomUtil.get('menu-' + e.id);
		if (alreadyExists)
			return;

		var liItem = L.DomUtil.create('li', '');
		liItem.id = 'menu-' + e.id;
		if (this._map._permission === 'readonly') {
			L.DomUtil.addClass(liItem, 'readonly');
		}
		var aItem = L.DomUtil.create('a', '', liItem);
		$(aItem).text(e.label);
		$(aItem).data('id', e.id);
		$(aItem).data('type', 'action');
		$(aItem).data('postmessage', 'true');
		this._menubarCont.insertBefore(liItem, this._menubarCont.firstChild);
	},

	_createUnoMenuItem: function (caption, command, tag) {
		var liItem, aItem;
		liItem = L.DomUtil.create('li', '');
		aItem = L.DomUtil.create('a', '', liItem);
		$(aItem).text(caption);
		$(aItem).data('type', 'unocommand');
		$(aItem).data('uno', command);
		$(aItem).data('tag', tag);
		return liItem;
	},

	_onInitMenu: function (e) {
		if (e.commandName === '.uno:LanguageStatus' && L.Util.isArray(e.commandValues)) {
			var translated, neutral;
			var constDefa = 'Default_RESET_LANGUAGES';
			var constCurr = 'Current_RESET_LANGUAGES';
			var constPara = 'Paragraph_RESET_LANGUAGES';
			var constLang = '.uno:LanguageStatus?Language:string=';
			var resetLang = _('Reset to Default Language');
			var languages  = [];

			e.commandValues.forEach(function(language) {
				languages.push({translated: _(language), neutral: language});
			});
			languages.sort(function(a, b) {
				return a.translated < b.translated ? -1 : a.translated > b.translated ? 1 : 0;
			});

			var $menuSelection = $('#menu-noneselection').parent();
			var $menuParagraph = $('#menu-noneparagraph').parent();
			var $menuDefault = $('#menu-nonelanguage').parent();
			for (var lang in languages) {
				translated = languages[lang].translated;
				neutral = languages[lang].neutral;
				$menuSelection.append(this._createUnoMenuItem(translated, constLang + encodeURIComponent('Current_' + neutral)));
				$menuParagraph.append(this._createUnoMenuItem(translated, constLang + encodeURIComponent('Paragraph_' + neutral)));
				$menuDefault.append(this._createUnoMenuItem(translated, constLang + encodeURIComponent('Default_' + neutral)));
			}
			$menuSelection.append(this._createMenu([{type: 'separator'}]));
			$menuParagraph.append(this._createMenu([{type: 'separator'}]));
			$menuDefault.append(this._createMenu([{type: 'separator'}]));
			$menuSelection.append(this._createUnoMenuItem(resetLang, constLang + constCurr));
			$menuParagraph.append(this._createUnoMenuItem(resetLang, constLang + constPara));
			$menuDefault.append(this._createUnoMenuItem(resetLang, constLang + constDefa));
		}
	},

	_onRefresh: function() {
		// clear initial menu
		while (this._menubarCont.hasChildNodes()) {
			this._menubarCont.removeChild(this._menubarCont.firstChild);
		}

		// Add document specific menu
		var docType = this._map.getDocType();
		this._getXmlMenubar(docType);

		// initialize menubar plugin
		$('#main-menu').smartmenus({
			hideOnClick: true,
			showOnClick: true,
			hideTimeout: 0,
			hideDuration: 0,
			showDuration: 0,
			showTimeout: 0,
			collapsibleHideDuration: 0,
			subIndicatorsPos: 'append',
			subIndicatorsText: '&#8250;'
		});
		$('#main-menu').attr('tabindex', 0);

		if (this._map._permission !== 'readonly') {
			this._createFileIcon();
		}
	},

	_onStyleMenu: function (e) {
		if (e.commandName === '.uno:StyleApply') {
			var style;
			var constArg = '&';
			var constHeader = '.uno:InsertPageHeader?PageStyle:string=';
			var constFooter = '.uno:InsertPageFooter?PageStyle:string=';
			var $menuHeader = $('#menu-insertheader').parent();
			var $menuFooter = $('#menu-insertfooter').parent();
			var pageStyles = e.commandValues['HeaderFooter'];
			for (var iterator in pageStyles) {
				style = pageStyles[iterator];
				$menuHeader.append(this._createUnoMenuItem(_(style), constHeader + encodeURIComponent(style) + constArg, style));
				$menuFooter.append(this._createUnoMenuItem(_(style), constFooter + encodeURIComponent(style) + constArg, style));
			}
		}
	},

	_createDocument: function(e) {
		var self = e.data.self;
		var docType = self._map.getDocType();
		self._map.fire('postMessage', {msgId: 'UI_CreateFile', args: {DocumentType: docType}});
	},

	_onDocLayerInit: function() {
		this._onRefresh();

		$('#main-menu').bind('select.smapi', {self: this}, this._onItemSelected);
		$('#main-menu').bind('mouseenter.smapi', {self: this}, this._onMouseEnter);
		$('#main-menu').bind('mouseleave.smapi', {self: this}, this._onMouseLeave);

		$('#main-menu').bind('beforeshow.smapi', {self: this}, this._beforeShow);
		$('#main-menu').bind('click.smapi', {self: this}, this._onClicked);

		$('#main-menu').bind('keydown', {self: this}, this._onKeyDown);

		// SmartMenus mobile menu toggle button
		$(function() {
			var $mainMenuState = $('#main-menu-state');
			if ($mainMenuState.length) {
				// animate mobile menu
				$mainMenuState.change(function() {
					var $menu = $('#main-menu');
					var $nav = $menu.parent();
					if (this.checked) {
						$nav.css({height: 'initial', bottom: '38px'});
						$menu.hide().slideDown(250, function() { $menu.css('display', ''); });
					} else {
						$menu.show().slideUp(250, function() { $menu.css('display', ''); });
						$nav.css({height:'', bottom: ''});
					}
				});
				// hide mobile menu beforeunload
				$(window).bind('beforeunload unload', function() {
					if ($mainMenuState[0].checked) {
						$mainMenuState[0].click();
					}
				});
			}
		});

		this._initialized = true;
	},

	_onClicked: function(e, menu) {
		if ($(menu).hasClass('highlighted')) {
			$('#main-menu').smartmenus('menuHideAll');
		}

		var $mainMenuState = $('#main-menu-state');
		if (!$(menu).hasClass('has-submenu') && $mainMenuState[0].checked) {
			$mainMenuState[0].click();
		}
	},

	_checkedMenu: function(uno, item) {
		var constChecked = 'lo-menu-item-checked';
		var state = this._map['stateChangeHandler'].getItemValue(uno);
		var data = $(item).data('tag');
		state = state[data] || false;
		if (state) {
			$(item).addClass(constChecked);
		} else {
			$(item).removeClass(constChecked);
		}
	},

	_beforeShow: function(e, menu) {
		var self = e.data.self;
		var items = $(menu).children().children('a').not('.has-submenu');
		$(items).each(function() {
			var aItem = this;
			var type = $(aItem).data('type');
			var id = $(aItem).data('id');
			if (self._map._permission === 'edit') {
				if (type === 'unocommand') { // enable all depending on stored commandStates
					var data, lang;
					var constUno = 'uno';
					var constState = 'stateChangeHandler';
					var constChecked = 'lo-menu-item-checked';
					var constLanguage = '.uno:LanguageStatus';
					var constPageHeader = '.uno:InsertPageHeader';
					var constPageFooter = '.uno:InsertPageFooter';
					var unoCommand = $(aItem).data(constUno);
					var itemState = self._map[constState].getItemValue(unoCommand);
					if (itemState === 'disabled') {
						$(aItem).addClass('disabled');
					} else {
						$(aItem).removeClass('disabled');
					}
					if (unoCommand.startsWith(constLanguage)) {
						unoCommand = constLanguage;
						lang = self._map[constState].getItemValue(unoCommand);
						data = decodeURIComponent($(aItem).data(constUno));
						if (data.indexOf(lang) !== -1) {
							$(aItem).addClass(constChecked);
						} else if (data.indexOf('LANGUAGE_NONE') !== -1 && lang === '[None]') {
							$(aItem).addClass(constChecked);
						} else {
							$(aItem).removeClass(constChecked);
						}
					}
					else if (unoCommand.startsWith(constPageHeader)) {
						unoCommand = constPageHeader;
						self._checkedMenu(unoCommand, this);
					}
					else if (unoCommand.startsWith(constPageFooter)) {
						unoCommand = constPageFooter;
						self._checkedMenu(unoCommand, this);
					}
					else if (itemState === 'true') {
						$(aItem).addClass(constChecked);
					} else {
						$(aItem).removeClass(constChecked);
					}
				} else if (type === 'action') { // enable all except fullscreen on windows
					if (id === 'fullscreen' && (L.Browser.ie || L.Browser.edge)) { // Full screen works weirdly on IE 11 and on Edge
						$(aItem).addClass('disabled');
						var index = self.options.allowedViewModeActions.indexOf('fullscreen');
						if (index > 0) {
							self.options.allowedViewModeActions.splice(index, 1);
						}
					} else {
						$(aItem).removeClass('disabled');
					}
				}
			} else { // eslint-disable-next-line no-lonely-if
				if (type === 'unocommand') { // disable all uno commands
					$(aItem).addClass('disabled');
				} else if (type === 'action') { // disable all except allowedViewModeActions
					var found = false;
					for (var i in self.options.allowedViewModeActions) {
						if (self.options.allowedViewModeActions[i] === id) {
							found = true;
							break;
						}
					}
					if (!found) {
						$(aItem).addClass('disabled');
					} else {
						$(aItem).removeClass('disabled');
					}
				}
			}
		});
	},

	_executeAction: function(item) {
		var id = $(item).data('id');
		if (id === 'save') {
			this._map.save(true, true);
		} else if (id === 'saveas') {
			this._map.fire('postMessage', {msgId: 'UI_SaveAs'});
		} else if (id === 'shareas') {
			this._map.fire('postMessage', {msgId: 'UI_Share'});
		} else if (id === 'print') {
			this._map.print();
		} else if (id.startsWith('downloadas-')) {
			var format = id.substring('downloadas-'.length);
			var fileName = this._map['wopi'].BaseFileName;
			fileName = fileName.substr(0, fileName.lastIndexOf('.'));
			fileName = fileName === '' ? 'document' : fileName;
			this._map.downloadAs(fileName + '.' + format, format);
		} else if (id === 'signdocument') {
			this._map.showSignDocument();
		} else if (id === 'insertcomment') {
			this._map.insertComment();
		} else if (id === 'insertgraphic') {
			L.DomUtil.get('insertgraphic').click();
		} else if (id === 'insertgraphicremote') {
			this._map.fire('postMessage', {msgId: 'UI_InsertGraphic'});
		} else if (id === 'zoomin' && this._map.getZoom() < this._map.getMaxZoom()) {
			this._map.zoomIn(1);
		} else if (id === 'zoomout' && this._map.getZoom() > this._map.getMinZoom()) {
			this._map.zoomOut(1);
		} else if (id === 'zoomreset') {
			this._map.setZoom(this._map.options.zoom);
		} else if (id === 'fullscreen') {
			L.toggleFullScreen();
		} else if (id === 'fullscreen-presentation' && this._map.getDocType() === 'presentation') {
			this._map.fire('fullscreen');
		} else if (id === 'insertpage') {
			this._map.insertPage();
		} else if (id === 'duplicatepage') {
			this._map.duplicatePage();
		} else if (id === 'deletepage') {
			var map = this._map;
			vex.dialog.confirm({
				message: _('Are you sure you want to delete this slide?'),
				callback: function(e) {
					if (e) {
						map.deletePage();
					}
				}
			});
		} else if (id === 'about') {
			this._map.showLOAboutDialog();
		} else if (id === 'keyboard-shortcuts') {
			this._map.showLOKeyboardHelp();
		} else if (revHistoryEnabled && (id === 'rev-history' || id === 'last-mod')) {
			// if we are being loaded inside an iframe, ask
			// our host to show revision history mode
			this._map.fire('postMessage', {msgId: 'rev-history', args: {Deprecated: true}});
			this._map.fire('postMessage', {msgId: 'UI_FileVersions'});
		} else if (id === 'closedocument') {
			if (window.ThisIsAMobileApp) {
				window.webkit.messageHandlers.lool.postMessage('BYE', '*');
			} else {
				this._map.fire('postMessage', {msgId: 'close', args: {EverModified: this._map._everModified, Deprecated: true}});
				this._map.fire('postMessage', {msgId: 'UI_Close', args: {EverModified: this._map._everModified}});
			}
			this._map.remove();
		} else if (id === 'repair') {
			this._map._socket.sendMessage('commandvalues command=.uno:DocumentRepair');
		}
		// Inform the host if asked
		if ($(item).data('postmessage') === 'true') {
			this._map.fire('postMessage', {msgId: 'Clicked_Button', args: {Id: id} });
		}
	},

	_sendCommand: function (item) {
		var unoCommand = $(item).data('uno');
		if (unoCommand.startsWith('.uno:InsertPageHeader') || unoCommand.startsWith('.uno:InsertPageFooter')) {
			unoCommand = unoCommand + ($(item).hasClass('lo-menu-item-checked') ? 'On:bool=false' : 'On:bool=true');
		}
		this._map.sendUnoCommand(unoCommand);
	},

	_onItemSelected: function(e, item) {
		var self = e.data.self;
		var type = $(item).data('type');
		if (type === 'unocommand') {
			self._sendCommand(item);
		} else if (type === 'action') {
			self._executeAction(item);
		}

		if (!L.Browser.mobile && $(item).data('id') !== 'insertcomment')
			self._map.focus();
	},

	_onMouseEnter: function(e, item) {
		var self = e.data.self;
		var type = $(item).data('type');
		if (type === 'unocommand') {
			var unoCommand = $(item).data('uno');
			self._map.setHelpTarget(unoCommand);
		} else if (type === 'action') {
			var id = $(item).data('id');
			self._map.setHelpTarget('modules/online/menu/' + id);
		}
	},

	_onMouseLeave: function(e) {
		var self = e.data.self;
		self._map.setHelpTarget(null);
	},

	_onKeyDown: function(e) {
		var self = e.data.self;

		// handle help - F1
		if (e.type === 'keydown' && !e.shiftKey && !e.ctrlKey && !e.altKey && e.keyCode == 112) {
			self._map.showHelp();
		}
	},

	_createFileIcon: function() {
		var iconClass = 'document-logo';
		var docType = this._map.getDocType();
		if (docType === 'text') {
			iconClass += ' writer-icon-img';
		} else if (docType === 'spreadsheet') {
			iconClass += ' calc-icon-img';
		} else if (docType === 'presentation' || docType === 'drawing') {
			iconClass += ' impress-icon-img';
		}

		var liItem = L.DomUtil.create('li', '');
		liItem.id = 'document-header';
		var aItem = L.DomUtil.create('div', iconClass, liItem);
		$(aItem).data('id', 'document-logo');
		$(aItem).data('type', 'action');

		this._menubarCont.insertBefore(liItem, this._menubarCont.firstChild);

		var $docLogo = $(aItem);
		$docLogo.bind('click', {self: this}, this._createDocument);

	},

	_createMenu: function(menu) {
		var itemList = [];
		var docType = this._map.getDocType();
		for (var i in menu) {
			if (menu[i].id === 'about' && (L.DomUtil.get('about-dialog') === null)) {
				continue;
			}
			if (menu[i].id === 'signdocument' && (L.DomUtil.get('document-signing-bar') === null)) {
				continue;
			}

			if (this._map._permission === 'readonly' && menu[i].type === 'menu') {
				var found = false;
				for (var j in this.options.allowedReadonlyMenus) {
					if (this.options.allowedReadonlyMenus[j] === menu[i].id) {
						found = true;
						break;
					}
				}
				if (!found)
					continue;
			}

			if (this._map._permission === 'readonly' && menu[i].id === 'last-mod') {
				continue;
			}

			if (menu[i].type === 'action') {
				if ((menu[i].id === 'rev-history' && !revHistoryEnabled) ||
					(menu[i].id === 'closedocument' && !closebutton)) {
					continue;
				}
			}

			if (menu[i].id === 'print' && this._map['wopi'].HidePrintOption)
				continue;

			if (menu[i].id === 'save' && this._map['wopi'].HideSaveOption)
				continue;

			if (menu[i].id === 'saveas' && this._map['wopi'].UserCanNotWriteRelative)
				continue;

			if (menu[i].id === 'shareas' && !this._map['wopi'].EnableShare)
				continue;

			if (menu[i].id === 'insertgraphicremote' && !this._map['wopi'].EnableInsertRemoteImage)
				continue;

			if (menu[i].id && menu[i].id.startsWith('fullscreen-presentation') && this._map['wopi'].HideExportOption)
				continue;

			if (menu[i].id === 'changesmenu' && this._map['wopi'].HideChangeTrackingControls)
				continue;

			// Keep track of all 'downloadas-' options and register them as
			// export formats with docLayer which can then be publicly accessed unlike
			// this Menubar control for which there doesn't seem to be any easy way
			// to get access to.
			if (menu[i].id && menu[i].id.startsWith('downloadas-')) {
				var format = menu[i].id.substring('downloadas-'.length);
				this._map._docLayer.registerExportFormat(menu[i].name, format);

				if (this._map['wopi'].HideExportOption)
					continue;
			}

			var liItem = L.DomUtil.create('li', '');
			if (menu[i].id) {
				liItem.id = 'menu-' + menu[i].id;
				if (menu[i].id === 'closedocument' && this._map._permission === 'readonly') {
					// see corresponding css rule for readonly class usage
					L.DomUtil.addClass(liItem, 'readonly');
				}
			}
			var aItem = L.DomUtil.create('a', menu[i].disabled ? 'disabled' : '', liItem);
			if (menu[i].name !== undefined) {
				aItem.innerHTML = menu[i].name;
			} else if (menu[i].uno !== undefined) {
				aItem.innerHTML = _UNO(menu[i].uno, docType);
			} else {
				aItem.innerHTML = '';
			}
			// Add by Firefly
			// 有指定 Icon 再加
			if (menu[i].icon !== undefined) {
				L.DomUtil.create('i', 'menuicon ' + menu[i].icon, aItem);
			}
			if (menu[i].hotkey !== undefined) {
				var spanItem = L.DomUtil.create('span', 'hotkey', aItem);
				spanItem.innerHTML = menu[i].hotkey;
			}
			if (menu[i].type === 'menu') {
				var ulItem = L.DomUtil.create('ul', '', liItem);
				var subitemList = this._createMenu(menu[i].menu);
				if (!subitemList.length) {
					continue;
				}
				for (var idx in subitemList) {
					ulItem.appendChild(subitemList[idx]);
				}
			} else if (menu[i].type === 'unocommand' || menu[i].uno !== undefined) {
				$(aItem).data('type', 'unocommand');
				$(aItem).data('uno', menu[i].uno);
				$(aItem).data('tag', menu[i].tag);
			} else if (menu[i].type === 'separator') {
				$(aItem).addClass('separator');
			} else if (menu[i].type === 'action') {
				$(aItem).data('type', 'action');
				$(aItem).data('id', menu[i].id);
			}

			if (menu[i].tablet == false && window.mode.isTablet()) {
				$(aItem).css('display', 'none');
			}

			if (menu[i].mobile == false && window.mode.isMobile()) {
				$(aItem).css('display', 'none');
			}

			itemList.push(liItem);
		}

		return itemList;
	},

	_getXmlMenubar: function(docType) {
		var that = this;
		var xmlUrl = 'uiconfig/' + docType + '/menubar.xml';
		$.ajax({
			type: 'GET',
			url: xmlUrl,
			cache: false,
			async: false,
			dataType: 'xml',
			success: function(xml) {
				if (xml.children.length === 1) {
					that.options.menubar = that._createXmlMenu(xml.children.item(0));
					that._initializeMenu(that.options.menubar);
				}
			},
			error: function() {
				alert('An error occurred while processing XML file.');
			}
		});
	},

	_createXmlMenu: function(root) {
		var menu = [];
		var docType = this._map.getDocType();
		for (var i = 0 ; i < root.children.length ; i ++)
		{
			var item = root.children.item(i);
			var type = $(item)[0].tagName;
			var subMenu;
			var unoCommand = null;

			switch (type)
			{
			case 'menu:menu':	// 主選單
				unoCommand = $(item).attr('menu:id');
				subMenu = {'name': _UNO(unoCommand, docType),
							'uno': unoCommand,
							'type': 'menu',
							'menu': this._createXmlMenu(item.children.item(0))};
				menu.push(subMenu);
				break;
			case 'menu:menupopup': // 子選單
				break;
			case 'menu:menuitem': // 選項
				unoCommand = $(item).attr('menu:id');
				menu.push({'name': _UNO(unoCommand, docType, true),
							'uno': unoCommand,
							'type': 'action'});
				break;
			case 'menu:menuseparator': // 分隔線
				menu.push({type: 'separator'});
				break;
			}
		}
		return menu;
	},

	_initializeMenu: function(menu) {
		var menuHtml = this._createMenu(menu);
		for (var i in menuHtml) {
			this._menubarCont.appendChild(menuHtml[i]);
		}
	}
});

L.control.xmlmenubar = function (options) {
	return new L.Control.XmlMenubar(options);
};

/* -*- js-indent-level: 8 -*- */
/*
* Control.Menubar
*/

/* global $ _ _UNO revHistoryEnabled closebutton w2ui*/
L.Control.Menubar = L.Control.extend({
	// TODO: Some mechanism to stop the need to copy duplicate menus (eg. Help)
	options: {
		commandStates: {},

		// WOPI HideExportOption 為 true 時，下列選項禁止使用
		hideExportLists: {
			'print': true, // 列印
			'downloadas': true, // 下載為...子選單
			'saveaspassword': true, // 以密碼另存新檔
			'savegraphic': true, // 儲存圖片
			'fullscreen-presentation': true, // impress 從第一張投影片開始
			'presentation-currentslide': true, // impress 從目前投影片開始
		},
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

	_createUnoMenuItem: function (caption, commandOrId, tagOrFunction) {
		var liItem = L.DomUtil.create('li', '');
		var aItem = L.DomUtil.create('a', '', liItem);
		var obj = {name: commandOrId};
		$(aItem).text(caption);
		if (this._map.isUnoCommand(commandOrId)) {
			$(aItem).data('type', 'unocommand');
			$(aItem).data('uno', commandOrId);
			$(aItem).data('tag', tagOrFunction);
		} else {
			liItem.id = commandOrId;
			$(aItem).data('type', 'action');
			$(aItem).data('id', commandOrId);
			obj.callback = tagOrFunction;
		}
		this._map.addAllowedCommand(obj);
		return liItem;
	},

	_onInitMenu: function (e) {
		if (e.commandName === '.uno:LanguageStatus' && L.Util.isArray(e.commandValues)) {
			this._languageValues = e.commandValues;
			if (this._initialized) {
				this._createLanguageItem();
			}
		}
	},

	_createLanguageItem: function() {
		if (this._languageValues !== undefined) {
			var translated, neutral;
			var constDefa = 'Default_RESET_LANGUAGES';
			var constCurr = 'Current_RESET_LANGUAGES';
			var constPara = 'Paragraph_RESET_LANGUAGES';
			var constLang = '.uno:LanguageStatus?Language:string=';
			var resetLang = _('Reset to Default Language');
			var languages  = [];

			this._languageValues.forEach(function(language) {
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
			$menuSelection.append(this._createMenu([{type: '--'}]));
			$menuParagraph.append(this._createMenu([{type: '--'}]));
			$menuDefault.append(this._createMenu([{type: '--'}]));
			$menuSelection.append(this._createUnoMenuItem(resetLang, constLang + constCurr));
			$menuParagraph.append(this._createUnoMenuItem(resetLang, constLang + constPara));
			$menuDefault.append(this._createUnoMenuItem(resetLang, constLang + constDefa));
			delete this._languageValues;
		}
	},

	_onRefresh: function(e) {
		if (!this._initialized) {
			// clear initial menu
			while (this._menubarCont.hasChildNodes()) {
				this._menubarCont.removeChild(this._menubarCont.firstChild);
			}
			// Add document specific menu
			this._loadMenubar(this._map.getDocType());
		}
		// 非編輯模式或手機模式時，不顯示選單
		if (e.perm !== 'edit' || L.Browser.mobile) {
			$('.main-nav').hide();
			return;
		}

		$('.main-nav').show();
	},

	_onStyleMenu: function (e) {
		if (e.commandName === '.uno:StyleApply') {
			this._pageStyles = e.commandValues['HeaderFooter'];
			if (this._initialized) {
				this._createHeadFooterItem();
			}
		}
	},

	_createHeadFooterItem: function() {
		if (this._pageStyles !== undefined) {
			var $header = $('#menu-insertheader');
			var $footer = $('#menu-insertfooter');
			var $menuHeader = $header.parent();
			var $menuFooter = $footer.parent();
			var style;
			for (var iterator in this._pageStyles) {
				style = this._pageStyles[iterator];
				$menuHeader.append(this._createUnoMenuItem(_(style), '.uno:InsertPageHeader', style));
				$menuFooter.append(this._createUnoMenuItem(_(style), '.uno:InsertPageFooter', style));
			}
			delete this._pageStyles;
		}
	},

	_createDocument: function(e) {
		var self = e.data.self;
		var docType = self._map.getDocType();
		self._map.fire('postMessage', {msgId: 'UI_CreateFile', args: {DocumentType: docType}});
	},

	_onDocLayerInit: function() {

		/*
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
*/
	},

	_bindMenuEvent: function() {
		$('#main-menu').bind('select.smapi', {self: this}, this._onItemSelected);
		$('#main-menu').bind('mouseenter.smapi', {self: this}, this._onMouseEnter);
		$('#main-menu').bind('mouseleave.smapi', {self: this}, this._onMouseLeave);

		$('#main-menu').bind('beforeshow.smapi', {self: this}, this._beforeShow);
		$('#main-menu').bind('click.smapi', {self: this}, this._onClicked);

		$('#main-menu').bind('keydown', {self: this}, this._onKeyDown);
	},

	_onClicked: function(e, menu) {
		// 只要被 click 就關掉 menu
		/*if ($(menu).hasClass('highlighted')) {
			$('#main-menu').smartmenus('menuHideAll');
		}*/
		$('#main-menu').smartmenus('menuHideAll');
		var $mainMenuState = $('#main-menu-state');
		if (!$(menu).hasClass('has-submenu') && $mainMenuState[0].checked) {
			$mainMenuState[0].click();
		}
	},

	_checkedMenu: function(uno, item) {
		var constChecked = 'lo-menu-item-checked';
		var state = false;
		// 如果是 '.uno:AssignLayout' 要特別處理一下
		if (uno.startsWith('.uno:AssignLayout')) {
			var layoutNo = uno.substring(34);
			var assignLayout = this._map['stateChangeHandler'].getItemProperty('.uno:AssignLayout');
			state = (layoutNo === assignLayout.value);
		} else {
			var data = $(item).data('tag');
			state = this._map['stateChangeHandler'].getItemValue(uno);
			state = state[data] || false;
		}

		if (state) {
			$(item).addClass(constChecked);
		} else {
			$(item).removeClass(constChecked);
		}
	},

	_beforeShow: function(e, menu) {
		var self = e.data.self;
		var items = $(menu).children().children('a').not('.has-submenu');
		L.hideAllToolbarPopup();
		$(items).each(function() {
			var constUno = 'uno';
			var aItem = this;
			var id = $(aItem).data('id');
			var stateUno = $(aItem).data('state');
			var unoCommand = stateUno || $(aItem).data(constUno) || id;
			if (self._map._permission === 'edit') {
				if (unoCommand !== undefined) { // enable all depending on stored commandStates
					var data, lang;
					var constState = 'stateChangeHandler';
					var constChecked = 'lo-menu-item-checked';
					var constLanguage = '.uno:LanguageStatus';
					var constAssignLayout = '.uno:AssignLayout';
					var constPageHeader = '.uno:InsertPageHeader';
					var constPageFooter = '.uno:InsertPageFooter';
					var itemState = self._map[constState].getItemProperty(unoCommand);

					if (itemState.enabled === false) {
						$(aItem).addClass('disabled');
					} else {
						$(aItem).removeClass('disabled');
					}

					if (itemState.checked === true) {
						$(aItem).addClass(constChecked);
					} else {
						$(aItem).removeClass(constChecked);
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
					else if (unoCommand.startsWith(constAssignLayout)) {
						self._checkedMenu(unoCommand, this);
					}
					else if (unoCommand.startsWith(constPageHeader)) {
						unoCommand = constPageHeader;
						self._checkedMenu(unoCommand, this);
					}
					else if (unoCommand.startsWith(constPageFooter)) {
						unoCommand = constPageFooter;
						self._checkedMenu(unoCommand, this);
					}
				}
			}
		});
	},

	_executeAction: function(item) {
		var id = $(item).data('id');
		if (!this._map.executeAllowedCommand(id)) {
			console.debug('未執行的 id :' + id)
		}
		// Inform the host if asked
		if ($(item).data('postmessage') === 'true') {
			this._map.fire('postMessage', {msgId: 'Clicked_Button', args: {Id: id} });
		}
	},

	_sendCommand: function (item) {
		var unoCommand = $(item).data('uno') || $(item).data('id');
		if (unoCommand === '.uno:InsertPageHeader' || unoCommand ==='.uno:InsertPageFooter') {
			var tag = $(item).data('tag');
			var state = $(item).hasClass('lo-menu-item-checked');
			var args = '?PageStyle:string='+ tag + '&On:bool=' + !state;
			this._map.sendUnoCommand(unoCommand + args);
			return;
		}
		if (unoCommand === '.uno:VerticalText' || unoCommand === '.uno:Text') {
			if (this._map.stateChangeHandler._stateProperties[unoCommand].checked) {
				return;
			}
			var toolbar = w2ui['editbar'];
			var command = '';
			var uno = '';
			switch (unoCommand) {
			case '.uno:Text':
				if (toolbar.get('verticaltext').checked) {
					toolbar.uncheck('verticaltext');
					command = 'key type=input char=0 key=1281';
					this._map._socket.sendMessage(command);
					uno = '.uno:VerticalText';
					this._map.stateChangeHandler._stateProperties[uno].checked = false;
				}
				break;
			case '.uno:VerticalText':
				if (toolbar.get('horizontaltext').checked) {
					toolbar.uncheck('horizontaltext');
					command = 'key type=input char=0 key=1281';
					this._map._socket.sendMessage(command);
					uno = '.uno:Text';
					this._map.stateChangeHandler._stateProperties[uno].checked = false;
				}
				break;
			}
		}
		this._map.executeAllowedCommand(unoCommand);
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
		var map = this._map;
		var itemList = [];
		var docType = map.getDocType();
		// Add by Firefly <firefly@ossii.com.tw>
		var lastItem = null; // 最近新增的 Item;
		this._level ++;
		// -------------------------------------
		for (var i in menu) {

			if ((menu[i].id === 'rev-history' && !revHistoryEnabled) ||
				(menu[i].id === 'closedocument' && !closebutton)) {
				continue;
			}

			// 隱藏列印選項
			if (menu[i].id === 'print' && this._map['wopi'].HidePrintOption) {
				continue;
			}

			// 設定禁止匯出
			if (menu[i].id && this._map['wopi'].HideExportOption) {
				// 檢查是否在禁用列表中
				if (this.options.hideExportLists[menu[i].id] === true) {
					continue;
				}
				if (menu[i].id.startsWith('dialog:DownloadAs')) {
					continue;
				}
			}

			if (menu[i].id === 'save' && this._map['wopi'].HideSaveOption)
				continue;

			if (menu[i].id === 'saveas' && this._map['wopi'].UserCanNotWriteRelative)
				continue;

			if (menu[i].id === 'shareas' && !this._map['wopi'].EnableShare)
				continue;

			if (menu[i].id === 'insertgraphicremote' && !this._map['wopi'].EnableInsertRemoteImage)
				continue;

			if (menu[i].id === 'changesmenu' && this._map['wopi'].HideChangeTrackingControls)
				continue;

			// Keep track of all 'dialog:DownloadAs?ext=' options and register them as
			// export formats with docLayer which can then be publicly accessed unlike
			// this Menubar control for which there doesn't seem to be any easy way
			// to get access to.
			if (menu[i].id && menu[i].id.startsWith('dialog:DownloadAs?ext=')) {
				var format = menu[i].id.substring('dialog:DownloadAs?ext='.length);
				this._map._docLayer.registerExportFormat(menu[i].name, format);
			}

			// 處理分隔線原則：
			// 1. 第一行不能是分隔線
			// 2. 不能重複出現分隔線
			// 3. 最後一行不能是分隔線
			if (menu[i].type !== undefined && menu[i].type === '--') {
				// 1. 第一行不能是分隔線
				if (itemList.length === 0)
					continue;
				// 2. 不能重複出現分隔線
				if (lastItem && lastItem.type !== undefined && lastItem.type === '--')
					continue;
			}

			// 紀錄最近的 Item
			if (menu[i].hide !== true) {
				lastItem = menu[i];
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
			var iconItem = L.DomUtil.create('i', 'menuicon', aItem);
			var unoIcon = '';
			var itemName = '';
			if (menu[i].name !== undefined) {
				// 若 menu[i].name 是 UNO 指令
				if (this._map.isUnoCommand(menu[i].name)) {
					itemName = _UNO(menu[i].name, docType, true); // 翻譯選項
					// 不是 menubar 選項，把這個 uno command 當作選項圖示
					if (this._level > 1) {
						unoIcon = menu[i].name;
					}
				} else {
					itemName = _(menu[i].name);
				}
			} else if (menu[i].uno !== undefined) {
				unoIcon = menu[i].uno; // 把這個 uno command 當作選項圖示
				itemName = _UNO(menu[i].uno, docType, true); // 翻譯選項
			} else if (menu[i].id !== undefined && this._map.isUnoCommand(menu[i].id)) {
				unoIcon = menu[i].id; // 把這個 uno command 當作選項圖示
				itemName = _UNO(menu[i].id, docType, true); // 翻譯選項
			} else {
				itemName = '';
			}
			aItem.appendChild(document.createTextNode(itemName));
			// 增加 icon 元件
			if (menu[i].icon !== undefined) { // 有指定 icon
				// icon 開頭是 UNO 指令，改用這個 uno icon
				if (this._map.isUnoCommand(menu[i].icon)) {
					unoIcon = menu[i].icon; // 如果 icon 指定某個 uno 指令，優先使用這個圖示
				} else if (unoIcon === '') { // 只有沒有 uno icon 時，才會把 icon 內容當作 class
					L.DomUtil.addClass(iconItem, menu[i].icon);
				}
			}

			// 使用 uno 對應圖示
			if (unoIcon !== '') {
				var iconURL = 'url("' + this._map.getUnoCommandIcon(unoIcon) + '")';
				L.DomUtil.addClass(iconItem, 'img-icon');
				$(iconItem).css('background-image', iconURL);
			}
			if (menu[i].hotkey !== undefined) {
				var spanItem = L.DomUtil.create('span', 'hotkey', aItem);
				spanItem.innerHTML = L.Util.replaceCtrlInMac(menu[i].hotkey);
			}

			if (menu[i].type === undefined) {
				if ($.isArray(menu[i].menu)) {
					menu[i].type = 'menu';
				} else if (menu[i].uno === undefined) {
					menu[i].type = 'action';
				}
			}
			switch (menu[i].type) {
			case 'menu': // 選單
				var ulItem = L.DomUtil.create('ul', '', liItem);
				var subitemList = this._createMenu(menu[i].menu);
				if (!subitemList.length) {
					continue;
				}
				for (var idx in subitemList) {
					ulItem.appendChild(subitemList[idx]);
				}
				break;

			case '--': // 也可以當作分隔線類別，比較直觀
			case 'separator': // 分隔線
				$(aItem).addClass('separator');
				break;

			case 'action': // 自行處理的功能，需實作功能
				var obj = {
					name: menu[i].id,
					hotkey: menu[i].hotkey,
					hide: menu[i].hide
				};
				// 如果 name 是 UNO 指令
				if (map.isUnoCommand(menu[i].name)) {
					// 該指令放進白名單，該指令不會被執行，但可以取得狀態回報
					map.addAllowedCommand({name: menu[i].name});
					$(aItem).data('state', menu[i].name);
				}
				if (map.isUnoCommand(menu[i].id)) {
					$(aItem).data('type', 'unocommand');
				} else {
					$(aItem).data('type', 'action');
				}
				$(aItem).data('id', menu[i].id);

				if (menu[i].hotkey !== undefined) {
					$(aItem).addClass('item-has-hotkey');
				}

				// 最後將該 Action ID 加入白名單中
				map.addAllowedCommand(obj);
				break;

			default:
				// uno 指令
				if (menu[i].uno !== undefined) {
					$(aItem).data('type', 'unocommand');
					$(aItem).data('uno', menu[i].uno);
					$(aItem).data('tag', menu[i].tag);
					if (menu[i].hotkey !== undefined) {
						$(aItem).addClass('item-has-hotkey');
					}
					// 將該指令加入白名單中
					map.addAllowedCommand({name: menu[i].uno, hotkey: menu[i].hotkey, hide: menu[i].hide});
				}
				break;
			}

			// 被 hide(有可能是功能尚未完成，故不顯示)
			if (menu[i].hide === true) {
				$(aItem).css('display', 'none');
			}

			itemList.push(liItem);
		}

		// 3. 最後一行不能是分隔線
		if (itemList.length > 0) {
			aItem = itemList[itemList.length - 1].firstChild;
			if ($(aItem).hasClass('separator')) {
				itemList.pop();
			}
		}
		this._level --;
		return itemList;
	},

	_getItems: function() {
		return $(this._menubarCont).children().children('ul').children('li').add($(this._menubarCont).children('li'));
	},

	_getItem: function(targetId) {
		var items = this._getItems();
		var found = $(items).filter(function() {
			var item = this;
			var id = $(item).attr('id');
			if (id && id == 'menu-' + targetId) {
				return true;
			}
			return false;
		});
		return found.length ? found : null;
	},

	hasItem: function(targetId) {
		return this._getItem(targetId) != null;
	},

	hideItem: function(targetId) {
		var item = this._getItem(targetId);
		if (item) {
			$(item).css('display', 'none');
		}
	},

	showItem: function(targetId) {
		var item = this._getItem(targetId);
		if (item)
			$(item).css('display', '');
	},

	_loadMenubar: function(docType) {
		if (docType === 'drawing')
			docType = 'presentation';

		var that = this;
		var jsonUrl = 'uiconfig/' + docType + '/menubar.json';
		$.ajax({
			type: 'GET',
			url: jsonUrl,
			cache: false,
			async: false,
			dataType: 'json',
			success: function(menubar) {
				that._createFileIcon();
				that._initializeMenu(menubar);
				that._bindMenuEvent();
				that._createHeadFooterItem();
				that._createLanguageItem();
				that._initialized = true;
				// 等 menubar 初始化完畢
				// 再顯示最後修改時間
				$('#menu-last-mod').show();
				// 顯示檔案名稱
				$('#document-name-input').show();
			},
			error: function(/*xhr, ajaxOptions, thrownError*/) {
				alert('An error occurred while processing JSON file.');
			}
		});
	},

	_initializeMenu: function(menu) {
		this._level = 0;
		var menuHtml = this._createMenu(menu);
		for (var i in menuHtml) {
			this._menubarCont.appendChild(menuHtml[i]);
		}
		// initialize menubar plugin
		$('#main-menu').smartmenus({
			hideOnClick: true,
			showOnClick: true,
			hideTimeout: 0,
			hideDuration: 0,
			showDuration: 0,
			showTimeout: 0,
			collapsibleHideDuration: 0,
			subIndicatorsPos: 'append'
		});
		$('#main-menu').attr('tabindex', 0);
	}
});

L.control.menubar = function (options) {
	return new L.Control.Menubar(options);
};

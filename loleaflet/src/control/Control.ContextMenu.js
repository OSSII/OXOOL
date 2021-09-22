/* -*- js-indent-level: 8 -*- */
/*
* Control.ContextMenu
*/

/* global $ _UNO _ removeAccessKey loleafletLogging */
L.Control.ContextMenu = L.Control.extend({
	options: {
		SEPARATOR: '---------',
		ASSIGNLAYOUT: '.uno:AssignLayout'
	},

	// 替代命令(有些指令無法直接執行，但有替代命令)
	_alternativeCommand: {
		'text': {
			'.uno:SplitCell': 'dialog:SplitCell', // 分割儲存格
			'.uno:ExternalEdit': 'externaledit', // 以外部程式編輯
			'.uno:SaveGraphic': 'savegraphic', // 儲存圖片
		},
		'spreadsheet': {
			'.uno:InsertCell': 'dialog:InsertCell', // 插入儲存格
			'.uno:DeleteCell': 'dialog:RemoveCell', // 刪除儲存格
			'.uno:Delete': 'dialog:DeleteCell', // 清除儲存格
			'.uno:ExternalEdit': 'externaledit', // 以外部程式編輯
			'.uno:SaveGraphic': 'savegraphic', // 儲存圖片
			'.uno:HyperlinkDialog': 'sethyperlink', // 插入/編輯超連結
			'.uno:EditShapeHyperlink': 'sethyperlink', // 編輯圖案/圖片超連結
		},
		'presentation': {
			'.uno:ExternalEdit': 'externaledit', // 以外部程式編輯
			'.uno:SaveGraphic': 'savegraphic', // 儲存圖片
		}
	},

	onAdd: function(map) {
		this._prevMousePos = null;
		map.on('updatepermission', this._onUpdatePermission, this); // Check Permission
	},

	// Add by Firefly <firefly@ossii.com.tw>
	// Right-click menu only in edit mode.
	_onUpdatePermission: function(e) {
		if (e.perm === 'edit') {
			this._map.on('locontextmenu', this._onContextMenu, this);
			this._map.on('mousedown', this._onMouseDown, this);
			this._map.on('keydown', this._onKeyDown, this);
		}
	},

	_onMouseDown: function(e) {
		this._prevMousePos = {x: e.originalEvent.pageX, y: e.originalEvent.pageY};

		$.contextMenu('destroy', '.leaflet-layer');
	},

	_onKeyDown: function(e) {
		if (e.originalEvent.keyCode === 27 /* ESC */) {
			$.contextMenu('destroy', '.leaflet-layer');
		}
	},

	_onContextMenu: function(obj) {
		var that = this;
		var map = this._map;
		if (map._permission !== 'edit' && map._permission !== 'view') {
			return;
		}

		var contextMenu = this._createContextMenuStructure(obj);

		// debug mode 在右鍵選單最後加上輸入框，方便直接執行 uno 指令
		if (loleafletLogging === 'true') {
			contextMenu['sepuno'] = this.options.SEPARATOR;
			contextMenu['unocmdtext'] = {
				name: 'UNO command',
				type: 'text',
				events :{
					click: function(e) {
						e.stopPropagation();
					},
					keyup: function(e) {
						if (e.keyCode === 13) { // 按下 Enter
							console.debug(e.target.value);
							map.sendUnoCommand(e.target.value);
						}
					}
				}
			};
		}

		L.installContextMenu({
			selector: '.leaflet-layer',
			className: 'loleaflet-font',
			trigger: 'none',
			zIndex: 1100,
			build: function() {
				return {
					callback: function(key) {
						// Modify by Firefly <firefly@ossii.com.tw>
						// 把插入註解的行為統一化
						if (key === '.uno:InsertAnnotation')
							map.insertComment();
						else {
							var docType = map.getDocType();
							if (docType === 'drawing') {
								docType = 'presentation';
							}
							// 是否有替代指令？
							var altCmd = that._alternativeCommand[docType][key];
							map.executeAllowedCommand(altCmd !== undefined ? altCmd : key);
							// Give the stolen focus back to map
							map.focus();
						}
					},
					items: contextMenu
				};
			}
		});

		$('.leaflet-layer').contextMenu(this._prevMousePos);
	},

	_createContextMenuStructure: function(obj) {
		var docType = this._map.getDocType();
		var ctxMenu = {};
		var sepIdx = 1, itemName;
		var isLastItemText = false;

		for (var idx in obj.menu) {
			var item = obj.menu[idx];

			if (item.command === '.uno:Paste' && docType === 'spreadsheet') {
				item.enabled = 'true';
			}

			if (item.enabled === 'false') { continue; }

			if (item.type === 'separator') {
				if (isLastItemText) {
					ctxMenu['sep' + sepIdx++] = this.options.SEPARATOR;
				}
				isLastItemText = false;
				continue;
			}

			// 是指令且不在白名單中，就不加入右鍵選單
			// 白名單來源就是 menubar 所有的 uno command
			if (item.type === 'command' &&
				!this._map.isAllowedCommand(item.command))
			{
				continue;
			}

			// 取得 uno command 翻譯
			itemName = _UNO(item.command, docType, true);
			// 沒有翻譯的話，用 item.text 當選項標題
			if (item.command === '.uno:' + itemName)
			{
				itemName = removeAccessKey(_(item.text));
			}

			// Calc 超連結指令 .uno:HyperlinkDialog
			if (item.command === '.uno:HyperlinkDialog' && docType === 'spreadsheet') {
				var hyperlink = this._map.hyperlinkUnderCursor;
				// 游標位置無超連結時，不顯示該選項
				if (!hyperlink) {
					continue;
				}
				itemName = _(hyperlink.link.startsWith('#') ? 'Edit worksheet hyperlink ' : 'Edit Hyperlink');
			}

			ctxMenu[item.command] = {
				name: itemName	// 選項名稱
			};

			if (item.type === 'command') {
				if (item.checktype !== undefined) {
					ctxMenu[item.command].checktype = item.checktype;
					ctxMenu[item.command].checked = (item.checked === 'true');
				}
				isLastItemText = true;
			} else if (item.type === 'menu') {
				var submenu = this._createContextMenuStructure(item);
				// ignore submenus with all items disabled
				if (Object.keys(submenu).length === 0) {
					delete ctxMenu[item.command];
					continue;
				}
				ctxMenu[item.command].items = submenu;
				isLastItemText = true;
			} else {
				console.debug('未知的 item.type', item);
			}

			// 指定 icon
			ctxMenu[item.command].icon = (function(opt, $itemElement, itemKey, item) {
				if (itemKey.startsWith(this.options.ASSIGNLAYOUT)) {
					item.checktype = 'checkmark';
					var layoutNo = itemKey.substring(34);
					var assignLayout = this._map['stateChangeHandler'].getItemValue(this.options.ASSIGNLAYOUT);
					item.checked = (assignLayout === layoutNo);
				}
				return this._map.contextMenuIcon($itemElement, itemKey, item);
			}).bind(this);
		}

		// Remove separator, if present, at the end
		var lastItem = Object.keys(ctxMenu)[Object.keys(ctxMenu).length - 1];
		if (lastItem !== undefined && lastItem.startsWith('sep')) {
			delete ctxMenu[lastItem];
		}

		return ctxMenu;
	}
});

L.control.contextMenu = function (options) {
	return new L.Control.ContextMenu(options);
};

// Using 'click' and <a href='#' is vital for copy/paste security context.
L.installContextMenu = function(options) {
	options.itemClickEvent = 'click';
	// Modify by Firefly <firefly@ossii.com.tw>
	var events = options.events;
	if (events === undefined) {
		events = {};
	}
	if (events.show === undefined) {
		events.show = function(/*options*/) {
			// 顯示右鍵選單前
			$.SmartMenus.hideAll(); // 強制隱藏 Menubar 選單
			L.hideAllToolbarPopup(); // 強制隱藏所有 Toolbar 選單
		};
	}
	options.events = events;
	//------------------------------------------------------

	var rewrite = function(items) {
		if (items === undefined)
			return;
		var keys = Object.keys(items);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (items[key] === undefined)
				continue;
			if (!items[key].isHtmlName) {
				console.debug('re-write name ' + items[key].name);
				items[key].name = '<span>' + items[key].name + '</span>';
				items[key].isHtmlName = true;
			}
			rewrite(items[key].items);
		}
	}
	rewrite(options.items);
	$.contextMenu(options);
};

// Add by Firefly <firefly@ossii.com.tw>
// 強制隱藏所有 toolbar 選單
L.hideAllToolbarPopup = function() {
	var w2uiPrefix = '#w2ui-overlay';
	var $dom = $(w2uiPrefix);
	// type 為 color & text-color 會在最頂層？(搔頭)
	if ($dom.length > 0) {
		$dom.removeData('keepOpen')[0].hide();
	} else { // 隱藏所有 Toolbar 選單(如果有的話)
		for (var key in window.w2ui) {
			$dom = $(w2uiPrefix + '-' + key);
			if ($dom.length > 0) {
				$dom.removeData('keepOpen')[0].hide();
			}
		}
	}
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.Tabs is used to switch sheets in Calc
 */

/* global $ _ _UNO */
L.Control.Tabs = L.Control.extend({
	onAdd: function(map) {
		map.on('updatepermission', this._onUpdatePermission, this);
		this._initialized = false;
	},

	_onUpdatePermission: function(e) {
		if (this._map.getDocType() !== 'spreadsheet') {
			return;
		}

		if (!this._initialized) {
			this._initialize();
		}

		if (window.mode.isMobile() == true) {
			if (e.perm === 'edit') {
				$('.spreadsheet-tabs-container')
					.removeClass('mobile-view')
					.addClass('mobile-edit');
			} else {
				$('.spreadsheet-tabs-container')
					.addClass('mobile-view')
					.addClass('mobile-edit');
			}
		}
	},

	_initialize: function () {
		this._initialized = true;
		this._tabsInitialized = false;
		this._spreadsheetTabs = {};
		this._tabForContextMenu = 0;
		var map = this._map;
		var docContainer = map.options.documentContainer;
		this._tabsCont = L.DomUtil.create('div', 'spreadsheet-tabs-container', docContainer.parentElement);
		L.DomEvent.on(this._tabsCont, 'touchstart',
			function (e) {
				if (e && e.touches.length > 1) {
					L.DomEvent.preventDefault(e);
				}
			},
			this);

		map.on('updateparts', this._updateDisabled, this);
		map.on('resize', this._selectedTabScrollIntoView, this);

		L.installContextMenu({
			selector: '.spreadsheet-tab',
			className: 'loleaflet-font',
			autoHide: true,
			callback: (function(key) {
				if (key === 'InsertColumnsAfter') {
					map.insertPage(this._tabForContextMenu);
				}
				if (key === 'InsertColumnsBefore') {
					map.insertPage(this._tabForContextMenu + 1);
				}
			}).bind(this),
			items: {
				'InsertColumnsAfter': { // 之前插入工作表
					name: _('Insert sheet before this'),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'InsertColumnsBefore': { // 之後插入工作表
					name: _('Insert sheet after this'),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'DuplicatePage': { // 移動複製工作表
					name: _UNO('.uno:Move', 'spreadsheet', true),
					callback: (function() {
						map.fire('executeDialog', {dialog: 'MoveTable'});
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'DeleteTable': { // 刪除工作表
					name: _UNO('.uno:Remove', 'spreadsheet', true),
					callback: (function(/*key, options*/) {
						map.fire('executeDialog', {dialog: 'RemoveTable'});
					}).bind(this),
					disabled: (function() {
						// 只有一個工作表顯示，或該工作表被保護就不能執行
						return (map.getNumberOfVisibleParts() === 1 || this._isProtedted());
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				 },
				'DBTableRename': { // 重新命名工作表
					name: _UNO('.uno:RenameTable', 'spreadsheet', true),
					callback: (function(/*key, options*/) {
						map.fire('executeDialog', {dialog: 'RenameTable'});
					}).bind(this),
					disabled: (function() {
						return this._isProtedted(); // 被保護
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				} ,
				'sep01': '----',
				'Protect': { // 保護工作表
					name: _UNO('.uno:Protect', 'spreadsheet', true),
					disabled: function(/*key, opt*/) {
						// 透過 WOPI 編輯，且不是檔案擁有者的話，就不能執行保護/解除保護工作表
						if (map.options.wopi && !map['wopi'].DocumentOwner) {
							return true;
						}
						return false;
					}.bind(this),
					callback: (function() {
						var pInfo = map.getPartProperty(); // 該工作表資料
						// 工作表有保護
						if (pInfo && pInfo.protected === '1') {
							var args = {
								Protect: {
									type: 'boolean',
									value: false
								}
							}
							// 有密碼
							if (pInfo.protectedWithPass === '1') {
								L.dialog.prompt({
									title: _('Unprotect sheet'),
									icon: 'information',
									message: _('Password'),
									password: true,
									callback: function(data) {
										console.debug('password = ' + data);
										args.PassWord = {
											type: 'string',
											value: data
										},
										map.sendUnoCommand('.uno:OxProtect', args);
									}
								});
							// 沒有密碼的話就直接解除保護
							} else {
								map.sendUnoCommand('.uno:OxProtect', args);
							}
						} else {
							// TODO: 實作外部載入保護工作表 dialog
							L.dialog.run('ProtectTable');
						}
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						item.checktype = 'checkmark';
						item.checked = this._isProtedted();
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'Hide': { // 隱藏工作表
					name: _UNO('.uno:Hide', 'spreadsheet', true),
					callback: (function() {
						map.hidePage();
					}).bind(this),
					disabled: (function() {
						// 只有一個工作表
						return map.getNumberOfVisibleParts() === 1;
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'Show': { // 顯示工作表
					name: _UNO('.uno:Show', 'spreadsheet', true),
					callback: (function() {
						map.fire('executeDialog', {dialog: 'ShowTable'});
					}).bind(this),
					disabled: (function() {
						// 沒有隱藏的工作表才能執行
						return !this._map.hasAnyHiddenPart();
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'BackgroundColor': { // 設定標籤色彩
					name: _UNO('.uno:TabBgColor', 'spreadsheet', true),
					callback: (function() {
						map.fire('executeDialog', {dialog: 'SetTabBgColor'});
					}).bind(this),
					disabled: (function() {
						// 保護狀態示
						return this._isProtedted();
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'sep02': '----',
				'ToggleSheetGrid': { // 切換檢視格線
					name: _UNO('.uno:ToggleSheetGrid', 'spreadsheet', true),
					callback: (function() {
						map.sendUnoCommand('.uno:ToggleSheetGrid');
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				}
			},
			zIndex: 1000
		});
	},

	_updateDisabled: function (e) {
		var parts = e.parts;
		var selectedPart = e.selectedPart;
		var docType = e.docType;
		if (docType === 'text') {
			return;
		}
		if (docType === 'spreadsheet') {
			if (!this._tabsInitialized) {
				// make room for the preview
				var docContainer = this._map.options.documentContainer;
				L.DomUtil.addClass(docContainer, 'spreadsheet-document');
				setTimeout(L.bind(function () {
					this._map.invalidateSize();
					$('.scroll-container').mCustomScrollbar('update');
					$('.scroll-container').mCustomScrollbar('scrollTo', [0, 0]);
				}, this), 100);
				this._tabsInitialized = true;
			}

			// 紀錄水平捲動位置
			var horizScrollPos = 0;
			var scrollDiv = L.DomUtil.get('spreadsheet-tab-scroll');
			if (scrollDiv) {
				horizScrollPos = scrollDiv.scrollLeft;
			}

			if ('partNames' in e) {
				while (this._tabsCont.firstChild) {
					this._tabsCont.removeChild(this._tabsCont.firstChild);
				}
				var ssTabScroll = L.DomUtil.create('div', 'spreadsheet-tab-scroll', this._tabsCont);
				ssTabScroll.id = 'spreadsheet-tab-scroll';

				for (var i = 0; i < parts; i++) {
					if (e.hiddenParts.indexOf(i) !== -1)
						continue;
					var id = 'spreadsheet-tab' + i;
					var tab = L.DomUtil.create('button', 'spreadsheet-tab', ssTabScroll);
					L.DomEvent.enableLongTap(tab, 15, 1000);

					L.DomEvent.on(tab, 'contextmenu', function(j) {
						return function() {
							this._tabForContextMenu = j;
							$('#spreadsheet-tab' + j).contextMenu();
						}
					}(i).bind(this));

					var txtNode = document.createTextNode(e.partNames[i]);
					tab.appendChild(txtNode);
					tab.id = id;
					this._setTabInfo(i, tab);

					L.DomEvent
						.on(tab, 'click', L.DomEvent.stopPropagation)
						.on(tab, 'click', L.DomEvent.stop)
						.on(tab, 'mousedown', this._setPart, this)
						.on(tab, 'mousedown', this._map.focus, this._map);
					this._spreadsheetTabs[id] = tab;
				}
			}
			for (var key in this._spreadsheetTabs) {
				var part = parseInt(key.match(/\d+/g)[0]);
				L.DomUtil.removeClass(this._spreadsheetTabs[key], 'spreadsheet-tab-selected');
				if (part === selectedPart) {
					L.DomUtil.addClass(this._spreadsheetTabs[key], 'spreadsheet-tab-selected');
					var pInfo = this._map.getPartProperty(part); // 讀取工作表屬性
					if (pInfo !== undefined) {
						var bgColor = this._convertToHtmlColor(pInfo.bgColor);
						if (bgColor !== '') {
							$(this._spreadsheetTabs[key]).css('border-bottom-color', bgColor);
						}
					}
				}
			}

			// 恢復水平捲動位置
			scrollDiv = L.DomUtil.get('spreadsheet-tab-scroll');
			if (scrollDiv) {
				if (this._map.insertPage && this._map.insertPage.scrollToEnd) {
					this._map.insertPage.scrollToEnd = false;
					scrollDiv.scrollLeft = scrollDiv.scrollWidth;
				} else {
					scrollDiv.scrollLeft = horizScrollPos;
				}
			}

			// 超出可視範圍的 SelectedTab 置於可視範圍內
			var SelectedPosition = $('#spreadsheet-tab' + selectedPart).position()
			if (SelectedPosition) {
				var visualWidth = $('.spreadsheet-tab-scroll').width(); // 可視範圍 0~width
				var selectedLeft = SelectedPosition.left;
				if (selectedLeft > visualWidth) scrollDiv.scrollLeft = visualWidth; // 水平捲動至最右
				if (selectedLeft < 0) scrollDiv.scrollLeft = 0; // 水平捲動至最左
			}

		}
		this._selectedTabScrollIntoView();
	},

	_setPart: function (e) {
		var part = e.target.id.match(/\d+/g)[0];
		if (part !== null) {
			this._map.setPart(parseInt(part), /*external:*/ false, /*calledFromSetPartHandler:*/ true);
		}
	},

	// 設定工作表標籤(未選擇)
	_setTabInfo: function(idx, tab) {
		var pInfo = this._map.getPartProperty(idx);
		if (pInfo !== undefined) {
			// 設定標籤背景及文字顏色
			var bgColor = this._convertToHtmlColor(pInfo.bgColor);
			if (bgColor !== '') {
				var linearColor = '(#f8f8f8,' + bgColor + ')'; // 背景層漸
				$(tab).css({
					'background-color': bgColor,
					'background': 'linear-gradient' + linearColor,
					'color': pInfo.bgIsDark === '1' ? '#ffffff' : '#000000'
				});
			}
			// 工作表是否保護
			if (pInfo.protected === '1') {
				var span = L.DomUtil.create('span', 'spreadsheet-tab-protected', tab);
				tab.insertBefore(span, tab.firstChild);
			}
		}
	},

	// 檢查工作表是否被保護
	_isProtedted: function(idx) {
		var isProtected = false
		var partInfo = this._map.getPartProperty(idx);

		if (partInfo !== undefined) {
			isProtected = partInfo.protected === '1';
		}
		return isProtected;
	},

	_convertToHtmlColor: function(color) {
		if (color === '-1') {
			return '';
		}
		var sColor = parseInt(color).toString(16);
		return '#' + '0'.repeat(6 - sColor.length) + sColor; // 不足六碼前面補0
	},

	// 捲動選取的標籤到可視區內
	_selectedTabScrollIntoView: function() {
		var container = this._tabsCont;
		var scrollTab = this._tabsCont.firstChild; // div#spreadsheet-tab-scroll

		// 目前選取的標籤 DOM
		var tab = scrollTab.children[this._map.getCurrentPartNumber()];
		if (!tab) return false;
		// 取得可視區範圍所在範圍
		var containerRect = container.getBoundingClientRect();
		// 標籤所在範圍
		var tabRect = tab.getBoundingClientRect();
		var scrollOffsetX = 0; // 預設捲動位置
		// 選取的標籤 左邊被遮住
		if (tabRect.left < containerRect.left) {
			scrollOffsetX = tab.offsetLeft
		// 選取的標籤 右邊被遮住
		} else if (tabRect.right > containerRect.right) {
			scrollOffsetX = tab.offsetLeft - containerRect.width + tabRect.width;
		}

		// 捲動位置不為 0，需捲動到指定位置
		if (scrollOffsetX !== 0) {
			$(scrollTab).animate({scrollLeft: scrollOffsetX}, 100);
		}
	}
});

L.control.tabs = function (options) {
	return new L.Control.Tabs(options);
};

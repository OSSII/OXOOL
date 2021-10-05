/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.AutoFilter
 * Calc 自動篩選
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.AutoFilter = {
	_dialog: null,

	_l10n: [
		_('Top 10'), // 前 10 筆
		_('Non-Empty'), // 非空白
		_('Search items'), // 輸入搜尋
		_('Show only the current item.'), // 只顯示選取項目，其他不顯示
		_('Hide only the current item.'), // 除了選取項目不顯示，其他都顯示
		_('Ctrl + left mouse button for multiple selections.'), // Ctrl + 滑鼠左鍵可複選
	],

	initialize: function() {

	},

	run: function(args) {
		console.debug(args);

		// 自動篩選按鈕所在欄
		this._column = parseInt(args.column);
		// 自動篩選按鈕所在列
		this._row = parseInt(args.row);

		this.createDialog(args); // 建立視窗

		// 先把儲存格游標移至自動篩選儲存格
		//this._map.sendUnoCommand('.uno:GoToCell?ToPoint:string=' + args.address);

		// 沒有標題欄
		var dialogClass = 'lokdialog_container lokdialog_notitle';

		// 縮放比
		var zoomScale = 1.0 / this._map.getZoomScale(this._map.getZoom(), 10);
		var topPx = parseInt(args.top) / zoomScale;
		var leftPx = parseInt(args.left) / zoomScale;
		var widthPx = parseInt(args.width) / zoomScale;
		var heightPx = parseInt(args.height) / zoomScale;

		// 轉換為頁面絕對座標
		var origin = this._map.getPixelOrigin();
		var panePos = this._map._getMapPanePos();
		var left = leftPx + panePos.x - origin.x;
		var top = topPx + panePos.y - origin.y;
		// 清單位置預設在儲存格下方
		var position = {
			my: 'left top',
			at: 'left+' + left + ' top+' + (top + heightPx),
			of: '#document-container',
			collision: 'fit'
		};

		$(this._dialog).dialog({
			dialogClass: dialogClass,
			position: position,
			width: widthPx,
			minWidth: 150, // 最窄不得低於 150
			//maxWidth: 'none',
			//height: 'auto',
			//minHeight: 'none',
			//maxHeight: 'none',
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			draggable: false,
			closeOnEscape: true,
			open: function(/*e, ui*/) {
				// 點擊視窗外位置就關掉視窗
				$('.ui-widget-overlay').click(function () {
					this.closeDialog();
				}.bind(this));
			}.bind(this),
			close: function(/*e, ui*/) {
				this.closeDialog();
			}.bind(this),
		});
	},

	/**
	 * 建立視窗
	 */
	createDialog: function(args) {
		// 已經有視窗就結束
		if (this._dialog) {
			return;
		}

		this.checkItems.setParent(this);

		this._initialized = false;
		// 建立視窗
		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		// 產生唯一 ID
		this._uniqueId = $(this._dialog).uniqueId().attr('id');

		$(this._dialog).css({
			'font-size': '12px',
			'padding': '3px',
			'margin': '0',
			'background-color': '#d0d0d0',
			'overflow': 'hidden'
		});

		// 文字由右至左
		if (args.isRTL === 'true') {
			L.DomUtil.setStyle(this._dialog, 'direction', 'rtl');
		}

		// 建構選單
		this._makeMenu();
		// 搜尋項目輸入區
		this._makeSearchInput(); // 建構搜尋輸入
		// 全部選取/取消圖示按鈕區
		this._makeCheckButton(); // 建構全選/單選區
		// 篩選項目列表區
		this._makeCheckboxList(args.list); // 建構篩選項目列表區
		// 確認按鈕區
		this._makeOkCancelButton(); // 建構確定/取消按鈕區

		this._initialized = true;

		// 翻譯 dialog
		this._map.translationElement(this._dialog);
		// 更新勾選狀態
		this.checkItems.updateCheckMode();
	},

	/**
	 * 建構選單
	 */
	_makeMenu: function() {
		this._menu = L.DomUtil.create('ul', '', this._dialog);
		var menuItem = [
			{
				type: 'action',
				cmd:  'SortAscending',
				icon: this._map.getUnoCommandIcon('.uno:SortAscending'),
				text: '.uno:SortAscending'
			},
			{
				type: 'action',
				cmd:  'SortDescending',
				icon: this._map.getUnoCommandIcon('.uno:SortDescending'),
				text: '.uno:SortDescending'
			},
			{
				type: '',
			},
			{
				type: 'action',
				cmd:  'Top10',
				text: _('Top 10')
			},
			{
				type: 'action',
				cmd:  'Empty',
				text: _('Empty')
			},
			{
				type: 'action',
				cmd:  'NonEmpty',
				text: _('Non-Empty')
			},
			{
				type: ''
			},
			{
				type: 'action',
				cmd:  'Custom',
				icon: this._map.getUnoCommandIcon('.uno:DataFilterStandardFilter'),
				text: '.uno:DataFilterStandardFilter'
			}
		];

		menuItem.forEach(function(data) {
			var item = L.DomUtil.create('li', '', this._menu);
			switch (data.type) {
			case 'action':
				item.setAttribute('action-mode', data.cmd);
				var div = L.DomUtil.create('div', '', item);
				div.textContent = this._map.isUnoCommand(data.text)
								? _UNO(data.text, this._map.getDocType(), true) : data.text;

				$('<img></img>').css({
					'width': '12px',
					'height': '12px',
					'margin-right': '6px',
					'vertical-align': 'text-bottom'
				}).attr('src', (data.icon ? data.icon : L.Util.emptyImageUrl))
				.prependTo(div);
				break;
			default:
				break;
			}
		}.bind(this));

		$(this._menu).menu({
			// 點選選項
			select: function(e, ui) {
				if (ui.item.length !== 1) {
					return;
				}

				var actionMode = $(ui.item[0]).attr('action-mode');
				// 如果是 uno 指令，就直接送出
				if (this._map.isUnoCommand(actionMode)) {
					this._map.sendUnoCommand(actionMode);
				} else {
					var unoArgs = {
						Mode: {
							type: 'string',
							value: actionMode
						},
						Column: {
							type: 'unsigned short',
							value: this._column
						},
						Row: {
							type: 'unsigned short',
							value: this._row
						}
					};
					this._map.sendUnoCommand('.uno:AutoFilterAction', unoArgs);
				}
				this.closeDialog();
			}.bind(this)
		});
	},

	/**
	 * 建構搜尋輸入區
	 */
	_makeSearchInput: function() {
		this._searchInput = L.DomUtil.create('div', '', this._dialog);
		$(this._searchInput).css({
			'margin-top': '3px'
		});

		var searchBox = L.DomUtil.create('input', '', this._searchInput);
		$(searchBox).css({
			'width': '-webkit-fill-available'
		}).attr({
			'id': this._uniqueId + 'search',
			'type': 'search',
			'placeholder': _('Search items'),
			'spellcheck': false
		}).on('input', function(e) {
			this.checkItems.searchHandler(e);
		}.bind(this)).on('compositionstart', function(e) {
			this.checkItems.searchHandler(e);
		}.bind(this)).on('compositionupdate', function(e) {
			this.checkItems.searchHandler(e);
		}.bind(this)).on('compositionend', function(e) {
			this.checkItems.searchHandler(e);
		}.bind(this));
	},

	/**
	 * 建構全選/單選區
	 */
	_makeCheckButton: function() {
		var selectCurrentIcon = L.Icon.Default.imagePath + '/res/popup_select_current.svg';
		var unSelectCurrentIcon = L.Icon.Default.imagePath + '/res/popup_unselect_current.svg';
		this._checkButton = L.DomUtil.create('div', '', this._dialog);
		$(this._checkButton).css({
			'margin-top': '2px',
			'height': '24px',
			'line-height': '24px'
		});

		// 建立全選/全不選/半選按鈕
		this._allButton = L.DomUtil.create('span', '', this._checkButton);
		$(this._allButton).css({
			'margin-left': '4px',
			'vertical-align': 'middle',
			'cursor': 'pointer'
		}).click(function() {
			this.checkItems.allButtonClick();
		}.bind(this));

		this._checkMode = L.DomUtil.create('img', '', this._allButton);
		$(this._checkMode).attr({
			'src': L.Util.emptyImageUrl
		}).css({
			'width': '14px',
			'height': '14px',
			'vertical-align': 'middle',
		});

		var allText = L.DomUtil.create('span', '', this._allButton);
		$(allText).attr({
			'_': 'All'
		}).css({
			'margin-left': '6px',
			'vertical-align': 'middle',
		});

		var selectUnSelectButton = L.DomUtil.create('span', '', this._checkButton);
		$(selectUnSelectButton).css({
			'margin-right': '4px',
			'vertical-align': 'middle',
			'float': 'right'
		});
		this._showCurrentButton = L.DomUtil.create('img', '', selectUnSelectButton);
		$(this._showCurrentButton).attr({
			'src': selectCurrentIcon,
			'title': 'Show only the current item.'
		}).css({
			'margin-right': '12px',
			'width': '14px',
			'height': '14px',
			'vertical-align': 'middle',
			'cursor': 'pointer'
		}).click(function() {
			this.checkItems.showCurrentButtonClick();
		}.bind(this));

		this._hideCurrentButton = L.DomUtil.create('img', '', selectUnSelectButton);
		$(this._hideCurrentButton).attr({
			'src': unSelectCurrentIcon,
			'title': 'Hide only the current item.'
		}).css({
			'width': '14px',
			'height': '14px',
			'vertical-align': 'middle',
			'cursor': 'pointer'
		}).click(function() {
			this.checkItems.hideCurrentButtonClick();
		}.bind(this));
	},

	/**
	 * 操作篩選項目各項功能總集
	 */
	checkItems: {
		_parent: null,
		_length: 0,
		_checked: 0,
		_selectedIds: {},
		_onComposition: false,
		_prevCheckItem: null,

		/**
		 * 設定所屬物件
		 */
		setParent: function(parent) {
			this._parent = parent;
			this._length = 0;
			this._checked = 0;
			this._selectedIds = {};
			this._onComposition = false;
			this._prevCheckItem = null;
		},

		/**
		 *
		 * @param {object} e - 搜尋欄位輸入 event
		 */
		searchHandler: function(e) {
			switch (e.type) {
			case 'compositionstart': // 輸入法組字開始
			case 'compositionupdate': // 輸入法更新組字資料
				this._onComposition = true;
				break;
			case 'compositionend': // 輸入法組字結束
				this._onComposition = false;
				break;
			}
			// 不在組字狀態才過濾
			if (!this._onComposition) {
				var text = e.target.value; // 目前輸入的字串
				var nodes = this.getCheckBoxNodes(); // 取得所有項目列表
				// 依序檢查每個 checkbox value 是否包含目前輸入的字串
				for (var i = 0; i < nodes.length ; i++) {
					// 如果沒有搜尋字串，就顯示該篩選項目
					if (text === '') {
						$(nodes[i]).show();
					// 找出篩選文字是否包含搜尋文字
					} else {
						var value = nodes[i].firstChild.value;
						if (value.indexOf(text) >= 0) {
							$(nodes[i]).show();
						} else {
							$(nodes[i]).hide();
						}
					}
				}
			}
		},

		/**
		 * 建立篩選項目列表
		 * @param {object} list - OxOffice 傳來的篩選項目陣列
		 * 		{
		 * 			item: 'text',
		 * 			checked: 'true' or 'false',
		 *			isdate: 'true' or 'false'
		 * 		}
		 */
		setCheckBoxList: function(list) {
			var that = this;
			this._length = list.length; // 紀錄總數量
			list.forEach(function(data, idx) {
				var value = (data.item.length ? data.item : '(' + _('Empty') + ')');

				var item = L.DomUtil.create('li', 'ui-widget-content', this._parent._selectable);
				$(item).css({
					'border': 0,
					'padding': 0
				}).attr({
					'item-id': idx
				}).click(function() {
					// 桌面模式不處理點擊
					if (window.mode.isDesktop()) {
						return;
					}
					// 已經選取過了
					if (that._prevCheckItem) {
						// 前一個 ID
						var id = $(that._prevCheckItem).attr('item-id');
						// 解除選取
						that.checkBoxUnselected(id);
						// 移除選取 bar
						$(that._prevCheckItem).removeClass('ui-selected');
					}

					// 紀錄為最近選取的項目
					that._prevCheckItem = this;
					// 自己的 ID
					var myId = $(this).attr('item-id');
					// 紀錄選取本項 ID
					that.checkBoxSelected(myId);
					// 顯示選取 bar
					$(that._prevCheckItem).addClass('ui-selected');
				});

				var isChecked = (data.checked === 'true');
				if (isChecked) {
					this._checked ++;
				}
				var checkbox = L.DomUtil.create('input', '', item);
				$(checkbox).css({
					'vertical-align': 'middle'
				}).attr({
					'isdate': data.isdate,
					'type': 'checkbox',
					'value': data.item,
					'checked': isChecked
				}).change(function(e) {
					this.checkBoxChange(e.target);
				}.bind(this));

				var label = L.DomUtil.create('span', '', item);
				label.textContent = value;

			}.bind(this));
		},

		/**
		 * 某個 checkbox 被選取(非狀態變更)
		 * @param {string} checkboxId - 被選取的 checkbox id(亦即該 checkbox 的 index)
		 */
		checkBoxSelected: function(checkboxId) {
			// 把索引值加入選取陣列
			if (checkboxId !== undefined) {
				this._selectedIds[checkboxId] = true;
			}
			this.updateCheckMode();
		},

		/**
		 * 某個 checkbox 被選取消選取(非狀態變更)
		 * @param {string} checkboxId - 被選取的 checkbox id(亦即該 checkbox 的 index)
		 */
		 checkBoxUnselected: function(checkboxId) {
			 // 從選取陣列移除索引
			if (checkboxId !== undefined) {
				delete this._selectedIds[checkboxId];
			}
			this.updateCheckMode();
		},

		/**
		 * 傳回被選取索引陣列
		 * @returns object - 被選取的索引陣列
		 */
		getSelectedCheckBox: function() {
			return this._selectedIds;
		},

		/**
		 * 只顯示被選取的篩選項目按鈕被點擊
		 * P.S.: 被選取的項目要勾選，其餘不勾選
		 */
		showCurrentButtonClick: function() {
			var keys = Object.keys(this._selectedIds);
			if (keys.length > 0) {
				var nodes = this.getCheckBoxNodes(); // 取得所有項目列表
				// 依序處理每個 checkbox
				for (var i = 0; i < nodes.length ; i++) {
					var idx = i.toString(); // 轉成字串
					var checkbox = nodes[i].firstChild;
					// 如果選取陣列中有該索引值，勾選此項，否則不勾
					checkbox.checked = (this._selectedIds[idx] === true);
				}
				this._checked = keys.length;
				this.updateCheckMode();
			}
		},

		/**
		 * 隱藏被選取的篩選項目按鈕被點擊
		 * P.S.: 被選取的項目要不勾選，其餘勾選
		 */
		hideCurrentButtonClick: function() {
			var keys = Object.keys(this._selectedIds);
			if (keys.length > 0) {
				var nodes = this.getCheckBoxNodes(); // 取得所有項目列表
				// 依序處理每個 checkbox
				for (var i = 0; i < nodes.length ; i++) {
					var idx = i.toString(); // 轉成字串
					var checkbox = nodes[i].firstChild;
					// 如果選取陣列中有該索引值，不勾選此項，否則勾選
					checkbox.checked = !(this._selectedIds[idx] === true);
				}
				this._checked = this._length - keys.length;
				this.updateCheckMode();
			}
		},

		/**
		 * 全選/全不選/半選按鈕 click
		 */
		allButtonClick: function() {
			// 如果目前沒有全選，就全選，否則全不選
			var checkAll = !this.isCheckAll() ? true : false;
			var nodes = this.getCheckBoxNodes();

			// 依序處理每個 checkbox
			for (var i = 0 ; i < nodes.length ; i++) {
				var checkbox = nodes[i].firstChild;
				checkbox.checked = checkAll;
			}
			this._checked = checkAll ? this._length : 0;
			this.updateCheckMode();
		},

		/**
		 * 取得篩選項目所有的 dom nodes
		 */
		getCheckBoxNodes: function() {
			return this._parent._selectable.childNodes;
		},

		/**
		 * 某個篩選項目狀態變更(checked/unchecked)
		 * @param {object} e
		 */
		checkBoxChange: function(checkbox) {
			// 更新 checked 數量
			this._checked += checkbox.checked ? 1 : -1;
			// 更新 dialog 相關元件
			this.updateCheckMode();
		},

		/**
		 * 篩選項目是否全選
		 */
		isCheckAll: function() {
			// 項目數量不為 0 且等於被選取數量
			return (this._length && this._checked === this._length)
		},

		/**
		 * 篩選項目是否全不選
		 */
		isUncheckAll: function() {
			// 項目數量不為 0 且被選數量等於 0
			return (this._length && this._checked === 0);
		},

		/**
		 * 更新篩選相關元件狀態
		 */
		updateCheckMode: function() {
			if (!this._parent._initialized) {
				return;
			}

			var checkIcon = L.Icon.Default.imagePath + '/res/';
			// 全部未勾選
			if (this.isUncheckAll()) {
				checkIcon += 'checkmono1.svg';
				$(this._parent._okButton).attr('disabled', true); // 確定按鈕停用
			// 全部勾選
			} else if (this.isCheckAll()) {
				checkIcon += 'checkmono2.svg';
				$(this._parent._okButton).attr('disabled', false); // 確定按鈕啟用
			// 否則就是部份勾選
			} else {
				checkIcon += 'checkmono7.svg';
				$(this._parent._okButton).attr('disabled', false); // 確定按鈕啟用
			}
			this._parent._checkMode.src = checkIcon; // 改變 icon 圖示
		}
	},

	/**
	 * 建構篩選項目列表區
	 */
	_makeCheckboxList: function(list) {
		this._checkboxContainer = L.DomUtil.create('div', '', this._dialog);
		var selectableId = this._uniqueId + 'selectable';
		$(this._checkboxContainer).css({
			'border': '1px #808080 solid',
			'background-color': '#ffffff',
			'margin-top': '2px',
			'height': '120px',
			'overflow': 'auto'
		}).attr({
			'title': _('Ctrl + left mouse button for multiple selections.')
		}).html(
			'<style>'
			+ '#' + selectableId + ' .ui-selecting { background: #64b9ff; }'
			+ '#' + selectableId + ' .ui-selected { background: #0078D7; color: white }'
			+ '</style>'
		);

		this._selectable = L.DomUtil.createWithId('ol', selectableId, this._checkboxContainer);
		$(this._selectable).css({
			'list-style-type': 'none',
			'margin': 0,
			'padding': 0
		});

		// 設定篩選項目列表
		this.checkItems.setCheckBoxList(list);

		// 桌面模式才可多選
		if (window.mode.isDesktop()) {
			// 讓各篩選項目可複選
			$(this._selectable).selectable({
				// 選取
				selected: function(e, ui) {
					this.checkItems.checkBoxSelected($(ui.selected).attr('item-id'));
				}.bind(this),
				// 取消選取
				unselected: function(e, ui) {
					this.checkItems.checkBoxUnselected($(ui.unselected).attr('item-id'));
				}.bind(this)
			});
		}
	},

	/**
	 * 建構確定/取消按鈕區
	 */
	_makeOkCancelButton: function() {
		this._buttonContainer = L.DomUtil.create('div', '', this._dialog);
		$(this._buttonContainer).css({
			'margin-top': '2px'
		});

		this._okButton = L.DomUtil.create('button', '', this._buttonContainer);
		this._cancelButton = L.DomUtil.create('button', '', this._buttonContainer);

		// 設定確定按鈕
		$(this._okButton).css({
			'width': '50%'
		}).attr({
			'_': 'OK'
		}).click(function() {
			var unoArgs = {
				Mode: {
					type: 'string',
					value: 'Normal'
				},
				Column: {
					type: 'unsigned short',
					value: this._column
				},
				Row: {
					type: 'unsigned short',
					value: this._row
				},
				Entry: {
					type: '[]any',
					value: []
				}
			};
			var entry = this.checkItems.getCheckBoxNodes();
			for (var i = 0 ; i < entry.length ; i++) {
				var checkbox = entry[i].firstChild;
				var isChecked = checkbox.checked;
				// 有勾選才送出
				if (isChecked) {
					var data = {
						type: 'com.sun.star.beans.NamedValue',
						value: {
							Name: {
								type: 'string',
								value: checkbox.value
							},
							Value: {
								type: 'boolean',
								value: (checkbox.getAttribute('isdate') === 'true')
							}
						}
					}
					unoArgs.Entry.value.push(data);
				}
			}
			console.debug(unoArgs);
			// 至少有一項篩選條件
			if (unoArgs.Entry.value.length) {
				this._map.sendUnoCommand('.uno:AutoFilterAction', unoArgs);
			}
			this.closeDialog();
		}.bind(this));

		// 設定取消按鈕
		$(this._cancelButton).css({
			'width': '50%'
		}).attr({
			'_': 'Cancel'
		}).click(function() { // 點擊就關閉視窗
			this.closeDialog();
		}.bind(this));
	},

	/**
	 * 移除 Dialog
	 */
	 closeDialog: function() {
		if (this._dialog)
		{
			$(this._dialog).dialog('destroy').remove();
			this._dialog = null;
		}
	}
}

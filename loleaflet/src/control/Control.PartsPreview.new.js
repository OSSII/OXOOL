/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.PartsPreview
 */

/* global $ _UNO */
L.Control.PartsPreview = L.Control.extend({
	options: {
		autoUpdate: true
	},

	onAdd: function (map) {
		map.on('updatepermission', this._onUpdatePermission, this);
		this._initialized = false;
	},

	_onUpdatePermission: function(e) {
		var map = this._map;
		var docType = map.getDocType();
		if (docType !== 'presentation' && docType !== 'draw') {
			return;
		}

		if (!this._initialized) {
			this._initialize();
		}

		if (e.perm === 'edit') {
			// 桌面模式啟用拖曳排序
			if (window.mode.isDesktop()) {
				$(this._scrollContainer).sortable('enable');
			}
			map.on('insertpage', this._insertPreview, this);
			map.on('deletepage', this._deletePreview, this);
		} else {
			$(this._scrollContainer).sortable('disable'); // 關閉拖曳排序
			map.off('insertpage', this._insertPreview, this);
			map.off('deletepage', this._deletePreview, this);
		}
	},

	_initialize: function() {
		console.debug()
		var that = this;
		var map = this._map;

		this._initialized = true;
		this._previewInitialized = false;
		this._queuePreview = {};
		this._previewTiles = [];
		this._partsPreviewCont = L.DomUtil.get('slide-sorter');
		this._scrollY = 0;

		// make room for the preview
		L.DomUtil.addClass(map.options.documentContainer, 'parts-preview-document');
		setTimeout(L.bind(function () {
			map.invalidateSize();
			$('.scroll-container').mCustomScrollbar('update');
		}, this), 500);

		$(this._partsPreviewCont).mCustomScrollbar({
			axis: 'y',
			theme: 'rounded-dots-dark',
			callbacks:{
				whileScrolling: function() {
					that._onScroll(this);
				}
			}
		});
		this._scrollContainer = $(this._partsPreviewCont).find('.mCSB_container').get(0);

		this.createSortable(); // 加上拖曳排序功能
		this.createContextMenu(); // 加上右鍵選單

		map.on('updateparts', this._updateDisabled, this);
		map.on('updatepart', this._updatePart, this);
		map.on('tilepreview', this._updatePreview, this);
	},

	/**
	 * 建立預覽區拖曳調整影片順序功能
	 */
	createSortable: function() {
		$(this._scrollContainer).sortable({
			disabled: true, // 預設不啟用
			cursor: 'move',
			opacity: 0.5,
			start: function(e, ui) {
				console.debug('haha 開始拖曳 #' + ui.item.context.slidePartNo);
			}.bind(this),
			stop: function(/*e, ui*/) {
				var keys = Object.keys(this._queuePreview);
				if (keys.length) {
					var nodes = this._scrollContainer.childNodes;
					for (var i = 0; i < keys.length ; i++) {
						var hashCode = keys[i];
						console.debug('haha queue #' + hashCode);
						var tile = this._queuePreview[hashCode];
						for (var j = 0 ; j < nodes.length ; j++) {
							if (nodes[j].hash === hashCode) {
								console.debug('haha queue find name')
								nodes[j].childNodes[1].src = tile;
								break;
							}
						}
						delete this._queuePreview[hashCode];
					}
				}
			}.bind(this),
			update: function(e, ui) {
				console.debug('haha sortable update');
				var myPartNo = ui.item.context.slidePartNo; // 目前選取的投影片編號
				var nodes = this._scrollContainer.childNodes;
				// 找出自己目前所在位置
				for (var i = 0 ; i < nodes.length ; i++) {
					if (nodes[i].slidePartNo === myPartNo) {
						this._moveSlide(myPartNo, i);
						break;
					}
				}
			}.bind(this)
		});
	},

	/**
	 * 移動投影片到新的位置
	 *
	 * @param {number} from - 來源位置編號(>=0)
	 * @param {to} to - 目的位置(>=0)
	 */
	_moveSlide: function(from, to) {
		// 位置沒有改變
		if (from === to) {
			return;
		}

		console.debug('haha move from ' + from + ' to ' + to);
		var nodes = this._scrollContainer.childNodes;
		var j;
		var newPartNo = to;
		// 往上移動要多減 1(奇怪？)
		if (from > to) {
			newPartNo --;
			// 往上移動，就把自己到新的位置整塊向下移動一個位置
			for (j = to ; j <= from ; j++) {
				nodes[j].slidePartNo = j;
			}
		} else {
			// 否則就把自己到新的位置整塊向上移動一個位置
			for (j = from ; j <= to ; j++) {
				nodes[j].slidePartNo = j;
			}
		}
		// 呼叫 OxOffice 實際移動 Slide 位置
		this._map._socket.sendMessage('moveselectedclientparts position=' + newPartNo);
	},

	/**
	 * 投影片預覽區右鍵選單
	 */
	createContextMenu: function() {
		var map = this._map;
		var layouts = [20, 19, 0, 1, 32, -1, 3, 12, 15, 14, 16, 18, 34, -1, 28, 27, 29, 30];
		var layoutMenu = {};
		var key, item;
		for (var i = 0 ; i < layouts.length ; i++) {
			if (layouts[i] < 0) {
				key = 'separator' + i;
				item = '----';
			} else {
				key = '.uno:AssignLayout?WhatLayout:long=' + layouts[i];
				item = {
					name: _UNO(key, 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						var layoutNo = itemKey.substring(34);
						var assignLayout;
						// 第一次 opt 會是 item 所以沒有 context
						if (opt.context !== undefined) {
							assignLayout = map.getPartProperty(opt.context.slidePartNo).autoLayout;
						}
						item.checked = (assignLayout === layoutNo);
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					callback: function(key/*, opt*/) {
						map.sendUnoCommand(key);
						map.focus();
					},
					checktype: 'checkmark',
				};
			}
			layoutMenu[key] = item;
		}

		$.contextMenu({
			selector: '.preview-frame',
			zIndex: 100,
			events: {
				preShow: function(opt/*, options*/) {
					$.SmartMenus.hideAll(); // 關掉 menubar
					L.hideAllToolbarPopup(); // 關掉 toolbar popup
					// 非編輯模式不顯示
					if (map.getPermission() !== 'edit') {
						return false;
					}
					var partNo = opt.context.slidePartNo; // 右鍵所在投影片
					var currPart = map.getCurrentPartNumber(); // 目前選取投影片
					// 不一致話，選取右鍵點擊的投影片
					if (partNo !== currPart) {
						map.setPart(partNo);
					}
					return true;
				},
			},
			items: {
				'.uno:InsertSlide': { // 新增投影片
					name: _UNO('.uno:InsertSlide', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					callback: function(key/*, opt*/) {
						map.sendUnoCommand(key);
					}
				},
				'.uno:DuplicateSlide': { // 再製投影片
					name: _UNO('.uno:DuplicateSlide', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					callback: function(key/*, opt*/) {
						map.sendUnoCommand(key);
					}
				},
				'.uno:DeleteSlide': { // 刪除投影片
					name: _UNO('.uno:DeleteSlide', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					callback: function(/*key, opt*/) {
						map.executeAllowedCommand('deletepage')
					}
				},
				'sep01': '----',
				'.uno:ShowSlide': { // 顯示投影片
					name: _UNO('.uno:ShowSlide', 'presentation', true),
					callback: function(/*key, opt*/) {
						map.showPage();
					},
					visible: function(key, opt) {
						var partInfo = map.getPartProperty(opt.$trigger.context.slidePartNo);
						if (partInfo !== undefined && partInfo.visible === '0') {
							return true;
						}
						return false;
					},
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					}
				 },
				 '.uno:HideSlide': { // 隱藏投影片
					name: _UNO('.uno:HideSlide', 'presentation', true),
					callback: function(/*key, opt*/) {
						map.hidePage();
					},
					visible: (function(key, opt) {
						var partInfo = map.getPartProperty(opt.$trigger.context.slidePartNo);
						if (partInfo !== undefined && partInfo.visible === '1') {
							return true;
						}
						return false;
					}),
					icon: (function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					})
				},
				'.uno:RenameSlide': { // 重新命名投影片
					name: _UNO('.uno:RenameSlide', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					disabled: false,
					callback: function(/*key, opt*/) {
						L.dialog.run('RenameSlide');
						map.getDocumentStatus();
					}
				},
				'sep02': '----',
				'.uno:SlideLayoutMenu': {
					name: _UNO('.uno:SlideLayoutMenu', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					items: layoutMenu
				},
				'.uno:SlideMoveMenu': { // 移動子選單
					name: _UNO('.uno:SlideMoveMenu', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					items: {
						'.uno:MoveSlideFirst': { // 移到投影片開頭
							name: _UNO('.uno:MoveSlideFirst', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							disabled: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() === 0);
							},
							callback: (function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}).bind(this)
						},
						'.uno:MoveSlideUp': { // 投影片上移一張
							name: _UNO('.uno:MoveSlideUp', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							disabled: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() === 0);
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
						'.uno:MoveSlideDown': { // 投影片下移一張
							name: _UNO('.uno:MoveSlideDown', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							disabled: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() === (map.getNumberOfParts() - 1));
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
						'.uno:MoveSlideLast': { // 移到投影片最後
							name: _UNO('.uno:MoveSlideLast', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							disabled: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() === (map.getNumberOfParts() - 1));
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
					}
				},
				'.uno:NavigateMenu': { // 瀏覽子選單
					name: _UNO('.uno:NavigateMenu', 'presentation', true),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					items: {
						'.uno:FirstSlide': { // 第一張投影片
							name: _UNO('.uno:FirstSlide', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							visible: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() > 0);
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
						'.uno:PreviousSlide': { // 上一張
							name: _UNO('.uno:PreviousSlide', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							visible: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() > 0);
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
						'.uno:NextSlide': { // 下一張
							name: _UNO('.uno:NextSlide', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							visible: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() < (map.getNumberOfParts() - 1));
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
						'.uno:LastSlide': { // 最後一張投影片
							name: _UNO('.uno:LastSlide', 'presentation', true),
							icon: function(opt, $itemElement, itemKey, item) {
								return map.contextMenuIcon($itemElement, itemKey, item);
							},
							visible: function(/*key, opt, e*/) {
								return (map.getCurrentPartNumber() < (map.getNumberOfParts() - 1));
							},
							callback: function(key/*, opt, e*/) {
								map.sendUnoCommand(key);
							}
						},
					}
				},
				'sep03': '----',
				'.uno:SlideSetup': { // 版面設定（屬性）
					name: _UNO('.uno:SlideSetup', 'presentation'),
					icon: function(opt, $itemElement, itemKey, item) {
						return map.contextMenuIcon($itemElement, itemKey, item);
					},
					callback: function(key/*, opt*/) {
						map.sendUnoCommand(key);
					}
				},
			},
		});
	},

	_updateDisabled: function (e) {
		var docType = e.docType;
		if (docType === 'presentation' || docType === 'drawing') {
			var parts = e.parts;

			if (!this._previewInitialized)
			{
				var previewContBB = this._partsPreviewCont.getBoundingClientRect();
				this._previewContTop = previewContBB.top;
				var bottomBound = previewContBB.bottom + previewContBB.height / 2;
				for (var i = 0; i < parts; i++) {
					this._scrollContainer.appendChild(
						this._createPreview(i, e.partNames[i], bottomBound)
					);
				}
				this._onScroll();
				this._previewInitialized = true;
			}
			else
			{
				if (e.partNames !== undefined) {
					console.debug('haha _syncPreviews');
					this._syncPreviews(e);
				}

				// change the border style of the selected preview.
				for (var j = 0; j < parts; j++) {
					L.DomUtil.removeClass(this._scrollContainer.childNodes[j], 'preview-frame-selected');
				}
				L.DomUtil.addClass(this._scrollContainer.childNodes[this._map.getCurrentPartNumber()], 'preview-frame-selected');
			}
		}
	},

	_createPreview: function(i, hashCode, bottomBound) {
		var frame = L.DomUtil.create('div', 'preview-frame');
		var infoWrapper = L.DomUtil.create('div', 'preview-info-wrapper', frame);
		L.DomUtil.create('div', 'preview-helper', infoWrapper); //infoWrapper.childNodes[0]
		L.DomUtil.create('div', '', infoWrapper); // infoWrapper.childNodes[1] (是否有動畫)
		L.DomUtil.create('div', '', infoWrapper); // infoWrapper.childNodes[2] (是否有投影片轉場)

		var img = L.DomUtil.create('img', 'preview-img', frame);
		img.src = L.Icon.Default.imagePath + '/preview_placeholder.png';
		img.fetched = false;

		// 桌面模式啟用 tooltip
		if (window.mode.isDesktop()) {
			$(img).tooltip({
				position: {
					my: 'left top',
					at: 'right+4 top+4',
					collision: 'flipfit'
				}
			});
		}

		// 非桌面模式，啟用長按預覽圖，模擬按右鍵
		if (!window.mode.isDesktop()) {
			L.DomEvent.enableLongTap(img, 15, 1000);
		}

		L.DomEvent
			/* stopPropagation 會阻礙滑鼠事件向下傳遞，造成關不掉其他顯示在頁面上的 popup 元件
			.on(img, 'click', L.DomEvent.stopPropagation)
			.on(img, 'click', L.DomEvent.stop) */
			.on(img, 'mousedown', this._setPart, this)
			.on(img, 'mousedown', this._map.focus, this._map);

		var topBound = this._previewContTop;
		var previewFrameTop = 0;
		var previewFrameBottom = 0;
		if (i > 0) {
			if (!bottomBound) {
				var previewContBB = this._partsPreviewCont.getBoundingClientRect();
				bottomBound = this._previewContTop + previewContBB.height + previewContBB.height / 2;
			}
			previewFrameTop = this._previewContTop + this._previewFrameMargin + i * (this._previewFrameHeight + this._previewFrameMargin);
			previewFrameTop -= this._scrollY;
			previewFrameBottom = previewFrameTop + this._previewFrameHeight;
			/*L.DomUtil.setStyle(img, 'height', this._previewImgHeight + 'px');
			L.DomUtil.setStyle(infoWrapper, 'height', this._previewImgHeight + 'px');
			L.DomUtil.setStyle(frame, 'height', this._previewFrameHeight + 'px');*/
		}

		var imgSize;
		if (i === 0 || (previewFrameTop >= topBound && previewFrameTop <= bottomBound)
			|| (previewFrameBottom >= topBound && previewFrameBottom <= bottomBound)) {
			imgSize = this._map.getPreview(i, i, 180, 180, {autoUpdate: this.options.autoUpdate});
			img.fetched = true;
			/*L.DomUtil.setStyle(img, 'height', '');
			L.DomUtil.setStyle(infoWrapper, 'height', imgSize.height + 'px');*/
		}

		if (i === 0) {
			var previewImgBorder = Math.round(parseFloat(L.DomUtil.getStyle(img, 'border-top-width')));
			var previewImgMinWidth = Math.round(parseFloat(L.DomUtil.getStyle(img, 'min-width')));
			var imgHeight = imgSize.height;
			if (imgSize.width < previewImgMinWidth)
				imgHeight = Math.round(imgHeight * previewImgMinWidth / imgSize.width);
			var previewFrameBB = frame.getBoundingClientRect();
			this._previewFrameMargin = previewFrameBB.top - this._previewContTop;
			this._previewImgHeight = imgHeight;
			this._previewFrameHeight = imgHeight + 2 * previewImgBorder;
		}

		L.DomUtil.setStyle(img, 'height', this._previewImgHeight + 'px');
		L.DomUtil.setStyle(infoWrapper, 'height', this._previewImgHeight + 'px');
		L.DomUtil.setStyle(frame, 'height', this._previewFrameHeight + 'px');

		return this._updatePreviewProperty(i, frame);
	},

	/**
	 * 更新某張投影片預覽資訊
	 *
	 * @param {number} index - 投影片編號
	 * @param {HTMLElement} frame - _createPreview 建立的預覽 frame
	 */
	_updatePreviewProperty: function(index, frame) {
		var img = frame.childNodes[1];
		var infoWrapper = frame.childNodes[0];
		var helper = infoWrapper.childNodes[0];
		var animation = infoWrapper.childNodes[1];
		var transition = infoWrapper.childNodes[2];

		frame.slidePartNo = index; // 投影片編號 0 開始
		helper.innerText = index + 1; // 顯示的編號從 1 開始，所以實際編號 + 1

		var partInfo = this._map.getPartProperty(index);
		if (partInfo) {
			img.title = partInfo.name;
			frame.hash = partInfo.hashCode;

			if (partInfo.selected == '1') {
				L.DomUtil.addClass(frame, 'preview-frame-selected');
			} else {
				L.DomUtil.removeClass(frame, 'preview-frame-selected');
			}
			// 是否隱藏
			if (partInfo.visible === '0') {
				L.DomUtil.addClass(img, 'preview-img-blur');
			} else {
				L.DomUtil.removeClass(img, 'preview-img-blur');
			}

			// 是否有動畫
			if (partInfo.hasAnimationNode !== '0') {
				L.DomUtil.addClass(animation, 'preview-animation');
			} else {
				L.DomUtil.removeClass(animation, 'preview-animation');
			}

			// 是否有轉場
			if (partInfo.transitionType !== '0') {
				L.DomUtil.addClass(transition, 'preview-transition');
			} else {
				L.DomUtil.removeClass(transition, 'preview-transition');
			}
		}
		return frame;
	},

	_setPart: function(e) {
		var frame = e.target.parentNode;
		var part = $('#slide-sorter .mCSB_container .preview-frame').index(frame);
		var currPart = this._map.getCurrentPartNumber();
		if (part !== currPart) {
			console.debug('haha setprt to ' + part);
			this._map.setPart(part);
		}
	},

	_updatePart: function(e) {
		if (e.docType === 'presentation' && e.part >= 0) {
			this._map.getPreview(e.part, e.part, 180, 180, {autoUpdate: this.options.autoUpdate});
		}
	},

	_syncPreviews: function(e) {
		var it = 0;
		var parts = e.parts;
		var nodes = this._scrollContainer.childNodes; // 目前投影片預覽 nodes
		/* var nodeIdx = 0; // node 指位器

		// 依據最新的 parts info 重新排列、插入或移除預覽 node
		for (it = 0 ; it < e.parts ; it ++) {
			var pInfo = this.getPartProperty(it);
			for (var j = nodeIdx ; j < nodes.length ; j++) {
				if (it === j)
			}

		} */
		if (parts !== nodes.length) {
			console.debug('haha preview 長度變更', e);
			if (Math.abs(parts - nodes.length) === 1) {
				console.debug
				if (parts > nodes.length) {
					for (it = 0; it < parts; it++) {
						if (it === nodes.length) {
							this._insertPreview({selectedPart: it - 1, hashCode: e.partNames[it]});
							break;
						}
						if (nodes[it].childNodes[1].hash !== e.partNames[it]) {
							this._insertPreview({selectedPart: it, hashCode: e.partNames[it]});
							break;
						}
					}
				}
				else {
					for (it = 0; it < nodes.length; it++) {
						if (it === e.partNames.length ||
						    nodes[it].childNodes[1].hash !== e.partNames[it]) {
							this._deletePreview({selectedPart: it});
							break;
						}
					}
				}
			}
			else {
				// sync all, should never happen
				while (nodes.length < e.partNames.length) {
					this._insertPreview({selectedPart: nodes.length - 1,
							     hashCode: e.partNames[nodes.length]});
				}

				while (nodes.length > e.partNames.length) {
					this._deletePreview({selectedPart: nodes.length - 1});
				}

				for (it = 0; it < e.partNames.length; it++) {
					nodes[it].childNodes[1].hash = e.partNames[it];
					nodes[it].childNodes[1].src = L.Icon.Default.imagePath + '/preview_placeholder.png';
					nodes[it].childNodes[1].fetched = false;
				}
				this._onScrollEnd();
			}
		}
		else {
			for (it = 0; it < parts; it++) {
				this._updatePreviewProperty(it, nodes[it]);
			}
		}
	},

	_updatePreview: function(e) {
		var img = this._scrollContainer.childNodes[e.id].childNodes[1];
		if (img) {
			img.src = e.tile;
		} else {
			var pInfo = this._map.getPartProperty(parseInt(e.id));
			if (pInfo) {
				this._queuePreview[pInfo.hashCode] = e.Tile;
			} else {
				console.debug('haha part info not found #' + e.id);
			}
		}
		/*if (this._map.getDocType() === 'presentation' || this._map.getDocType() === 'drawing') {
			try {
				if (this._onDragFrame[e.id]) {
					this._onDragFrame[e.id].childNodes[1].src = e.tile;
					delete this._onDragFrame[e.id];
				} else {
					this._scrollContainer.childNodes[e.id].childNodes[1].src = e.tile;
				}
			} catch (exp) {
				console.debug('haha error ', exp, e.tile);
				alert('haha error = ' + e.id);
			}
		}*/
	},

	_updatePreviewIds: function () {
		$('#slide-sorter').mCustomScrollbar('update');
	},

	_insertPreview: function (e) {
		if (this._map.getDocType() === 'presentation') {
			var newIndex = e.selectedPart + 1;
			var newPreview = this._createPreview(newIndex, (e.hashCode === undefined ? null : e.hashCode));

			// insert newPreview to newIndex position
			this._previewTiles.splice(newIndex, 0, newPreview);

			var selectedFrame = this._previewTiles[e.selectedPart].parentNode;
			var newFrame = newPreview.parentNode;

			// insert after selectedFrame
			selectedFrame.parentNode.insertBefore(newFrame, selectedFrame.nextSibling);
			this._updatePreviewIds();
		}
	},

	_deletePreview: function (e) {
		if (this._map.getDocType() === 'presentation') {
			var selectedFrame = this._previewTiles[e.selectedPart].parentNode;
			L.DomUtil.remove(selectedFrame);

			this._previewTiles.splice(e.selectedPart, 1);
			this._updatePreviewIds();
		}
	},

	_onScroll: function (e) {
		var scrollOffset = 0;
		if (e) {
			var prevScrollY = this._scrollY;
			this._scrollY = -e.mcs.top;
			scrollOffset = this._scrollY - prevScrollY;
		}

		var nodes = this._scrollContainer.childNodes;
		var previewContBB = this._partsPreviewCont.getBoundingClientRect();
		var extra =  previewContBB.height;
		var topBound = this._previewContTop - (scrollOffset < 0 ? extra : previewContBB.height / 2);
		var bottomBound = this._previewContTop + previewContBB.height + (scrollOffset > 0 ? extra : previewContBB.height / 2);
		for (var i = 0; i < nodes.length; ++i) {
			var img = nodes[i].childNodes[1];
			if (img && img.parentNode && !img.fetched) {
				var previewFrameBB = img.parentNode.getBoundingClientRect();
				if ((previewFrameBB.top >= topBound && previewFrameBB.top <= bottomBound)
				|| (previewFrameBB.bottom >= topBound && previewFrameBB.bottom <= bottomBound)) {
					this._map.getPreview(i, i, 180, 180, {autoUpdate: this.options.autoUpdate});
					img.fetched = true;
				}
			}
		}
	}
});

L.control.partsPreview = function (options) {
	return new L.Control.PartsPreview(options);
};

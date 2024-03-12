/* -*- js-indent-level: 8 -*- */
/**
 * L.Control.AlternativeCommand is a control that allows the user to execute alternative commands.
 *
 * @author Firefly <firefly@ossii.com.tw>
 */

/* global $ L _ app */
L.Map.mergeOptions({
	alternativeCommand: true
});

L.Map.AlternativeCommand = L.Handler.extend({

	initialize: function (map) {
		this._map = map;
	},

	addHooks: function () {
		this._map.on('doclayerinit', this.onDocLayerInit, this);
	},

	removeHooks: function () {
		this._map.off('doclayerinit', this.onDocLayerInit, this);
	},

	onDocLayerInit: function () {
		// 取得替代指令名稱列表
		var cmdKeys = Object.keys(this._commands);

		// 依序處理替代指令
		for (var i = 0; i < cmdKeys.length; i++) {
			var cmd = cmdKeys[i]; // 取得指令名稱
			var altCmd = this._commands[cmd]; // 取得替代指令
			// 只處理物件
			if (typeof altCmd === 'object') {
				// 如果有 alias 屬性，就建立別名指令
				if (altCmd.alias !== undefined) {
					this._createAliasCommand(cmd, altCmd);
				}

				// 有 state 方法，就執行並設定到 stateChangeHandler 中
				if (altCmd.state !== undefined) {
					this.setState(cmd); // 設定狀態
				}
			}
		}
	},

	/**
	 * 查詢有無指定的替代指令
	 * @param {string} cmd: 指令名稱
	 * @returns {boolean} true:有, false: 無
	 */
	has: function (cmd) {
		var altCmd = this._commands[cmd];
		// 必須是物件，且有 execute 方法，才算是替代指令
		return typeof altCmd === 'object' && typeof altCmd.execute === 'function';
	},

	/**
	 *	取得替代指令
	 * @param {string} cmd: 指令名稱
	 * @returns {function} 替代指令的函數
	 */
	get: function (cmd) {
		if (this.has(cmd)) {
			return this._commands[cmd];
		}
		return null;
	},

	/**
	 * 執行替代指令
	 * @param {string} cmd: 指令名稱
	 * @param {object} options: 物件
	 * @returns {boolean} true: 已執行, false: 未執行
	 */
	run: function (cmd, options) {
		var altCmd = this.get(cmd);
		if (altCmd) {
			var event = {
				commandName: cmd,
				options: options
			};

			var result = altCmd.execute.call(this, event);
			this.setState(cmd, result); // 設定狀態

			return true;
		}
		return false;
	},

	/**
	 * 新增替代指令
	 *
	 * @param {string} cmd: 指令名稱
	 * @param {*} object: 物件
	 * @returns {boolean} true: success, false: fail
	 */
	add: function (cmd, object) {
		// 必須不在現有替代指令列表中，且 cmd 是字串，object 是物件，且有 execute 方法
		if (!this.has(cmd) && typeof cmd === 'string' &&
			typeof object === 'object' && typeof object.execute === 'function') {

			this._commands[cmd] = object; // 新增替代指令

			// 如果有 state 方法，就執行並設定到 stateChangeHandler 中
			if (object.state !== undefined) {
				this.setState(cmd); // 設定狀態
			}

			// 如果有 alias 屬性，就建立別名指令
			if (object.alias !== undefined) {
				this._createAliasCommand(cmd, object);
			}

			return true;
		}
		return false;
	},

	/**
	 * 移除替代指令
	 * @param {string} cmd: 指令名稱
	 */
	remove: function (cmd) {
		if (this.has(cmd)) {
			var altCmd = this._commands[cmd];
			// 如果有 alias 屬性，就移除別名指令
			if (altCmd.alias !== undefined) {
				var aliasList = typeof altCmd.alias === 'string' ? altCmd.alias.split(',') : altCmd.alias;
				for (var i = 0; i < aliasList.length; i++) {
					delete this._commands[aliasList[i]]; // 移除別名指令
				}
			}
			delete this._command[cmd]; // 移除替代指令
		}
	},

	/**
	 * 更新多個指令狀態
	 * 依據陣列指令列表，依序取得狀態，並設定到 stateChangeHandler 中
	 * @param {array} cmds: 指令名稱陣列
	 *
	 * @example updateState(['.uno:Save', '.uno:SaveAs', '.uno:Print']);
	 */
	updateState: function (cmds) {
		if (Array.isArray(cmds)) {
			for (var i = 0; i < cmds.length; i++) {
				if (!this.setState(cmds[i])) {
					console.error('Can not set state: ', cmds[i]);
				}
			}
		} else {
			console.error('updateState(): Invalid argument:', cmds, 'should be an array.');
		}
	},

	/**
	 * 設定指令狀態
	 *
	 * @param {string} cmd: 指令名稱
	 * @param {object} state: 狀態
	 * @returns {boolean} true: success, false: fail
	 */
	setState: function (cmd, state) {
		var altCmd = this._commands[cmd];
		// 如果 state 未定義，就執行 state 方法
		if (state === undefined) {
			var event = {
				commandName: cmd,
				// options: {} // TODO: 需要提供 options 嗎?
			};
			if (typeof altCmd === 'object' && typeof altCmd.state === 'function') {
				state = altCmd.state.call(this, event);
			}
		}
		// 如果 state 有值，就設定到 stateChangeHandler 中
		if (state !== undefined) {
			this._map.stateChangeHandler.setState(cmd, state);
			// 如果有別名，也設定到 stateChangeHandler 中
			if (typeof altCmd === 'object' && typeof altCmd.alias === 'string') {
				this._map.stateChangeHandler.setState(altCmd.alias, state);
			// 如果是別名，也設定到 stateChangeHandler 中
			} else if (typeof altCmd === 'object' && typeof altCmd.whoseAlias === 'function') {
				this._map.stateChangeHandler.setState(altCmd.whoseAlias, state);
			}
			return true;
		}
		return false;
	},

	/**
	 * 建立別名指令
	 *
	 * @param {*} cmd
	 * @param {*} altCmd
	 */
	_createAliasCommand: function (cmd, altCmd) {
		// 如果 alias 屬性不是字串或陣列，就不處理
		if (typeof altCmd.alias !== 'string' && !Array.isArray(altCmd.alias)) {
			return;
		}

		// 替代指令副本
		var aliasCmd = {
			whoseAlias: cmd, // 記錄原始指令
			execute: altCmd.execute, // 複製執行方法
		};

		// 如果有 state 方法，就複製過去
		if (altCmd.state !== undefined) {
			aliasCmd.state = altCmd.state;
		}

		// 如果是字串，就分割爲陣列，分隔符是逗號，否則就是原始陣列
		var aliasList = typeof altCmd.alias === 'string' ? altCmd.alias.split(',') : altCmd.alias;
		// 依序新增別名指令
		for (var i = 0; i < aliasList.length; i++) {
			this._commands[aliasList[i]] = aliasCmd; // 新增別名指令
			if (aliasCmd.state !== undefined) {
				this.setState(aliasList[i]); // 設定狀態
			}
		}
	},

	/**
	 * 替代指令集

	 * '指令名稱': {
	 * 		[alias: '別名', // 可選，指令的別名]
	 * 		[state: function (e) {  }, // 提供該指令的狀態，由指令替代系統視情況自動呼叫]
	 * 		execute: function (e) { ... } // 處理該指令的程序
	 * }
	 *
	 */
	_commands: {

		/**
		 * 存檔
		 */
		'.uno:Save': {
			alias: 'save',
			execute: function () {
				// Save only when not read-only.
				if (!this._map.isReadOnlyMode()) {
					this._map.fire('postMessage', { msgId: 'UI_Save' });
					if (!this._map._disableDefaultAction['UI_Save']) {
						this._map.save(false, false);
					}
				}
			}
		},
		/**
		 * 另存新檔
		 */
		'.uno:SaveAs': {
			alias: 'saveas',
			execute: function () {
				this._map.openSaveAs();
			}
		},
		/**
		 * 儲存註解
		 */
		'savecomment': {
			execute: function () {
				if (this._map.isPermissionEditForComments()) {
					this._map.fire('postMessage', { msgId: 'UI_Save' });
					if (!this._map._disableDefaultAction['UI_Save']) {
						this._map.save(false, false);
					}
				}
			}
		},
		/**
		 * 分享
		 */
		'shareas': {
			alias: 'ShareAs',
			execute: function () {
				this._map.openShare();
			},
		},
		/**
		 * 檢視修訂紀錄
		 */
		'rev-history': {
			alias: 'Rev-History',
			execute: function () {
				if (L.Params.revHistoryEnabled) {
					this._map.openRevisionHistory();
				}
			}
		},
		/**
		 * 列印
		 */
		'.uno:Print': {
			alias: 'print',
			execute: function () {
				this._map.print();
			}
		},
		/**
		 * TODO:
		 *
		 * 4. 實作 zotero*
		 */

		/**
		 * 下載為特定格式
		 */
		'downloadas-*': {
			alias: [
				// 通用
				'downloadas-pdf',
				// Writer
				'downloadas-odt',
				'downloadas-doc',
				'downloadas-docx',
				'downloadas-rtf',
				'downloadas-epub',
				'downloadas-html',
				'downloadas-txt',
				// Impress
				'downloadas-odp',
				'downloadas-ppt',
				'downloadas-pptx',
				// Calc
				'downloadas-ods',
				'downloadas-xls',
				'downloadas-xlsx',
				'downloadas-csv',
				// Drawing
				'downloadas-odg',
			],
			execute: function (e) {
				var format = e.commandName.substr('downloadas-'.length);
				var fileName = this._map['wopi'].BaseFileName;
				fileName = fileName.substr(0, fileName.lastIndexOf('.'));
                fileName = fileName === '' ? 'document' : fileName;
                this._map.downloadAs(fileName + '.' + format, format);
			}
		},

		/**
		 * 另存格式
		 */
		'saveas-*': {
			alias: [
				// 通用
				'saveas-pdf',
				// Writer
				'saveas-odt',
				'saveas-doc',
				'saveas-docx',
				'saveas-rtf',
				'saveas-epub',
				'saveas-html',
				'saveas-txt',
				// Impress
				'saveas-odp',
				'saveas-ppt',
				'saveas-pptx',
				// Calc
				'saveas-ods',
				'saveas-xls',
				'saveas-xlsx',
				'saveas-csv',
				// Drawing
				'saveas-odg',
			],
			execute: function (e) {
				var format = e.commandName.substr('saveas-'.length);
				this._map.openSaveAs(format);
			}
		},
		/**
		 * 匯出為特定格式
		 */
		'exportas-*': {
			alias: ['exportas-pdf', 'exportas-epub'],
			execute: function (e) {
				var format = e.commandName.substr('exportas-'.length);
				this._map.openSaveAs(format);
			},
		},
		/**
		 * Impress / Drawing: 刪除投影片 / 頁面
		 */
		'.uno:DeletePage': {
			alias: 'deletepage',
			execute: function () {
				var map = this._map;
				var msg;
				if (map.getDocType() === 'presentation') {
					msg = _('Are you sure you want to delete this slide?');
				}
				else { /* drawing */
					msg = _('Are you sure you want to delete this page?');
				}
				map.uiManager.showInfoModal('deleteslide-modal', _('Delete'),
					msg, '', _('OK'), function () { map.deletePage(); }, true, 'deleteslide-modal-response');
			}
		},
		/**
		 *
		 * 切換暗色/亮色主題
		 */
		'toggledarktheme': {
			state: function () {
				return this._map.uiManager.getDarkModeState();
			},
			execute: function (/* e */) {
				this._map.uiManager.toggleDarkMode();
			}
		},
		/**
		 * home search
		 */
		'home-search': {
			execute: function () {
				this._map.uiManager.focusSearch();
			}
		},
		/**
		 * print active sheet
		 */
		'print-active-sheet': {
			execute: function () {
				var currentSheet = this._map._docLayer._selectedPart + 1;
				var options = {
					ExportFormFields: {
						type: 'boolean',
						value: false
					},
					ExportNotes: {
						type: 'boolean',
						value: false
					},
					SheetRange: {
						type: 'string',
						value: currentSheet + '-' + currentSheet
					}
				};
				options = JSON.stringify(options);
				this._map.print(options);
			}
		},
		/**
		 * print all sheets
		 */
		'print-all-sheets': {
			execute: function () {
				this._map.print();
			}
		},
		/**
		 * 插入註解
		 */
		'.uno:InsertAnnotation': {
			alias: 'insertcomment',
			execute: function () {
				this._map.insertComment();
			}
		},
		/**
		 * 插入電腦(本地)圖片
		 */
		'.uno:InsertGraphic': {
			alias: 'insertgraphic',
			execute: function () {
				L.DomUtil.get('insertgraphic').click();
			}
		},
		/**
		 * 插入雲端圖片
		 */
		'insertgraphicremote': {
			execute: function () {
				this._map.fire('postMessage', { msgId: 'UI_InsertGraphic' });
			}
		},
		/**
		 * impress: 設定投影片背景
		 */
		'.uno:SelectBackground': {
			execute: function () {
				L.DomUtil.get('selectbackground').click();
			}
		},
		/**
		 * 拉近
		 */
		'.uno:ZoomPlus': {
			alias: 'zoomin',
			execute: function () {
				if (this._map.getZoom() < this._map.getMaxZoom()) {
					this._map.zoomIn(1, null, true /* animate? */);
				}
			}
		},
		/**
		 * 顯示/隱藏解決的註解
		 */
		'.uno:ShowResolvedAnnotations': {
			alias: 'showresolvedannotations',
			execute: function () {
				var items = this._map['stateChangeHandler'];
                var val = items.getItemValue('.uno:ShowResolvedAnnotations');
                val = (val === 'true' || val === true);
                this._map.showResolvedComments(!val);
			}
		},
		/**
		 * 拉遠
		 */
		'.uno:ZoomMinus': {
			alias: 'zoomout',
			execute: function () {
				if (this._map.getZoom() > this._map.getMinZoom()) {
					this._map.zoomOut(1, null, true /* animate? */);
				}
			}
		},
		/**
		 * 重設遠近
		 */
		'.uno:Zoom100Percent': {
			alias: 'zoomreset',
			execute: function () {
				this._map.setZoom(this._map.options.zoom, null, true);
			}
		},
		/**
		 * 切換全螢幕
		 */
		'.uno:FullScreen': {
			alias: 'fullscreen',
			state: function () {
				return this._map.uiManager.isFullscreen();
			},
			execute: function (/*e*/) {
				var isFullscreen = this._map.uiManager.isFullscreen(); // 保留當前狀態
				L.toggleFullScreen(); // 切換
				// 由於切換全螢幕後，讀取的狀態還是舊的，所以反向設定保留狀態
				return !isFullscreen; // 直接回報狀態
			}
		},
		/**
		 * 切換尺規顯示與否
		 */
		'.uno:Ruler': {
			alias: 'showruler',
			state: function () {
				return this._map.uiManager.isRulerVisible();
			},
			execute:function (/* e */) {
				this._map.uiManager.toggleRuler();
			}
		},
		/**
		 * Voice Over 模式
		 */
		'togglea11ystate': {
			state: function () {
				return this._map.uiManager.getAccessibilityState();
			},
			execute: function () {
				this._map.uiManager.toggleAccessibilityState();
			}
		},
		/**
		 * 切換使用者界面(精簡/分頁)
		 */
		'.uno:ToolbarModeUI': {
			alias: 'toggleuimode',
			state: function () {
				return this._map.uiManager.getCurrentMode();
			},
			execute: function (/* e */) {
				if (this._map.uiManager.shouldUseNotebookbarMode()) {
					this._map.uiManager.onChangeUIMode({ mode: 'classic', force: true });
				} else {
					this._map.uiManager.onChangeUIMode({ mode: 'notebookbar', force: true });
				}
			}
		},
		/**
		 * 切換狀態列顯示與否
		 */
		'.uno:StatusBarVisible': {
			alias: 'showstatusbar',
			state: function () {
				return this._map.uiManager.getSavedStateOrDefault('ShowStatusbar', true);
			},
			execute: function (/* e */) {
				this._map.uiManager.toggleStatusBar();
			}
		},
		/**
		 * 切換下拉選單列顯示與否
		 */
		'togglemenubar': {
			execute: function () {
				this._map.uiManager.toggleMenubar();
			}
		},
		/**
		 * 切換分頁顯示與否
		 */
		'collapsenotebookbar': {
			execute: function () {
				this._map.uiManager.collapseNotebookbar();
			}
		},
		/**
		 * Impress: 從第一張投影片開始播放
		 */
		'.uno:Presentation': {
			alias: ['presentation', 'fullscreen-presentation'],
			execute: function () {
				this._map.fire('fullscreen');
			}
		},
		/**
		 * Impress: 從目前投影片開始播放
		 */
		'.uno:PresentationCurrentSlide': {
			alias: 'presentation-currentslide',
			execute: function () {
				this._map.fire('fullscreen',
					{ startSlideNumber: this._map.getCurrentPartNumber() });
			}
		},
		/**
		 * Impress: 在視窗播放投影片
		 */
		'present-in-window': {
			alias: 'presentinwindow',
			execute: function () {
				this._map.fire('presentinwindow');
			}
		},
		/**
		 * Impress: 新增投影片
		 */
		'.uno:InsertPage': {
			alias: 'insertpage',
			execute: function () {
				this._map.insertPage();
			}
		},
		/**
		 * Impress: 再製投影片
		 */
		'.uno:DuplicatePage': {
			alias: 'duplicatepage',
			execute: function () {
				this._map.duplicatePage();
			}
		},
		/**
		 * What's This?
		 */
		'.uno:ShapesMenu': {
			alise: 'insertshapes',
			execute: function () {
				this._map.menubar._openInsertShapesWizard();
			}
		},
		/**
		 * 顯示「關於」對話框
		 */
		'.uno:About': {
			alias: 'about',
			execute: function () {
				this._map.showLOAboutDialog();
			}
		},
		/**
		 * 問題回報
		 */
		'report-an-issue': {
			execute: function () {
				window.open(window.brandReportIssueURL, '_blank');
			}
		},
		/**
		 * 插入/修改超連結
		 */
		'.uno:HyperlinkDialog': {
			alias: 'inserthyperlink',
			execute: function (/* e */) {
				// 手機界面不一樣
				if (window.mode.isMobile()) {
					this._map.showHyperlinkDialog();
				} else {
					this._map.sendUnoCommand('.uno:HyperlinkDialog');
				}
			}
		},
		/**
		 * 關閉檔案
		 */
		'.uno:CloseDoc': {
			alias: 'closedocument',
		    execute: function () {
				//this._map.closeDocument();
				window.onClose();
			}
		},
		/**
		 * 修復
		 */
		'repair': {
			alias: 'Repair',
			execute: function () {
				app.socket.sendMessage('commandvalues command=.uno:DocumentRepair');
			}
		},
		/**
		 * 搜尋與取代
		 */
		'.uno:SearchDialog': {
			alias: 'searchdialog',
			execute: function () {
				// 唯讀模式只能在狀態列中搜尋
				if (this._map.isReadOnlyMode()) {
					$('#toolbar-down').hide();
					$('#toolbar-search').show();
					$('#mobile-edit-button').hide();
					L.DomUtil.get('search-input').focus();
				} else {
					this._map.sendUnoCommand('.uno:SearchDialog');
				}
			}
		},
		/**
		 * 直接插入文字方塊
		 */
		'inserttextbox': {
			execute: function () {
				this._map.sendUnoCommand('.uno:Text?CreateDirectly:bool=true');
			}
		},

		/**
		 * 手機界面: 顯示頁面設定
		 */
		'pagesetup': {
			execute: function () {
				this._map.sendUnoCommand('.uno:SidebarShow');
				this._map.sendUnoCommand('.uno:LOKSidebarWriterPage');
				this._map.fire('showwizardsidebar', {noRefresh: true});
				window.pageMobileWizard = true;
			}
		},
		/**
		 * 顯示投影片
		 */
		'.uno:ShowSlide': {
			alias: 'showslide',
			execute: function () {
				this._map.showSlide();
			}
		},
		/**
		 * 隱藏投影片
		 */
		'.uno:HideSlide': {
			alias: 'hideslide',
			execute: function () {
				this._map.hideSlide();
			}
		},
		/**
		 *
		 * TODO: morelanguages-*: 顯示更多語言選項
		 */
		/* 'morelanguages': {
			execute: function () {
				this._map.fire('morelanguages', { applyto: id.substr('morelanguages-'.length) });
			}
		}, */

		/**
		 * 接受全部的追蹤修訂
		 */
		'.uno:AcceptAllTrackedChanges': {
			alias: 'acceptalltrackedchanges',
			execute: function () {
				this._map.sendUnoCommand('.uno:AcceptAllTrackedChanges');
                app.socket.sendMessage('commandvalues command=.uno:ViewAnnotations');
			}
		},
		/**
		 * 拒絕全部的追蹤修訂
		 */
		'.uno:RejectAllTrackedChanges': {
			alias: 'rejectalltrackedchanges',
			execute: function () {
				this.sendUnoCommand('.uno:RejectAllTrackedChanges');
                var commentSection = app.sectionContainer.getSectionWithName(L.CSections.CommentList.name);
                commentSection.rejectAllTrackedCommentChanges();
			}
		},
		/**
		 * 顯示線上說明
		 */
		'online-help': {
			execute: function () {
				L.dialog.run('ShowHelp', { id: 'online-help' });
			}
		},
		/**
		 * 顯示鍵盤快捷鍵說明
		 */
		'keyboard-shortcuts': {
			execute: function () {
				L.dialog.run('ShowHelp', { id: 'keyboard-shortcuts' });
			}
		},

		/**
		 * Calc: 接受公式欄輸入
		 */
		'acceptformula': {
			alias: '.uno:AcceptFormula',
			execute: function () {
				if (window.mode.isMobile()) {
					this._map.focus();
					this._map._docLayer.postKeyboardEvent('input',
						this._map.keyboard.keyCodes.enter,
						this._map.keyboard._toUNOKeyCode(this._map.keyboard.keyCodes.enter));
				} else {
					this._map.sendUnoCommand('.uno:AcceptFormula');
				}

				this._map.onFormulaBarBlur();
				this._map.formulabarBlur();
				this._map.formulabarSetDirty();
			}
		},
		/**
		 * Calc: 取消公式欄輸入
		 */
		'cancelformula': {
			alias: '.uno:Cancel',
			execute: function () {
				this._map.sendUnoCommand('.uno:Cancel');
				this._map.onFormulaBarBlur();
				this._map.formulabarBlur();
				this._map.formulabarSetDirty();
			}
		},
		/**
		 * Calc: 開始編輯公式
		 */
		'startformula': {
			alias: '.uno:StartFormula',
			execute: function () {
				this._map.sendUnoCommand('.uno:StartFormula');
				this._map.onFormulaBarFocus();
                this._map.formulabarFocus();
                this._map.formulabarSetDirty();
			}
		},
		/**
		 * Calc: 函式精靈
		 */
		'functiondialog': {
			alias: '.uno:FunctionDialog',
			execute: function () {
				if (window.mode.isMobile() && this._map._functionWizardData) {
					this._map._docLayer._closeMobileWizard();
					this._map._docLayer._openMobileWizard(this._map._functionWizardData);
					this._map.formulabarSetDirty();
				} else {
					this._map.sendUnoCommand('.uno:FunctionDialog');
				}
			}
		},
		/**
 		 * What's This?
 		 */
		'remotelink': {
			execute: function () {
				this._map.fire('postMessage', { msgId: 'UI_PickLink' });
			}
		},
		/**
		 * Zetro:
		 */
		'zoteroaddeditcitation': {
			execute: function () {
				this._map.zotero.handleItemList();
			}
		},
		/**
		 * Zetro:
		 */
		'zoterosetdocprefs': {
			execute: function () {
				this._map.zotero.handleStyleList();
			}
		},
		/**
		 * Zetro:
		 */
		'zoteroaddeditbibliography': {
			execute: function () {
				this.zotero.insertBibliography();
			}
		},
		/**
		 * Zetro:
		 */
		'zoteroaddnote': {
			execute: function () {
				this._map.zotero.handleInsertNote();
			}
		},
		/**
		 * Zetro:
		 */
		'zoterorefresh': {
			execute: function () {
				this._map.zotero.refreshCitationsAndBib();
			}
		},
		/**
		 * Zetro:
		 */
		'zoterounlink': {
			execute: function () {
				this._map.zotero.unlinkCitations();
			}
		},
		/**
		 * 匯出 PDF
		 */
		'exportpdf': {
			alias: '.uno:ExportToPDF',
			execute: function () {
				this._map.sendUnoCommand('.uno:ExportToPDF', {
					'SynchronMode': {
						'type': 'boolean',
						'value': false
					}
				});
			}
		},
		/**
		 * 直接匯出 PDF
		 */
		'exportdirectpdf': {
			alise: '.uno:ExportDirectToPDF',
			execute: function () {
				this.sendUnoCommand('.uno:ExportDirectToPDF', {
					'SynchronMode': {
						'type': 'boolean',
						'value': false
					}
				});
			}
		},
		/**
		 * 匯出 EPUB
		 */
		'exportepub': {
			alias: '.uno:ExportToEPUB',
			execute: function () {
				this._map.sendUnoCommand('.uno:ExportToEPUB', {
					'SynchronMode': {
						'type': 'boolean',
						'value': false
					}
				});
			}
		},
		/**
		 * Impress/Drawing: 刪除投影片/頁面
		 */
		'deletepage': {
			execute: function () {
				var map = this._map;
				var msg;
				if (map.getDocType() === 'presentation') {
					msg = _('Are you sure you want to delete this slide?');
				}
				else { /* drawing */
					msg = _('Are you sure you want to delete this page?');
				}
				map.uiManager.showInfoModal('deleteslide-modal', _('Delete'),
					msg, '', _('OK'), function () { map.deletePage(); }, true, 'deleteslide-modal-response');
			}
		},
		/**
		 * 超連結
		 */
		'hyperlinkdialog': {
			execute: function () {
				this._map.showHyperlinkDialog();
			}
		},
		/**
		 * 插入特殊符號
		 */
		'charmapcontrol': {
			execute: function () {
				this._map.sendUnoCommand('.uno:InsertSymbol');
			}
		},
		/**
		 * FIXME: 關閉平板模式？
		 */
		'closetablet': {
			execute: function () {
				this._map.uiManager.enterReadonlyOrClose();
			}
		},
		/**
		 * 重新命名文件
		 */
		'renamedocument': {
			execute: function () {
				this._map.uiManager.renameDocument();
			}
		},
		/**
		 * 切換 Wasm
		 */
		'togglewasm': {
			execute: function () {
				this._map.uiManager.toggleWasm();
			}
		},

		/**
		 * 貼上無格式設定的文字
		 */
		'.uno:PasteUnformatted': {
			execute: function (e) {
				this._map._clip._openPasteSpecialPopup(e.commandName);
			}
		},
		/**
		 * 選擇性貼上
		 */
		'.uno:PasteSpecial': {
			execute: function (e) {
				this._map._clip._openPasteSpecialPopup(e.commandName);
			}
		},
		/**
		 * 編輯檔案
		 */
		'.uno:EditDoc': {
			execute: function () {
				// 如果有任何更改，先存檔，否則會 crash
				if (this._map._everModified) {
					this._map.save(true, true);
				}
				this._map.sendUnoCommand('.uno:EditDoc');
			}
		},

		/**
		 * 以外部工具編輯
		 */
		'.uno:ExternalEdit': {
			execute: function () {
				app.socket.sendMessage('getgraphicselection id=edit');
			}
		},
		/**
		 * 儲存(下載)文件中的圖片
		 */
		'.uno:SaveGraphic': {
			execute: function () {
				app.socket.sendMessage('getgraphicselection id=export');
			}
		},
		/**
		 * 插入地區化的特殊符號
		 */
		'.uno:InsertSymbol': {
			execute: function () {
				L.dialog.run('CommonSymbols');
			}
		},
	},
});

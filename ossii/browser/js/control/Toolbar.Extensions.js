/* -*- js-indent-level: 8 -*- */
/**
 * Toolbar extension handler
 *
 * @author Firefly <firefly@ossii.com.tw>
 */

/* global app _ _UNO _UNOTARGET $ */
L.Map.include({
	// 可被執行的指令
	_allowedCommands: {
		menubarData: null, // 來自系統的選單設定檔
		menuPermissions: {}, // 來自系統的選單權限檔
		commonSymbolsData: null, // 編輯
		featureCommand: {}, // 特性命令
		// 右鍵選單白名單
		contextMenu: {
			general: [
				{id: '.uno:EditQrCode'}, // 編輯 QR 碼
				{id: '.uno:ObjectMenue'}, // 物件
				{id: '.uno:Backward'}, // 下移一層
				{id: '.uno:ObjectAlignLeft'}, // 左
				{id: '.uno:AlignCenter'}, // 置中
				{id: '.uno:ObjectAlignRight'}, // 右
				{id: '.uno:AlignUp'}, // 上
				{id: '.uno:AlignMiddle'}, // 中
				{id: '.uno:AlignDown'}, // 下
				{id: '.uno:FormatAxis'}, // 設定軸標籤格式
				{id: '.uno:FormatChartArea'}, // 設定圖表區塊格式
				{id: '.uno:InsertDataLabel'}, // 插入單一資料標籤
				{id: '.uno:FormatDataPoint'}, // 設定資料點格式
				{id: '.uno:FormatDataSeries'}, // 設定資料序列格式
				{id: '.uno:FormatLegend'}, // 設定格式圖例
				{id: '.uno:FormatMajorGrid'}, // 設定主網格格式
				{id: '.uno:FormatWall'}, // 設定背景牆格式
				{id: '.uno:InsertAxisTitle'}, // 插入軸標題
				{id: '.uno:InsertDataLabels'}, // 插入資料標籤
				{id: '.uno:InsertTitles'}, // 插入標題
				{id: '.uno:InsertTrendline'}, // 插入趨勢線
				{id: '.uno:InsertMeanValue'}, // 插入平均值
				{id: '.uno:InsertMajorGrid'}, // 插入主網格
				{id: '.uno:InsertMinorGrid'}, // 插入子網格
				{id: '.uno:InsertRemoveAxes'}, // 插入/刪除軸標籤
				{id: '.uno:InsertXErrorBars'}, // 插入 X 誤差線
				{id: '.uno:InsertYErrorBars'}, // 插入 Y 誤差線
				{id: '.uno:DeleteAxis'}, // 刪除軸標籤
				{id: '.uno:DeleteLegend'}, // 刪除圖例
				{id: '.uno:DeleteMajorGrid'}, // 刪除主網格
				{id: '.uno:DiagramType'}, // 圖表類型
				{id: '.uno:DiagramData'}, // 資料表格
				{id: '.uno:OpenHyperlinkOnCursor'}, // 開啟超連結
				{id: '.uno:CopyHyperlinkLocation'}, // 複製超連結位置
				{id: '.uno:RemoveHyperlink'}, // 移除超連結
				{id: '.uno:Delete'}, // 刪除
				{id: '.uno:SpellCheckApplySuggestion'}, // 套用建議(拼字檢查)
				{id: '.uno:SpellCheckIgnore'}, // 忽略(拼字檢查)
				{id: '.uno:SpellCheckIgnoreAll'}, // 全部忽略(拼字檢查)
				{id: '.uno:FontDialogForParagraph'}, // FontDialogForParagraph

				{id: 'exportas-pdf'}, // exportas-pdf
				{id: 'exportdirectpdf'}, // exportdirectpdf
				{id: 'exportpdf'}, // exportpdf

				{id: 'shareas'}, // shareas
				{id: 'repair'}, // repair

				{id: 'home-search'}, // home-search
				{id: 'hyperlinkdialog'}, // hyperlinkdialog
				{id: 'charmapcontrol'}, // 符號
				{id: 'fullscreen'}, // 全螢幕
				{id: 'zoomreset'}, // 重設遠近
				{id: 'zoomout'}, // 拉遠
				{id: 'zoomin'}, // 拉近
				{id: 'showruler'}, // 顯示尺規
				{id: 'showstatusbar'}, // 顯示狀態列
				{id: 'collapsenotebookbar'}, // 收起分頁
			],
			text: [
				{id: 'exportas-epub'}, // exportas-pdf
				{id: 'exportepub'}, // exportepub

				{id: '.uno:OutlineBullet'}, // 項目符號與編號
				{id: '.uno:FrameDialog'}, // 外框屬性
				{id: 'inserttable'}, // inserttable
			],
			spreadsheet: [
				{id: '.uno:ExportAsGraphic'}, // 匯出為圖片
				{id: '.uno:TableSelectAll'}, // 選取全部的工作表
				{id: '.uno:TableDeselectAll'}, // 取消選取全部的工作表
				{id: '.uno:EnterString'}, // 輸入字串
				{id: '.uno:Cancel'}, // 取消
				{id: '.uno:StatusSelectionMode'}, // 標準選取
				{id: '.uno:StatusSelectionModeExt'}, // 擴展選取
				{id: '.uno:StatusSelectionModeExp'}, // 追加選取
				{id: '.uno:DataRanges'}, // 資料範圍
				{id: '.uno:ResetDataPoint'}, // 重設資料點
				{id: '.uno:DataSelect'}, // 選擇清單
				{id: '.uno:CurrentValidation'}, // 資料驗證
				{id: '.uno:Forward'}, // 上移一層
				{id: '.uno:EditHyperlink'}, // 編輯超連結
				{id: '.uno:EditShapeHyperlink'}, // 編輯圖案超連結
				{id: '.uno:DeleteShapeHyperlink'}, // 移除圖案超連結
				{id: '.uno:DeleteNote'}, // 刪除註解
				{id: '.uno:FillModeTracePredescessor'}, // 追蹤前導參照
				{id: '.uno:FillModeRemovePredescessor'}, // 移除前導參照
				{id: '.uno:FillModeTraceSuccessor'}, // 追蹤依賴此的
				{id: '.uno:FillModeRemoveSuccessor'}, // 移除出去箭號
				{id: '.uno:FillModeEnd'}, // 離開填入模式
				{id: '.uno:AutoSum'}, // 總和
				{id: '.uno:AutoAverage'}, // AutoAverage
				{id: '.uno:AutoMin'}, // AutoMin
				{id: '.uno:AutoMax'}, // AutoMax
				{id: '.uno:AutoCount'}, // AutoCount

				{id: 'print-active-sheet'}, // 列印目前工作表
				{id: 'print-all-sheets'}, // 列印全部工作表
			],
			presentation: [
				{id: '.uno:CloseMasterView'}, // 關閉母片檢視
				{id: '.uno:InsertRowsBefore'}, // 上方插入列
				{id: '.uno:InsertRowsAfter'}, // 下方插入列
				{id: '.uno:InsertColumnsBefore'}, // 前方插入欄
				{id: '.uno:InsertColumnsAfter'}, // 後方插入欄
				{id: '.uno:TextAutoFitToSize'}, // 自動調整文字

				{id: 'deletepage'}, // 刪除投影片
				{id: 'presentation'}, // 投影
			],
			drawing: [
				{id: 'deletepage'}, // 刪除投影片
			]
		},
		pausedInitCmd: '',
		// 系統指令白名單
		system: {
		},
	},

	// 帶有 hotkey 的指令
	_hotkeyCommands: {},

	_loKitVersion: {}, // 後端 Office 版本資訊

	// 支援匯出的格式
	_exportFormats: {
		text: [
			{format: 'pdf', label: _('PDF Document (.pdf)')},
			{format: 'txt', label: _('TEXT Document (.txt)')},
			{format: 'html', label: _('HTML Document (.html)')},
			{format: 'odt', label: _('ODF text document (.odt)')},
			{format: 'doc', label: _('Word 2003 Document (.doc)'), notODF: true},
			{format: 'docx', label: _('Word Document (.docx)'), notODF: true},
			{format: 'rtf', label: _('Rich Text (.rtf)'), notODF: true},
			{format: 'epub', label: _('EPUB Document (.epub)')},
		],
		spreadsheet: [
			{format: 'pdf', label: _('PDF Document (.pdf)')},
			{format: 'html', label: _('HTML Document (.html)')},
			{format: 'ods', label: _('ODF spreadsheet (.ods)')},
			{format: 'xls', label: _('Excel 2003 Spreadsheet (.xls)'), notODF: true},
			{format: 'xlsx', label: _('Excel Spreadsheet (.xlsx)'), notODF: true},
			{format: 'csv', label: _('CSV (.csv)')},
		],
		presentation: [
			{format: 'pdf', label: _('PDF Document (.pdf)')},
			{format: 'html', label: _('HTML Document (.html)')},
			{format: 'odp', label: _('ODF presentation (.odp)')},
			{format: 'ppt', label: _('PowerPoint 2003 Presentation (.ppt)'), notODF: true},
			{format: 'pptx', label: _('PowerPoint Presentation (.pptx)'), notODF: true},
		],
		drawing: [
			{format: 'pdf', label: _('PDF Document (.pdf)')},
			{format: 'odg', label: _('ODF Drawing (.odg)')},
			{format: 'png', label: _('Image (.png)')},
		],
	},

	/**
	 * 依據選單把選項指令加入系統白名單
	 * @param {array} menu
	 */
	createAllowCommand: function(menu) {
		// 必須是陣列
		if (L.Util.isArray(menu)) {
			menu.forEach(function(item) {
				this.addAllowCommand(item, true);
				// 有子選單就遞迴呼叫自己
				if (L.Util.isArray(item.menu) && item.menu.length > 0) {
					this.createAllowCommand(item.menu);
				}
			}.bind(this));
		}
	},

	/**
	 *	初始化文件預設值
	 * @param {string} [docType] - 文件類型
	 */
	initializeDocumentPresets: function(docType) {
		// 已經載入過，不要再載入一次
		if (L.Util.isArray(this._allowedCommands.menubarData)) {
			return;
		}

		var that = this;

		if (docType === undefined) {
			docType = this.getDocType();
		}

		// 處理特性指令(這些指令會依據不同狀況有不同結果)
		var wopi = this.wopi;
		this._allowedCommands.featureCommand = {
			'.uno:Print': !wopi.HidePrintOption, // 列印
			'.uno:Save': !wopi.HideSaveOption, // 存檔
			'.uno:SaveAs': !wopi.UserCanNotWriteRelative, // 另存新檔
			'ShareAs': wopi.EnableShare, // 分享
			'insertgraphicremote': wopi.EnableInsertRemoteImage, // 插入雲端圖片
			'.uno:RunMacro': window.enableMacrosExecution === 'true', // 執行巨集
			'rev-history': L.Params.revHistoryEnabled, // 修訂紀錄
			'Rev-History': L.Params.revHistoryEnabled, // 修訂紀錄
			'closedocument': L.Params.closeButtonEnabled, // 關閉文件
			'changesmenu': !wopi.HideChangeTrackingControls,

			'.uno:Presentation': !wopi.HideExportOption, // 從第一張投影片開始播放
			'.uno:PresentationCurrentSlide': !wopi.HideExportOption, // 從目前投影片開始播放

			'.uno:Protect': wopi.DocumentOwner == true, // 檔案擁有者，才可以保護/解除保護工作表
		};

		// 把該文件類別能夠匯出的類別指令，放入特性命令中
		this._exportFormats[docType].forEach(function(item) {
			var allowed = (wopi.HideExportOption !== true);
			var cmdName = 'downloadas-' + item.format;
			this._allowedCommands.featureCommand[cmdName] = allowed;
		}.bind(this));
		//-------------------------------------------------------------------------

		fetch(L.LOUtil.getURL('uiconfig/' + docType + '/menubar.json'))
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			this._allowedCommands.menubarData = data;
			// 1. 把選單指令加入系統白名單
			this.createAllowCommand(that._allowedCommands.menubarData);
			// 2. 把通用右鍵指令加入系統白名單
			this.createAllowCommand(that._allowedCommands.contextMenu.general);
			// 3. 把該類文件右鍵指令加入系統白名單
			this.createAllowCommand(that._allowedCommands.contextMenu[docType]);
			// 4. 把暫存未初始狀態的指令，一次送給 server
			if (this._loKitVersion['initUnoStatus'] !== undefined && that._allowedCommands.pausedInitCmd !== '') {
				app.socket.sendMessage('initunostatus ' + that._allowedCommands.pausedInitCmd);
			}

			this._allowedCommands.pausedInitCmd = ''; // 清除暫存命令
		}.bind(this))
		.catch(function (error) {
			console.error('Menubar load error:', error);
		});

		// download Common symbols.
		var locale = String.locale ? String.locale : navigator.language;
		var symbolsURL = L.LOUtil.getURL('uiconfig/symbols/' + locale + '.json');
		fetch(symbolsURL)
		.then(function (response) {
			return response.json();
		})
		.then(function (data) {
			this._allowedCommands.commonSymbolsData = data;
		}.bind(this))
		.catch(function (error) {
			console.error('Common symbols load error:', error);
		});
	},

	/**
	 * 取得選單資料
	 */
	getMenubarData: function() {
		return this._allowedCommands.menubarData;
	},

	/**
	 * 設定後端 Office 版本資訊
	 * @param {object} version : OxOffice Version object.
	 */
	setLoKitVersion: function(version) {
		if (typeof version === 'object')
			this._loKitVersion = version;
	},

	/**
	 * 取得後端 Office 版本資訊
	 * @returns {object} 版本物件
	 */
	getLoKitVersion: function() {
		return this._loKitVersion;
	},

	/**
	 * 取得目前文件所支援的匯出格式
	 * @returns {array} 列表
	 */
	getExportFormats: function() {
		var formats = this._exportFormats[this.getDocType()];
		return (formats !== undefined ? formats : []);
	},

	// Add by Firefly <firefly@ossii.com.tw>
	// 取得文件式樣列表
	getStyleFamilies: function() {
		return this.getToolbarCommandValues('.uno:StyleApply');
	},

	// 取得字型列表
	getFontList: function() {
		return this.getToolbarCommandValues('.uno:CharFontName');
	},

	/**
	 * 判斷是否為 uno 指令
	 * @param {string} unoCommand - .uno 開頭的 uno 指令
	 * @returns {boolean} true or false
	 */
	 isUnoCommand: function(unoCommand) {
		return (typeof unoCommand === 'string' && unoCommand.startsWith('.uno:'));
	},

	/**
	 * 查詢某指令是否有 hotkey
	 * @param {string} command
	 * @returns
	 */
	getCommandHotkey: function(command) {
		if (this._allowedCommands.system[command] &&
			this._allowedCommands.system[command].hotkey) {
			return this._allowedCommands.system[command].hotkey;
		}
		return null;
	},

	/**
	 * 取得快捷鍵執行命令
	 * @param {string} key - 易讀的按鍵組合字串(一律小寫)
	 * 組合按鍵順序為 ctrl+alt+shift+key
	 *
	 * @returns undefined: 沒有, string: 指令名稱
	 */
	getHotkeyCommand: function(key) {
		return this._hotkeyCommands[key.toLowerCase()];
	},

	// Add by Firefly <firefly@ossii.com.tw>
	// 將指令加入白名單中
	// 指令為 json 物件，內如下：
	// name:
	// id: .uno: 開頭的指令，或不重複的 id 名稱
	// hotkey: 若有快速鍵的話請指定，快速鍵組合依序為 Ctrl + Alt + Shift + Key 字串
	/**
	 * 將指令加入白名單中
	 * @param {object} command
	 * @param {boolean} dontInitStatus - true: 不設定狀態自動回報
	 * @returns true: 成功, false: 重複
	 */
	addAllowCommand: function(command, dontInitStatus) {
		var id = command.id; // id 是必要項目

		// 重複的話就不處理
		if (this._allowedCommands.system[id]) {
			return false;
		}

		if (dontInitStatus !== true) {
			dontInitStatus = false;
		}

		// 有 id 且沒有被隱藏
		if (id && command.hide !== true) {
			var obj = {};
			var queryIndex = id.indexOf('?'); // 是否有查詢符號
			// 有查詢符號就分別切開
			if (queryIndex > 0) {
				obj.queryString = id.substring(queryIndex);
				id = id.substring(0, queryIndex);
			}

			// 被選單設定禁用
			if (this._allowedCommands.menuPermissions[id] === false) {
				console.debug('Command "%s" Disabled by menu permission!', id);
				return false;
			}

			// 在特性名單中禁用
			if (this._allowedCommands.featureCommand[id] === false) {
				console.debug('Command "%s" Disabled by feature!', id);
				return false;
			}

			var hotkey = command.hotkey;

			// 有 hotkey 的話，另外存入 hotkeys 命令列表
			if (hotkey && hotkey.length > 0) {
				obj.hotkey = hotkey;

				var keys = hotkey.toLowerCase().split('+'); // 轉成小寫，用 '+' 號切開;
				var ctrl = keys.indexOf('ctrl'); // 有無 Ctrl
				var alt = keys.indexOf('alt'); // // 有無 Alt
				var shift = keys.indexOf('shift'); // 有無 shift
				var key = keys[keys.length-1]; // 取按鍵名稱
				// 依照 Ctrl+Alt+Shift+Key 順序，重新組合 hotkey
				keys = [];
				if (ctrl >= 0) keys.push('Ctrl');
				if (alt >= 0) keys.push('Alt');
				if (shift >= 0) keys.push('Shift');
				if (key.startsWith('arrow')) key = key.substring(5);

				keys.push(key);
				hotkey = keys.join('+').toLowerCase(); // 組合回小寫字串

				this._hotkeyCommands[hotkey] = id; // 紀錄該 hot key 所執行的 id
			}

			this._allowedCommands.system[id] = obj; // 紀錄該 ID 資訊
			// 有設定不初始化命令狀態
			if (dontInitStatus) {
				if (this.isUnoCommand(id)) {
					this._allowedCommands.pausedInitCmd += id + ',';
					if (this.isUnoCommand(command.name)) {
						this._allowedCommands.pausedInitCmd += command.name + ',';
					}
				}
			} else {
				this.setGetCommandStatus(id); // 設定該 ID 狀態自動回報
				// 如果另外有 name 話，一併設定該 name 狀態自動回報
				if (command.name) {
					this.setGetCommandStatus(command.name);
				}
			}
		}
		return true;
	},

	/**
	 * 設定取得 uno 指令
	 * @param {string} unoCommand - .uno: 開頭的指令
	 */
	setGetCommandStatus: function(unoCommand) {
		if (this.isUnoCommand(unoCommand) && this._loKitVersion['initUnoStatus'] !== undefined) {
			app.socket.sendMessage('initunostatus ' + encodeURI(unoCommand));
		}
	},

	/**
	 * 查詢某指令是否為白名單
	 * @param {string} command
	 * @returns true: yes, false: no
	 */
	isAllowedCommand: function(command) {
		var queryIndex = command.indexOf('?');
		// 切掉查詢字串(如果有的話)
		if (queryIndex > 0) {
			command = command.substring(0, queryIndex);
		}

		if (this._allowedCommands.system[command] === undefined) {
			console.debug('Warning! ' + command + ' not in white list and allowed commands!\n', '{id: \'' + command + '\'}, // ' + _UNO(command, this.getDocType(), true));
			return false;
		}
		return true;
	},

	/**
	 * 執行在白名單中的命令
	 * @param {string} command - 可以是 .uno:, macro://, dialog: 或是 menubar 定義過的 ID
	 * @returns true: 成功, false: 失敗
	 */
	executeAllowedCommand: function(command, json) {
		var result = false;
		command = command.trim(); // remove leading and trailing spaces
		// 該指令可被執行
		if (this.isAllowedCommand(command)) {
			if (this.alternativeCommand.has(command)) {
				this.alternativeCommand.run(command, json);
				result = true;
			// 指令開頭是 '.uno:' 或 'macro://'，直接執行
			} else if (command.startsWith('.uno:') || command.startsWith('macro://')) {
				// 是否有替代的指令
				var targetURL = _UNOTARGET(command, this.getDocType());
				if (targetURL) {
					command = encodeURI(targetURL);
				}
				this.sendUnoCommand(command, json);
				result = true;
			// 指令開頭是 dialog:，執行該 dialog
			} else if (command.startsWith('dialog:')) {
				var args = {};
				var dialogName = '';
				var startPos = 'dialog:'.length;
				var queryIdx = command.indexOf('?');
				var queryString = '';
				if (queryIdx >= 0) {
					dialogName = command.substring(startPos, queryIdx);
					queryString = command.substring(queryIdx + 1);
				} else {
					dialogName = command.substring(startPos);
				}

				if (queryString.length) {
					var params = queryString.split('&');
					for (var idx in params) {
						if (params[idx].length) {
							var keyvalue = params[idx].split('=');
							args[keyvalue[0]] = keyvalue[1];
						}
					}
				} else {
					args = json;
				}
				L.dialog.run(dialogName, {args: args});
				result = true;
			}
		} else {
			console.debug('Warning! command:"' + command + '" is not allowed.');
			result = true;
		}
		return result;
	},

	/**
	 * 提供 toolbar item 簡單地設定 checke 和 disabled 狀態
	 * @param {object} e - map.stateChangeHandler 產生的 event
	 * @param {object} item - toolbar item 本身
	 */
	simpleStateChecker: function(e, item) {
		item.checked = e.checked();
		item.disabled = e.disabled();
	},

	/**
	 * 簡單的處理 check/checked 和 enable/disable
	 * @param {object} e - map.stateChangeHandler 產生的指令狀態物件
	 */
	simpleStateChangeChecker: function(e) {
		this.checked = e.checked();
		this.disabled = e.disabled();
		this._toolbar.refresh(this.id); // 重新顯示 item
	},

	/**
	 * 把工具列各 item 自定的 state 處理，由 map.stateChangeHandler 主動呼叫
	 *
	 * @param {object} options - 參考下方
	 * @param {object} <options.toolbar> - w2ui 定義的 toolbar
	 * @param {boolean} [options.remove] - true: remove state change function if exists, other: add only
	 */
	setupStateChangesForToolbar: function(options) {
		// 沒有必要條件就結束
		if (!options || !options.toolbar || !options.toolbar.items) {
			return;
		}

		var map = this;
		var toolbar = options.toolbar;
		var isRemove = options.remove === true ? true : false;

		var rewrite = function(toolbar, items, remove) {
			items.forEach(function(item) {
				if (remove) {
					delete item._toolbar; // 移除 item 所紀錄的 toolbar
				} else {
					item._toolbar = toolbar; // 把 toolbar 放進 item
				}
				// stateChange 是 function 的話，表示默認 item.uno 或 item.id 就是 command
				if (typeof(item.stateChange) === 'function') {
					var commandName = (item.uno ? item.uno : '.uno:' + item.id);
					// 移除指令狀態回報
					if (remove) {
						map.stateChangeHandler.off(commandName, item.stateChange, item);
					} else { // 新增指令狀態回報
						map.stateChangeHandler.on(commandName, item.stateChange, item);
						// 加入白名單
						map.addAllowCommand({id: commandName});
					}
				// stateChange 是 object 的話，必須含有 commandName 及 callback 兩個結構
				// commandName 要監控的指令，若有多個，用空白分隔
				// callback 是 function(e){...} e 是物件參數
				} else if (typeof(item.stateChange) === 'object' &&
							typeof(item.stateChange.commandName) === 'string' &&
							typeof(item.stateChange.callback) === 'function') {
					var commands = item.stateChange.commandName.split(' ');
					// 依序處理每個指令
					for (var i = 0; i < commands.length; i++) {
						// 移除指令狀態回報
						if (remove) {
							map.stateChangeHandler.off(commands[i], item.stateChange.callback, item);
						} else { // 新增指令狀態回報
							map.stateChangeHandler.on(commands[i], item.stateChange.callback, item);
							// 加入白名單
							map.addAllowCommand({id: commands[i]});
						}
					}
				// stateChange 是 string 的話，表示該字串就是 command
				} else if (typeof(item.stateChange) === 'string') {
					// 移除指令狀態回報
					if (remove) {
						map.stateChangeHandler.off(item.stateChange, map.simpleStateChangeChecker, item);
					} else { // 新增指令狀態回報
						map.stateChangeHandler.on(item.stateChange, map.simpleStateChangeChecker, item);
						// 加入白名單
						map.addAllowCommand({id: item.stateChange});
					}
				// stateChange 是 true，而且有 uno
				} else if (item.stateChange === true && item.uno) {
					// 移除指令狀態回報
					if (remove) {
						map.stateChangeHandler.off(item.uno, map.simpleStateChangeChecker, item);
					} else {
						// 直接賦予 onStateChange
						map.stateChangeHandler.on(item.uno, map.simpleStateChangeChecker, item);
						// 加入白名單
						map.addAllowCommand({id: item.uno});
					}
				}

				// 擴及子項，遞迴呼叫，小心處理
				if (item.items && L.Util.isArray(item.items)) {
					rewrite(toolbar, item.items, remove);
				}
			});
		};

		rewrite(toolbar, toolbar.items, isRemove);
	},

	/**
	 * 令 OxOOL 重新取得文件狀態
	 * @author Firefly <firefly@ossii.com.tw>
	 */
	getDocumentStatus: function() {
		// 指令稍微延遲再送出
		setTimeout(function() {app.socket.sendMessage('status');}, 100);
	},

	/**
	 * 建立檔案類別圖示
	 */
	createFileIcon: function() {
		// 如果已經有檔案類別圖示，就算了
		var docLogoHeader = L.DomUtil.get('document-header');
		if (docLogoHeader) {
			return;
		}
		// 依據檔案類別建立圖示
		var iconClass = 'document-logo';
		switch (this.getDocType()) {
		case 'text':
			iconClass += ' writer-icon-img';
			break;
		case 'spreadsheet':
			iconClass += ' calc-icon-img';
			break;
		case 'presentation':
			iconClass += ' impress-icon-img';
			break;
		case 'drawing':
			iconClass += ' draw-icon-img';
			break;
		}

		docLogoHeader = L.DomUtil.createWithId('div', 'document-header');

		var docLogo = L.DomUtil.create('div', iconClass, docLogoHeader);
		$(docLogo).data('id', 'document-logo');
		$(docLogo).data('type', 'action');
		$('.main-nav').prepend(docLogoHeader);
	},

	/**
	 * 將 w2ui 產生的 overlay 選單隱藏
	 * 用於顯示下拉選單或右鍵選單時呼叫，以免同時顯示在螢幕上
	 */
	hideAllToolbarPopup: function() {
		var w2uiPrefix = '.w2ui-overlay';
		var $dom = $(w2uiPrefix);
		// type 為 color & text-color 會在最頂層？(搔頭)
		if ($dom.length > 0) {
			$dom.removeData('keepOpen')[0].hide();
		} else { // 隱藏所有 Toolbar 選單(如果有的話)
			for (var key in window.w2ui) {
				$dom = $('#w2ui-overlay-' + key);
				if ($dom.length > 0) {
					$dom.removeData('keepOpen')[0].hide();
				}
			}
		}
	},

	/**
	 * 翻譯指定 DOM 內所有 element 有指定的 attribute
	 */
	translationElement: function(DOM) {
		// 需要找出的 attributes
		var trAttrs = ['_', '_UNO', 'title', 'placeholder'];
		DOM.querySelectorAll('[' + trAttrs.join('],[') + ']').forEach(function(el) {
			for (var idx in trAttrs) {
				var attrName = trAttrs[idx];
				if (el.hasAttribute(attrName)) {
					// 讀取該 attribute 字串
					var origStr = el.getAttribute(attrName);
					// 翻譯結果
					var l10nStr = '';
					switch (attrName) {
					case '_':
					case 'title':
					case 'placeholder':
						l10nStr = _(origStr);
						break;
					case '_UNO':
						l10nStr = _UNO(origStr);
						break;
					default:
						break;
					}
					// 替代原來的字串
					if (attrName === 'title' || attrName === 'placeholder') {
						el.setAttribute('title', l10nStr);
					// 把翻譯結果插到該 element 的結尾
					} else if (attrName === '_' || attrName === '_UNO') {
						el.insertBefore(document.createTextNode(l10nStr), null);
					}
					if (origStr === l10nStr) {
						window.app.console.debug('warning! "' + origStr + '" may not be translation.');
					}
				}
			}
		}.bind(this));
	},

});

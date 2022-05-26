/* -*- js-indent-level: 8 -*- */
/**
 * L.Control.AlternativeCommand
 *
 * uno 指令替代機制
 * 有些 uno 指令無法直接執行，需要替代程序模擬出相同功能
 *
 * @author Firefly <firefly@ossii.com.tw>
 */

/* global L _ app */
L.Control.AlternativeCommand = L.Control.extend({

	onAdd: function(map) {
		this._map = map;
		this._commands._map = map;
	},

	has: function(orignalCommand) {
		return typeof(this._commands[orignalCommand]) === 'function';
	},

	get: function(orignalCommand) {
		if (this.has(orignalCommand)) {
			return this._commands[orignalCommand];
		}
	},

	run: function(orignalCommand, json) {
		var event = {
			commandName: orignalCommand,
			json: json
		};
		if (this.has(orignalCommand)) {
			if (orignalCommand === '.uno:InsertAnnotation') {
				this._map.insertComment();
			} else {
				this._commands[orignalCommand](event);
			}
			window.app.console.debug('Alternative command(%s), target:', orignalCommand, this._commands[orignalCommand]);
			return true;
		}
		return false;
	},

	_commands: {
		_map: null,

		/**
		 * 存檔
		 */
		'.uno:Save': function() {
			// Save only when not read-only.
			if (!this._map.isPermissionReadOnly()) {
				this._map.fire('postMessage', {msgId: 'UI_Save'});
				if (!this._map._disableDefaultAction['UI_Save']) {
					this._map.save(false, false);
				}
			}
		},
		/**
		 * 另存新檔
		 */
		'.uno:SaveAs': function() {
			this._map.openSaveAs();
		},
		/**
		 * 列印
		 */
		'.uno:Print': function() {
			this._map.print();
		 },
		/**
		 * 關閉檔案
		 */
		'.uno:CloseDoc': function() {
			this._map.closeDocument();
		},
		/**
		 * 編輯檔案
		 */
		'.uno:EditDoc': function() {
			// 如果有任何更改，先存檔，否則會 crash
			if (this._map._everModified) {
				this._map.save(true, true);
			}
			this._map.sendUnoCommand('.uno:EditDoc');
		},
		/**
		 * 插入電腦(本地)圖片
		 */
		'.uno:InsertGraphic': function() {
			L.DomUtil.get('insertgraphic').click();
		},
		/**
		 * 以外部工具編輯
		 */
		'.uno:ExternalEdit': function() {
			app.socket.sendMessage('getgraphicselection id=edit');
		},
		/**
		 * 儲存(下載)文件中的圖片
		 */
		'.uno:SaveGraphic': function() {
			app.socket.sendMessage('getgraphicselection id=export');
		},
		/**
		 * 插入/修改超連結
		 */
		'.uno:HyperlinkDialog': function(e) {
			// 手機界面不一樣
			if (window.mode.isMobile()) {
				this._map.showHyperlinkDialog();
			} else {
				this._map.sendUnoCommand(e.commandName);
			}
		},
		/**
		 * 修改超連結
		 * @param {*} e
		 */
		'.uno:EditHyperlink': function(e) {
			this['.uno:HyperlinkDialog'](e);
		},
		/**
		 * 修改圖案超連結
		 * @param {*} e
		 */
		'.uno:EditShapeHyperlink': function(e) {
			this['.uno:HyperlinkDialog'](e);
		},
		/**
		 * writer: 前往頁面
		 */
		'.uno:GotoPage': function() {
			L.dialog.run('GotoPage');
		},
		/**
		 * 插入註解
		 * TODO: Calc 執行這裡後，沒有反應，原因待查
		 */
		'.uno:InsertAnnotation': function() {
			this._map.insertComment();
		},
		/**
		 * calc: 啟用或取消追蹤修訂功能
		 */
		'.uno:TraceChangeMode': function() {
			var constCmd = '.uno:TraceChangeMode';
			var state = this._map.stateChangeHandler.getItemProperty(constCmd);

			// 非追蹤修訂模式就直接啟用
			if (!state.checked()) {
				this._map.sendUnoCommand(constCmd + '?TraceChangeMode:bool=true');
				return;
			}

			L.dialog.confirm({
				icon: 'warning',
				message: _('Stop tracking changes, will lose information about the changes.'),
				callback: function(ans) {
					if (ans) {
						this._map.sendUnoCommand(constCmd + '?TraceChangeMode:bool=false');
					}
				}.bind(this)
			});
		},
		/**
		 * calc: 插入工作表
		 */
		'.uno:Insert': function() {
			L.dialog.run('InsertTable');
		},
		/**
		 * calc: 從結尾插入工作表
		 */
		'.uno:Add': function() {
			L.dialog.run('AddTableAtEnd');
		},
		/**
		 * calc: 刪除工作表
		 */
		'.uno:Remove': function() {
			var currPart = this._map.getCurrentPartNumber();
			var currName = this._map._docLayer._partNames[currPart];
			L.dialog.confirm({
				icon: 'warning',
				message: _('Are you sure you want to delete sheet, %sheet% ?').replace('%sheet%', currName),
				callback: function(ans) {
					if (ans) {
						this._map.deletePage(currPart);
					}
				}.bind(this)
			});

		},
		/**
		 * 重新命名工作表
		 */
		'.uno:RenameTable': function() {
			var currPart = this._map.getCurrentPartNumber();
			// 工作表被保護就不能重新命名
			if (this._map.isPartProtected(currPart)) {
				return;
			}

			var currName = this._map._docLayer._partNames[currPart];
			L.dialog.prompt({
				icon: 'question',
				message: _('Enter new sheet name'),
				default: currName,
				callback: function(data) {
					// 有輸入資料
					if (data !== null) {
						if (this._map.isSheetnameValid(data, currPart)) {
							this._map.renamePage(data, currPart);
						} else {
							L.dialog.alert({
								icon: 'error',
								message: _('Invalid sheet name.\nThe sheet name must not be empty or a duplicate of \nan existing name and may not contain the characters [ ] * ? : / \\ \nor the character \' (apostrophe) as first or last character.')
							});
						}
					}
				}.bind(this)
			});
		},
		/**
		 * 移動或複製工作表
		 */
		'.uno:Move': function() {
			L.dialog.run('MoveTable');
		},
		/**
		 * 顯示工作表
		 */
		'.uno:Show': function() {
			L.dialog.run('ShowTable');
		},
		/**
		 * calc: 設定工作標籤色彩
		 */
		'.uno:SetTabBgColor': function() {
			L.dialog.run('SetTabBgColor');
		},
		/**
		 * 顯示線上說明
		 */
		 'online-help': function() {
			L.dialog.run('ShowHelp', {id: 'online-help'});
		},
		/**
		 * 顯示鍵盤快捷鍵說明
		 */
		'keyboard-shortcuts': function() {
			L.dialog.run('ShowHelp', {id: 'keyboard-shortcuts'});
		},
	},
});

L.control.alternativeCommand = function() {
	return new L.Control.AlternativeCommand;
};

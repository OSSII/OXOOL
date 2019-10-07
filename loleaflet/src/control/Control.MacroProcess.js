/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.MacroProcess
 */

L.Control.MacroProcess = L.Control.extend({
	// 想在文件開啟完畢後，執行的巨集，可以放在相應文件陣列裡
	options: {
		textMacroList: [
			'OxOOL.Writer.getBookmarks()'
		],
		spreadsheetMacroList: [
		],
		presentationMacroList: [
		]
	},

	onAdd: function (map) {
		map.on('updatepermission', this._onUpdatePermission, this);
		this._initialized = false;
	},

	onRemove: function (/*map*/) {
		// do nothing.
	},

	/* 文件載入完畢後，會執行這裡 */
	_onUpdatePermission: function (/* e */) {
		if (this._initialized) {
			return;
		}
		this._map.on('macroresult', this._onMacroResult, this);
		this._initialized = true;

		var docType = this._map.getDocType();
		var macroList = [];
		switch (docType) {
		case 'text':
			macroList = this.options.textMacroList;
			break;
		case 'spreadsheet':
			macroList = this.options.spreadsheetMacroList;
			break;
		case 'presentation':
		case 'drawing':
			macroList = this.options.presentationMacroList;
			break;
		default:
			break;
		}

		if (macroList.length > 0) {
			for (var i = 0 ; i < macroList.length ; i++) {
				// 避免非編輯模式時，this._map.sendUnoCommand() 不執行
				this._map._socket.sendMessage('uno macro:///' + macroList[i]);
			}
		}
	},

	/* 每當巨集執行後，有傳回資料的話，執行這裡 */
	_onMacroResult: function (macroresult) {
		console.debug('Macro result:', macroresult);

		var textMsg = macroresult.result;
		var index = textMsg.indexOf(':');
		var command = index !== -1 ? textMsg.substring(0, index) : '';
		var value = index !== -1 ? textMsg.substring(index+1) : '';

		switch (command) {
		case 'bookmarks':
			this._updateBookmarks(value);
			break;
		default:
			console.log('Warning! found unknow macro result:', macroresult);
			break;
		}
	},

	_updateBookmarks: function (values) {
		var bookmarks = JSON.parse(values);
		console.debug('Bookmarks:', bookmarks);
	},
});

L.control.macroprocess = function (options) {
	return new L.Control.MacroProcess(options);
};

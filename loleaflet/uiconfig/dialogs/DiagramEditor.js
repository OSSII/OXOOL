/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.DiagramEditor
 * Draw.io 圖表編輯器
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */

/* global L $ _ */
L.dialog.DiagramEditor = {

	haveInternalDrawio: false, // 有無內建 Drawio
	fonts: [], // OxOOL 字型列表
	data: '', // 待編輯資料
	oxoolDrawioUrl: window.serviceRoot + '/lool/oxdrawio/index.html', // OxOOL 內建的 Drawio 位址

	allowExternalDrawio: false, // 是否允許使用外部 Drawio 編輯器

	// initialize 只會在載入的第一次執行
	initialize: function() {
		var that = this;

		// 取得 OxOOL 字型列表
		var fontList = this._map.getFontList();
		for (var fontName in fontList) {
			this.fonts.push(fontName);
		}

		// 偵測內建的 Drawio 位址是否存在
		$.ajax({
			url: this.oxoolDrawioUrl,
			type: 'GET',
			async: false, // 要等待狀態回傳
			cache: false, // 不要 cache
			success: function(/*msg, text, response*/) {
				that.haveInternalDrawio = true;
			},
			error: function(/*xhr, ajaxOptions, thrownError*/) {
				that.haveInternalDrawio = false;
			}
		});
	},

	// 每次都會從這裡開始
	run: function(args) {
		if (args.xml !== undefined) {
			this.data = args.xml;
		} else if (args.svg !== undefined) {
			this.data = args.svg;
		} else {
			this.data = '';
		}

		if (this.haveInternalDrawio || this.allowExternalDrawio) {
			var editor = new DiagramEditor(this._map, this.fonts);
			if (this.haveInternalDrawio) {
				editor.editorURL = this.oxoolDrawioUrl
			}
			editor.start(this.data);
		} else {
			L.dialog.alert({
				icon: 'error',
				message: _('Diagram editor module not installed!'),
			});
		}
	}
};

function DiagramEditor(map, fonts) {
	this._map = map;
	this._fonts = fonts;
}

DiagramEditor.prototype.editorURL = 'https://embed.diagrams.net/'; // 官方編輯器位址

DiagramEditor.prototype.params = {
	embed: '1',
	spin: '1',
	proto: 'json',
	ui: 'min',
	configure: '1',
	libraries: '1',
	lang: String.locale.toLowerCase().replace('_', '-'),
}

DiagramEditor.prototype.start = function(data) {
	// 防止 OxOOL 閒置太久休眠，需暫停閒置程序執行
	this._saveActiveFlag = this._map.options.alwaysActive; // 暫存閒置旗標
	this._map.options.alwaysActive = true; // 永遠不進入休眠

	this._data = data;
	window.addEventListener('message', function(e) {
		this.handleMessageEvent(e)
	}.bind(this));

	this._frame = document.createElement('iframe');
	this._frame.setAttribute('frameborder', '0');
	this._frame.setAttribute('style', 'z-index:20000;position:absolute;border:0;width:100%;height:100%;' +
						'left:0;top:0;');
	var urlparams = '?';
	for (var key in this.params) {
		urlparams += key + '=' + this.params[key] + '&';
	}
	this._frame.setAttribute('src', this.editorURL + urlparams);
	document.body.appendChild(this._frame);
}

/**
*
* @param {event} e
*/
DiagramEditor.prototype.handleMessageEvent = function(e) {
	if (this._frame !== null
		&& e.source === this._frame.contentWindow
		&& e.data.length > 0) {
		try {
			var msg = JSON.parse(e.data);
			if (msg !== null) {
				this.handleMessage(msg);
			}
		}
		catch (e) {
			console.error(e);
		}
	}
}

DiagramEditor.prototype.handleMessage = function(msg) {
	switch (msg.event) {
	// If configure=1 URL parameter is used the application
	// waits for this message. For configuration options see
	// https://desk.draw.io/support/solutions/articles/16000058316
	case 'configure':
		this.postMessage({
			action: 'configure',
			config: {
				defaultFonts: this._fonts
			}
		});
		break;

	case 'init':
		this.postMessage({
			action: 'load',
			noSaveBtn: '1', // 不顯示存檔按鈕
			autosave: 0, // 不自動存檔
			saveAndExit: '1', // 要不要顯示「存檔並退出」按鈕
			noExitBtn: '0', // 要不要顯示「退出」按鈕
			modified: 'unsavedChanges',
			xml: this._data
		});
		break;

	case 'save':// 按下儲存
		if (msg.exit) { // 並離開
			// 通知 drawio 匯出 svg 格式
			this.postMessage({
				action: 'export',
				format: 'xmlsvg', // 若為 'xmlsvg' 會把 mxfile 放在 svg 的 content tag 內
				xml: msg.xml,
				spinKey: 'export'
			});
		}
		break;

	case 'export':
		var svgData = msg.data.substring(msg.data.indexOf(',') + 1);
		// 沒有傳來資料表示是新增
		if (this._data.length === 0) {
			app.socket.sendMessage('insertpicture ' + 'data=' + svgData);
		} else {
			app.socket.sendMessage('changepicture ' + 'data=' + svgData);
		}
		this.stop();
		break;

	case 'exit': // 離開
		this.stop();
		break;

	default:
		console.debug('unknow drawio event : ' + msg.event);
		break;
	}
}

DiagramEditor.prototype.postMessage = function(msg) {
	if (this._frame !== null) {
		this._frame.contentWindow.postMessage(JSON.stringify(msg), '*');
	}
}

DiagramEditor.prototype.stop = function() {
	if (this._frame !== null) {
		window.removeEventListener('message', this.handleMessageEvent);
		document.body.removeChild(this._frame);
		this._frame = null;
		this._map.options.alwaysActive = this._saveActiveFlag; // 恢復閒置旗標
	}
}

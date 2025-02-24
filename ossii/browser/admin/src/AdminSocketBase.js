/* -*- js-indent-level: 8 -*- */
/*
	Abstract class
*/

/* global $ _ Base */

var AdminSocketBase = Base.extend({
	socket: null,
	connectCount: 0,

	constructor: function (host) {
		// because i am abstract
		if (this.constructor === AdminSocketBase) {
			throw new Error('Cannot instantiate abstract class');
		}

		// We do not allow such child class to instantiate websocket that do not implement
		// onSocketMessage and onSocketOpen.
		if (typeof this.onSocketMessage === 'function' && typeof this.onSocketOpen === 'function') {
			this.socket = new WebSocket(host);
			this.socket.onopen = this.onSocketOpen.bind(this);
			this.socket.onclose = this.onSocketClose.bind(this);
			this.socket.onmessage = this.onSocketMessage.bind(this);
			this.socket.onerror = this.onSocketError.bind(this);
			this.socket.binaryType = 'arraybuffer';
		}

		this.pageWillBeRefreshed = false;
		var onBeforeFunction = function() {
			this.pageWillBeRefreshed = true;
		};
		window.onbeforeunload = onBeforeFunction.bind(this);
	},

	onSocketOpen: function () {
		/* Implemented by child */
	},

	onSocketMessage: function () {
		/* Implemented by child */
	},

	onSocketClose: function () {
		this.socket.onerror = function () { };
		this.socket.onclose = function () { };
		this.socket.onmessage = function () { };
		this.socket.close();

		if (this.pageWillBeRefreshed === false) {
			var options = {
				backdrop: false,
				keyboard: false,
				focus: false,
				content: _('Server has been shut down; Waiting to be back online.') +
				'<div>' +
				'<span class="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>' +
				'<span id="wait-server-start"></span>' +
				'</div>'
			};

			L.Dialog(options).show();
			this.waitServerStart(); // 進入等待 Server 重啟循環
		}
	},

	onSocketError: function () {
		L.Dialog.alert(_('Connection error'));
	},

	// 偵測 OxOOL Server 是否啟動，若是，就重新 reload 當前頁面
	waitServerStart: function () {
		var that = this;
		this.connectCount ++;
		$('#wait-server-start').text(_('Try to reconnect...') + ' #' + this.connectCount);
		setTimeout(function () {
			// 偵測 OxOOL 是否已經啟動
			// get "/" 位址，若傳回 OK 表示正常
			$.ajax({
				type: 'GET',
				url: '/',
				timeout: 100, // 0.1 秒
				success: function(data/*, textStatus*/) {
					if (data === 'OK') {
						location.reload();
					}  else {
						// 繼續測試
						that.waitServerStart();
					}
				},
				error:function(/*xhr, ajaxOptions, thrownError*/) {
					// 繼續測試
					that.waitServerStart();
				}
			});
		}, 2900);
	}
});

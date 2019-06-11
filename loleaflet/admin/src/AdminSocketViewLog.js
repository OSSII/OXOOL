/* -*- js-indent-level: 8 -*- */
/*
	View logs in the admin console.
*/
/* global vex $ AdminSocketBase Admin */
var AdminSocketViewLog = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_intervalId: 0,
	_position: 0,	// 最後 log 讀取位置
	_pause: false,	// 是否暫停

	getLog: function() {
		if (!this._pause)
		{
			this.socket.send('getLog ' + this._position);
		}
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		this.getLog();
		var socketLogView = this;
		$('#Pause').click(function () {
			socketLogView._pause = !socketLogView._pause;
			$('#Pause').text(socketLogView._pause ? '恢復讀取' : '暫停');
		});
	},

	onSocketMessage: function(e) {
		var textMsg;
		if (typeof e.data === 'string')
		{
			textMsg = e.data;
		}
		else
		{
			textMsg = '';
		}
		clearInterval(this._intervalId);
		var socketLogView = this;
		if (textMsg.startsWith('[ReadTo='))
		{
			
			var numStart = textMsg.indexOf('=') + 1;
			var numEnd = textMsg.indexOf(']');
			// 紀錄最後讀取位置
			this._position = Number(textMsg.substr(numStart, numEnd - numStart));
			//console.log(this._position);
			var context = textMsg.substr(numEnd + 1);
			var view = $('#log');
			view.text(view.text() + context);
			view.scrollTop(view[0].scrollHeight);
			this._intervalId = 
			setInterval(function() {
				return socketLogView.getLog();
			}, 5000);
		}
		else if (textMsg.startsWith('FileNotFound'))
		{
			vex.dialog.alert('無法讀取日誌檔！');
		}
	},

	onSocketClose: function()
	{
		clearInterval(this._intervalId);
	}
});

Admin.ViewLog = function(host)
{
	return new AdminSocketViewLog(host);
};

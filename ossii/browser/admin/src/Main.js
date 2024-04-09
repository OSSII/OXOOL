/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * @file Main.js
 * @brief window functions and variables.
 * @license MIT
 * @version 1.0.0
 * @date 2024.04.06
 */
/* global AdminSocketBase */

var AdminSocketMain = AdminSocketBase.extend({
	constructor: function (host) {
		this.base(host); // Call parent constructor to connect to the server's websocket

		this.initialize();
	},

	onSocketOpen: function () {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		this.socket.send('getModuleList');
	},

	onSocketMessage: function (e) {
		var textMsg = e.data;
		if (typeof e.data !== 'string') {
			textMsg = '';
		}

		// 是否是給 modules 的訊息，格式爲 <moduleId>command .....
		if (textMsg.startsWith('<')) {
			var closeIdx = textMsg.indexOf('>');
			if (closeIdx !== -1) {
				var moduleId = textMsg.substring(1, closeIdx);
				var command = textMsg.substring(closeIdx + 1);
				console.debug('AdminSocketMain.onSocketMessage: module ' + moduleId + ' command ' + command);
				// TODO: 轉送給對應的 module
			} else {
				console.error('AdminSocketMain.onSocketMessage: invalid format', textMsg);
			}
			return;
		}

		if (textMsg.startsWith('modules:'))  {
			// 後面是陣列字串，用 JSON.parse 解析
			try {
				var modules = JSON.parse(textMsg.substring(8));
				console.debug('AdminSocketMain.onSocketMessage: modules', modules);
			} catch (e) {
				console.error('AdminSocketMain.onSocketMessage: invalid format', textMsg);
			}
		}

	},

	onSocketClose: function () {
		this.base.call(this);
	},

	initialize: function () {
		// 設定系統下拉選單事件監聽
		document.getElementById('logout').addEventListener('click', this._onLogout.bind(this));
		document.getElementById('restartServer').addEventListener('click', this._onRestartServer.bind(this));
		document.getElementById('changePassword').addEventListener('click', this._onChangePassword.bind(this));

	},

	/**
	 * 登出事件處理
	 */
	_onLogout: function () {
		// 重新導向到登出 ./logout
		window.location.href = './logout';
	},

	/**
	 * 重新啟動伺服器事件處理
	 */
	_onRestartServer: function () {
		// TODO: 詢問是否重新啟動伺服器
		this.socket.send('shutdown');
	},

	/**
	 * 修改密碼事件處理
	 */
	_onChangePassword: function () {
		// TODO: 顯示修改密碼對話框
	},
});

(function (global) {
	'use strict';

	var host = (window.location.protocol === 'https:' ? 'wss://': 'ws://')
			 + window.location.host + '/oxool/adminws/';

	global.jwtToken = document.getElementById('JWT_TOKEN').textContent;

	// Initialize the main socket
	var mainSocket = new AdminSocketMain(host);
	console.debug('mainSocket', mainSocket);
}(window));

/* vim: set ts=8 sts=8 sw=8 tw=100: */

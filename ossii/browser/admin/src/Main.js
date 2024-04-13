/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * @file Main.js
 * @brief window functions and variables.
 * @license MIT
 * @version 1.0.0
 * @date 2024.04.06
 */
/* global L $ _ vex AdminSocketBase */

(function () {
	'use strict';

	var host = (window.location.protocol === 'https:' ? 'wss://' : 'ws://')
		+ window.location.host + '/oxool/adminws/';

	var AdminSocketMain = AdminSocketBase.extend({
		_l10n: [
			_('Administrator login'), // 管理員登入
			_('Admin Console'), // 控制檯
		],

		_adminRootURI: '', // 後臺管理根 URI
		_jwtToken: '', // jwt token

		_defaultModule: 'Overview', // 預設的模組

		// 後臺管理內建模組
		_internalModule: [
			{
				id: 'Overview',
				name: 'Overview',
				adminIcon: 'info-circle',
				adminItem: _('Overview'),
				_internalModule: true

			},
			{
				id: 'Analytics',
				name: 'Analytics',
				adminIcon: 'graph-up',
				adminItem: _('Analytics'),
				_internalModule: true
			},
			{
				id: 'Log',
				name: 'Log',
				adminIcon: 'journal-text',
				adminItem: _('Log'),
				_internalModule: true
			}
		],

		modules: {}, // 存放所有模組資料，key 爲模組 id, value 爲模組 detail

		runningModule: null, // 當前正在運行的模組

		constructor: function (host) {
			this._adminRootURI = document.getElementById('__ADMIN_ROOT__').textContent; // 後臺管理根 URI

			// 檢查 jwt token
			var jwtToken = window.getCookie('jwt');
			if (!jwtToken) {
				vex.dialog.alert(_('Authentication required'));
				// 等待 5 秒後重新導向到登出
				setTimeout(function () {
					window.location.href = this._adminRootURI + '/logout';
				}.bind(this), 5000);
				return;
			}

			this._jwtToken = jwtToken; // jwt token

			this.base(host); // Call parent constructor to connect to the server's websocket
			// Get the admin root URI
			this.initialize();
		},

		onSocketOpen: function () {
			// 連線成功後，傳送 jwt token，否則之後都無法和 server 通訊
			this.socket.send('auth jwt=' + this._jwtToken);

			this.socket.send('mem_consumed');
			this.socket.send('getAdminModuleList ' + String.locale); // 要求傳回有後臺管理的模組
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
					if (this.runningModule.detail.id === moduleId) {
						this.runningModule.onMessage(command);
					} else {
						console.error('Running module id is "%s" but received message for module id "%s"',
							this.runningModule.detail.id , moduleId);
					}
				} else {
					console.error('AdminSocketMain.onSocketMessage: invalid format', textMsg);
				}
				return;
			}

			if (textMsg === 'InvalidAuthToken') { // 無效的 jwt token
				vex.dialog.alert(_('Invalid authentication token'));
			} else if (textMsg === 'NotAuthenticated') { // 未驗證
				vex.dialog.alert(_('Authentication required'));
			} if (textMsg.startsWith('adminmodules:')) {
				// 後面是陣列字串，用 JSON.parse 解析
				try {
					var modules = JSON.parse(textMsg.substring(14));
					// 把後臺管理模組加入 modules
					modules.forEach(function (module) {
						this.modules[module.id] = module;
					}.bind(this));
					this.createMeun(modules);
				} catch (e) {
					console.error('AdminSocketMain.onSocketMessage: invalid format', textMsg);
				}
			} else if (textMsg.startsWith('ConfigAuthWrong')) {
				// 原來的帳號密碼與 oxoolwsd.xml 不符
				vex.dialog.alert(_('The account or password is inconsistent with the system!'));
			} else if (textMsg.startsWith('ConfigAuthOk')) {
				// 原來的帳號密碼與 oxoolwsd.xml 一致
				this._changeAccountPassword();
			} else if (textMsg.startsWith('setAdminPasswordOk')) {
				vex.dialog.alert(_('The account and password have been updated and will take effect after the next service restart.'));
			} else if (this.runningModule) {
				this.runningModule.onMessage(textMsg);
			}
		},

		onSocketClose: function () {
			this.base.call(this);
			this.destroyRunningModule();
		},

		initialize: function () {
			// 把內建模組加入 modules
			this._internalModule.forEach(function (module) {
				this.modules[module.id] = module;
			}.bind(this));

			// 設定內部模組選單
			this.createMeun(this._internalModule, true);

			this.setModule(this._defaultModule); // 設定預設模組

			// 設定系統下拉選單事件監聽
			// 設定登出按鈕事件監聽
			$('#logout').on('click', function () {
				// 重新導向到登出 logout
				window.location.href = this._adminRootURI + '/logout';
			}.bind(this));

			// 設定重啓伺服器按鈕事件
			$('#restartServer').on('click', function () {
				this._onRestartServer();
			}.bind(this));

			// 設定修改密碼按鈕事件
			$('#changePassword').on('click', function () {
				this._onChangePassword();
			}.bind(this));
		},

		/**
		 *
		 * @param {array} modules - 模組資料
		 * @param {bool} isInternal - 是否內部模組
		 */
		createMeun: function (modules, isInternal) {
			var $menuElement = $(isInternal === true ? '#__INTERNAL_MENU__' : '#__EXTERNAL_MENU__');
			console.debug('AdminSocketMain.createMenu: modules', modules);
			// 清空選單
			$menuElement.empty();
			// 產生選單
			modules.forEach(function (module) {
				var $li = $('<li>').addClass('nav-item');
				var $btn = $('<button>').addClass('nav-link');
				var $icon = $('<i>').addClass('bi bi-' + module.adminIcon);
				var $span = $('<span>').html('&nbsp;&nbsp;' + module.adminItem);
				$btn.append($icon).append($span);
				$li.append($btn);
				$menuElement.append($li);
				// 如果有 summary，設定 title 爲 summary
				if (module.summary) {
					$li.attr('title', module.summary);
				}
				// 設定點擊事件
				$btn.on('click', function () {
					this.setModule(module.id);
				}.bind(this));
			}.bind(this));
		},

		/** 執行某個模組 */
		setModule: function (moduleId) {
			var detail = this.modules[moduleId];
			if (!detail) {
				console.error('AdminSocketMain.setModule: invalid module id', moduleId);
				return;
			}

			// 是目前正在執行的模組，不做任何事
			if (this.runningModule && this.runningModule.detail.id === moduleId) {
				return;
			}

			this.destroyRunningModule(); // 銷毀正在運行的模組，如果有的話

			var that = this;
			var moduleURI; // 模組的 URI
			// 內部模組或外部模組
			if (detail._internalModule === true) { // 內部模組
				moduleURI = './standard/' + detail.id + '/';
			} else { // 外部模組
				moduleURI = detail.adminURI;
			}

			// 載入 admin.html 頁面
			fetch(moduleURI + 'admin.html').then(function (response) {
				if (response.ok) {
					return response.text();
				}
				throw new Error('Network response was not ok.');
			}).then(function (html) {
				var mainContent = document.getElementById('__MAIN_CONTENT__');
				// 清空 mainContent
				mainContent.innerHTML = '';

				var parser = new DOMParser();
				var doc = parser.parseFromString(html, 'text/html');
				// 插入 admin.html 的內容
				mainContent.appendChild(doc.body);
				// 取得所有 script 元素
				var scripts = doc.getElementsByTagName('script');
				// 如果有 scripts，載入所有 script
				if (scripts.length > 0) {
					that.importScripts(scripts);
				}

				// 翻譯整頁
				// TODO: 應該只翻譯 mainContent，不應該翻譯整頁
				// 但 window.translate.elementById('__MAIN_CONTENT__') 不 work.
				window.translate.page();

				// 判斷 admin.js 是否已經載入，如果已經載入，不再載入
				if (L.AdminModule[detail.name]) {
					console.debug('Reuse module: ', detail.name);
					that.runningModule = new L.AdminModule[detail.name]();
				} else {
					console.debug('Load module: ', detail.name);
					that.importJS(moduleURI + 'admin.js', function (result) {
						if (result.success) {
							var newModule = L.AdminModule[detail.name];
							if (typeof newModule === 'function') {
								newModule.include({
									// 複製模組, avoid changing the original module
									detail: JSON.parse(JSON.stringify(detail)),
									// 替模組增加 getDetail 方法
									getDetail: function () {
										return this.detail;
									},
									// 把模組的 sendMessage 設定爲 AdminSocketMain 的 sendModuleMessage
									sendMessage: that.sendModuleMessage.bind(that),
								});
								that.runningModule = new newModule();
							} else {
								console.error('AdminSocketMain.setModule: invalid module', detail.name);
							}
						} else {
							console.error('AdminSocketMain.setModule: script load failed');
						}
					});
				}
			}).catch(function (error) {
				console.error('AdminSocketMain.setModule: fetch failed', error);
			});
		},

		/**
		 * 銷毀正在運行的模組
		 */
		destroyRunningModule: function () {
			if (this.runningModule) {
				if (typeof this.runningModule.terminate === 'function') {
					this.runningModule.terminate();
				}
				delete this.runningModule;
				this.runningModule = null;
			}
		},

		importScripts: function (scripts) {
			// 如果沒有 script，不做任何事
			if (!scripts || scripts.length === 0) {
				return;
			}

			// 依序載入 script
			for (var i = 0; i < scripts.length; i++) {
				var script = scripts[i];
				if (!script.src || script.src === '') {
					continue;
				}
				// 載入 script
				this.importJS(script.src, function (result) {
					if (!result.success) {
						console.error('AdminSocketMain.importScripts: script load failed', result.url);
					}
				});
			}
		},

		/**
		 * 載入 js 檔案
		 *
		 * @param {string} url - 要載入的 js 檔案的 URL
		 * @param {function} callback - 載入成功或失敗後的 callback
		 */
		importJS: function (url, callback) {
			var script = document.createElement('script');
			script.src = url;
			script.type = 'text/javascript';
			script.async = false; // 保證載入順序
			script.defer = true; // 保證載入順序
			script.onload = function () {
				callback && callback({success: true, url: url});
				// 移除 script
				document.body.removeChild(script);
			};
			script.onerror = function () {
				callback && callback({success: false, url: url});
				// 移除 script
				document.body.removeChild(script);
			};
			document.body.appendChild(script);
		},

		/**
		 * !!!!! 注意 !!!!! 這個方法是給模組呼叫的。
		 *
		 * 我們自己傳送訊息給 server 的方法是 this.socket.send()
		 *
		 * @param {string} msg 訊息
		 * @returns {boolean} 是否成功 - true: 成功, false: 失敗
		 */
		sendModuleMessage: function (msg) {
			// 如果沒有正在運行的模組，延遲 1 毫秒後再嘗試 10 次
			if (this.runningModule === null) {
				var that = this;
				var count = 0;
				var interval = setInterval(function () {
					if (that.runningModule !== null) {
						clearInterval(interval);
						that.sendModuleMessage(msg);
					} else {
						count++;
						if (count > 10) {
							clearInterval(interval);
						}
					}
				}, 1);
				return false;
			}

			// 如果沒有正在運行的模組，不做任何事
			if (this.runningModule === null) {
				console.error('No module is running!');
				return false;
			}

			var detail = this.runningModule.detail;
			// 依據模組的 id，從我們的模組列表中找到對應的模組，
			// 避免被錯誤的模組欺騙
			if (!detail || !detail.id) {
				console.error('Invalid module detail');
				return false;
			}

			var module = this.modules[detail.id];
			if (!module) {
				console.error('Invalid module', detail.id);
				return false;
			}

			this.socket.send((module._internalModule === true ? '' : '<' + detail.id + '>') + msg.trim());
		},

		/**
		 * 重新啟動伺服器事件處理
		 */
		_onRestartServer: function () {
			var that = this;
			vex.dialog.confirm({
				message: _('Are you sure you want to restart the online service?'),
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, { text: _('OK') }),
					$.extend({}, vex.dialog.buttons.NO, { text: _('Cancel') })
				],
				callback: function (value) {
					if (value) {
						that.socket.send('shutdown maintenance');
					}
				}
			});
		},

		/**
		 * 修改密碼事件處理
		 */
		_onChangePassword: function () {
			var that = this;
			vex.dialog.open({
				message: _('For security reasons, please enter your original management account and password.'),
				input: [
					'<input class="form-control" name="username" type="text" placeholder="' + _('User name') + '" required />',
					'<input name="password" type="password" placeholder="' + _('Password') + '" required />'
				].join(''),
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, { text: _('Verification') }),
					$.extend({}, vex.dialog.buttons.NO, { text: _('Cancel') })
				],
				callback: function (data) {
					if (data) {
						that.socket.send('isConfigAuthOk ' + data.username + ' ' + data.password);
					}
				}
			});
		},

		_changeAccountPassword: function () {
			var that = this;
			vex.dialog.open({
				message: _('Please enter a new account and password.'),
				input: [
					'<input class="form-control" name="username" type="text" placeholder="' + _('User name') + '" required />',
					'<input class="form-control" name="password" type="password" placeholder="' + _('Password') + '" required />',
					'<input class="form-control" name="confirmpassword" type="password" placeholder="' + _('Confirm password') + '" required />'
				].join(''),
				buttons: [
					$.extend({}, vex.dialog.buttons.YES, { text: _('OK') }),
					$.extend({}, vex.dialog.buttons.NO, { text: _('Cancel') })
				],
				callback: function (data) {
					if (data) {
						if (data.password === data.confirmpassword) {
							that.socket.send('setAdminPassword ' +
								data.username + ' ' + data.password);
						}
						else {
							vex.dialog.alert(_('The password does not match the confirmation password!'));
						}
					}
				}
			});
		},
	});

	new AdminSocketMain(host);

}());

/* vim: set ts=8 sts=8 sw=8 tw=100: */

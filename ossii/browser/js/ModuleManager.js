/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.ModuleManager
 */
/* global L app */
L.Module = L.Class.extend({
	options: {
	},

	_map: null,

	/**
	 * Modules handler
	 *
	 * @private
	 *
	 * @type {Object}
	 * @property {string} Module ID
	 * @property {Object} Module handler
	 *
	 */
	_handlers: {},

	_docLayerOnMessage: null, // save the original docLayer _onMessage function

	/**
	 * Initialize the ModuleManager
	 */
	initialize: function (options) {
		L.setOptions(this, options);
		if (this.options.map) {
			this._map = this.options.map;
		} else {
			this._map = app.map;
		}

		this._loadBrowserModules();

		this._map.on('doclayerinit', this._onDocLayerInit, this);
		this._map.on('menubarReady', this._onMenubarReady, this);
	},

	/**
	 * Add module
	 * @param {object} moduleHandler
	 * @param {object} detail
	 */
	add: function (moduleHandler, detail) {
		if (moduleHandler) {
			moduleHandler.include({
				base: this, // save base class
				detail: JSON.parse(JSON.stringify(detail)), // save detail object
				getDetail: function () {
					return this.detail;
				}
			});
		}
		var handler = new moduleHandler(); // create module handler

		this._handlers[detail.id] = handler; // save module handler
		// Call module onAdd function
		if (handler.onAdd) {
			handler.onAdd(this._map);
		}

		return this;
	},

	/**
	 * Remove module
	 * @param {string} id - Module ID
	 */
	remove: function (id) {
		if (this._handlers[id]) {
			var handler = this._handlers[id];
			if (handler.onRemove) {
				handler.onRemove(this._map);
			}
			delete this._handlers[id];
		}
		return this;
	},

	/**
	 * Execute module command
	 *
	 * @param {string} moduleId - Module ID
	 * @param {string} command - Command
	 */
	executeCommand: function (moduleId, command) {
		// 取得 module handler
		var handler = this._handlers[moduleId];
		if (handler) {
			// Call module onCommand function
			if (handler.onCommand) {
				handler.onCommand(command);
			} else {
				console.error('Module %s does not have onCommand function', handler.detail.name);
			}
		} else {
			console.error('Module ID(%s) handler not found', moduleId);
		}
	},

	/**
	 * Send message to the server
	 * !!!NOTE: This function is only for the module to send message to the server
	 * !!!NOTE: Do not use this function to send message to the server directly
	 *
	 * 這裏的 this 是模組，所以可以使用 this.detail 取得模組的 detail 物件
	 *
	 * @param {string} msg
	 */
	sendMessage: function (msg) {
		// 如果有 detail，表示是模組呼叫
		if (this.detail) {
			// 加上模組 ID
			msg = '<' + this.detail.id + '>' + msg;
			console.debug('L.ModuleManager: sendMessage from: %s: %s', this.detail.name, msg);
		}
		app.socket.sendMessage(msg);
	},

	/**
	 * Document layer initialized
	 *
	 * @private
	 */
	_onDocLayerInit: function () {
		// Override docLayer _onMessage function to handle from server message
		this._docLayerOnMessage = L.bind(this._map._docLayer._onMessage, this._map._docLayer);
		this._map._docLayer._onMessage = L.bind(this._onMessage, this);
	},

	/**
	 * Handle message from server
	 *
	 * @param {string} textMsg
	 * @param {*} img
	 */
	_onMessage: function (textMsg, img) {
		// 如果第一個字元是 '<'，表示式給特定模組處理的訊息，格式為 <模組 ID>訊息
		if (textMsg.startsWith('<')) {
			var closeTagIndex = textMsg.indexOf('>');
			var moduleId = textMsg.substring(1, closeTagIndex); // 取得模組 ID
			var message = textMsg.substring(closeTagIndex + 1); // 取得訊息
			// Check if message is for module
			if (this._handlers[moduleId]) {
				var handler = this._handlers[moduleId]; // 取得模組 handler
				// Call module onMessage function
				if (handler.onModuleMessage) {
					handler.onModuleMessage(message);
				} else {
					console.error('Module %s does not have onModuleMessage function', handler.detail.name);
				}
			} else {
				console.error('Module ID(%s) handler not found', moduleId);
			}
			return; // 給特定模組處理的訊息，不再轉送給其他模組
		}

		// 非模組特定訊息（一般訊息），轉送給有興趣的模組處理
		// 有興趣的模組，需註冊 map.on('onmessage', function(e) { ... }, this);
		this._map.fire('onmessage', { textMsg: textMsg, img: img });

		// forward message to original docLayer _onMessage
		if (this._docLayerOnMessage) {
			this._docLayerOnMessage(textMsg, img);
		}
	},

	/**
	 * Load browser modules
	 *
	 * @private
	 */
	_loadBrowserModules: function () {
		if (!this.options.modules || this.options.modules.length === 0) {
			return;
		}

		for (var i = 0; i < this.options.modules.length; i++) {
			var detail = this.options.modules[i];
			// Skip if no browserURI or no browserModuleJS
			if (!detail || detail.browserURI === '' || detail.browserModuleJS === '') {
				continue;
			}

			this._handlers[detail.id] = null;

			this._asyncLoadModule(detail);
		}
	},

	/**
	 * Asynchronously load browser module
	 *
	 * @param {object} module
	 * @returns {void}
	 */
	_asyncLoadModule: function (detail) {
		var l10nURI = detail.browserURI + 'localizations';
		String.toLocaleString(l10nURI);

		var script = document.createElement('script');
		var moduleName = detail.name;

		script.type = 'text/javascript';
		script.async = true;
		script.src = detail.browserModuleJS;
		script.onload = function () {
			// 檢查是否有 L.Module[moduleName] 這個 class(模組 L.Module.{moduleName})
			if (L.Module[moduleName]) {
				this.add(L.Module[moduleName], detail);
			} else {
				console.error('Module class not found: ', moduleName);
				delete this._handlers[detail.id];
			}
			document.head.removeChild(script); // remove script tag
		}.bind(this);
		script.onerror = function () {
			delete this._handlers[detail.id];
			console.error('Failed to load module: ', moduleName);
			document.head.removeChild(script); // remove script tag
		}.bind(this);

		document.head.appendChild(script); // add script to head and load
	},

	_onMenubarReady: function () {
		var loaded = true;
		for (var moduleId in this._handlers) {
			if (this._handlers[moduleId] === null) {
				loaded = false;
				break;
			}
		}

		if (!loaded) {
			setTimeout(L.bind(this._onMenubarReady, this), 10);
			return;
		}

		var docType = this._map.getDocType();
		// All modules are loaded
		// Add modules menu items to the menubar
		for (var moduleId in this._handlers) {
			var handler = this._handlers[moduleId];
			// if handler has menubar and menubar has docType
			if (handler && handler.menubar && handler.menubar[docType]) {
				var event = {
					moduleId: moduleId,
					menubar: handler.menubar[docType],
				};
				this._map.fire('addmodulemenu', event);
			}
		}
	},

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

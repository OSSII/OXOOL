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
	 * Modules
	 *
	 * @private
	 *
	 * @type {Object}
	 * @property {string} id - Module ID
	 * @property {object} handler - Module handler
	 *
	 */
	_modules: {},

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
	},

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

		this._modules[detail.id] = handler; // save module handler
		// Call module onAdd function
		if (handler.onAdd) {
			handler.onAdd(this._map);
		}

		return this;
	},

	remove: function (id) {
		if (this._modules[id]) {
			var handler = this._modules[id];
			if (handler.onRemove) {
				handler.onRemove(this._map);
			}
			delete this._modules[id];
		}
		return this;
	},

	/**
	 * Send message to the server
	 *
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
			if (this._modules[moduleId]) {
				var handler = this._modules[moduleId]; // 取得模組 handler
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
		// Skip if no browserURI
		if (!detail || detail.browserURI === '') {
			return;
		}

		var script = document.createElement('script');
		var moduleName = detail.name;
		script.src = detail.browserURI + 'module.js';
		script.onload = function () {
			// 檢查是否有 L.Modula[moduleName] 這個 class(模組 L.Module.{moduleName})
			if (L.Module[moduleName]) {
				this.add(L.Module[moduleName], detail);
			} else {
				console.error('Module class not found: ', moduleName);
			}
		}.bind(this);
		script.onerror = function () {
			console.error('Failed to load module: ', moduleName);
		};

		document.head.appendChild(script); // add script to head and load
	},

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

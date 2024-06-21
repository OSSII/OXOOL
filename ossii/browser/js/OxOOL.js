/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.OxOOL
 */
/* global L app */
L.OxOOL = L.Class.extend({
	options: {
	},

	_socketOnMessage: null, // save the original socket onMessage function
	_savedDispatchFunction: null, // save the original dispatch function

	_modules: {}, // modules

	_ModuleManager: null, // ModuleManager

	/**
	 * Initialize the OxOOL library
	 */
	initialize: function (options) {
		L.setOptions(this, options);
		if (this.options.map) {
			this._map = this.options.map;
		} else {
			this._map = app.map;
		}

		// Override socket _onMessage function to handle the message
		this._overrideCoolFunctions();

		// Register our own handlers
		this._registerHandlers();


		this._prelaodData();

		this._map.on('doclayerinit', this._onDocLayerInit, this);
	},

	getModuleByName: function (name) {
		return this._modules[name];
	},

	/**
	 * Override some cool functions if needed.
	 *
	 * @private
	 */
	_overrideCoolFunctions: function () {

		// save the original socket onMessage function
		this._socketOnMessage = L.bind(app.socket._onMessage, app.socket);
		// override the socket onMessage function
		app.socket._onMessage = L.bind(this._onMessage, this);

		// take over the dispatch function
		this._savedDispatchFunction = L.bind(app.map.dispatch, app.map);
		app.map.dispatch = L.bind(this._dispatch, this);
	},

	/**
	 * Handle socket message
	 *
	 * @private
	 * @param {event} e - the event object
	 */
	_onMessage: function (e) {
		// When client send 'load url=<...>' message,
		// the server will send 'modules: [...]' message back first,
		// so we can create the ModuleManager before loading document.
		if (e.textMsg.startsWith('modules:')) {
			var options = {
				map: this._map,
				modules: [],
			};

			try {
				var jsonStr = e.textMsg.substring('modules:'.length);
				options.modules = JSON.parse(jsonStr);

				this._ModuleManager = new L.Module(options);
				this._modules = {};
				for (var i = 0; i < options.modules.length; i++) {
					this._modules[options.modules[i].name] = options.modules[i];
				}
			} catch (e) {
				console.error('Failed to parse modules: ', e);
			}

			return;
		} else if (e.textMsg.startsWith('watermark:')) {
			this._map.options.watermark = JSON.parse(e.textMsg.substring(e.textMsg.indexOf('{')));
			return;
		}

		// Call the original socket onMessage function
		if (this._socketOnMessage) {
			this._socketOnMessage(e);
		}
	},

	/**
	 * Handle the dispatch function
	 * If the command is not allowed, call the original dispatch function
	 * @private
	 * @param {string} action - the command to be dispatched
	 */
	_dispatch: function (action) {
		if (!app.map.executeAllowedCommand(action))
			// Call the original dispatch function
			this._savedDispatchFunction(action);
	},

	/**
	 * Register our own handlers
	 *
	 * @private
	 */
	_registerHandlers: function () {
		// register the alternative command handler
		this._map.addHandler('alternativeCommand', L.Map.AlternativeCommand);
		// register the state change handler extension
		this._map.addHandler('stateChangeExtend', L.Map.StateChangeExtend);
	},

	/**
	 * Preload the data
	 *
	 * 在文件載入之前預先載入及處理和文件類型無關的資料
	 * 若需載入和文件類型有關的資料，需寫在 _postloadData 中
	 *
	 * @private
	 */
	_prelaodData: function () {
		// download Common symbols.
		var locale = String.locale ? String.locale : navigator.language;
		var symbolsURL = L.LOUtil.getURL('uiconfig/symbols/' + locale + '.json');
		fetch(symbolsURL)
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				this._map.fire('symbolsloaded', data);
			}.bind(this))
			.catch(function (error) {
				console.error('Common symbols load error:', error);
			});
	},

	/**
	 * Postload the data
	 *
	 * @private
	 */
	_postloadData: function (docType) {
		// download menubar.json
		var baseURL = L.LOUtil.getURL('uiconfig/' + docType);
		fetch(baseURL + '/menubar.json')
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				this._map.fire('menubarloaded', data);
			}.bind(this))
			.catch(function (error) {
				console.error('Menubar load error:', error);
			});

		// 如果從 WOPI Host 有指定選單權限，就直接使用
		if (this._map.wopi.UserExtraInfo && this._map.wopi.UserExtraInfo.MenuPermissions) {
			this._map._allowedCommands.menuPermissions = this._map.wopi.UserExtraInfo.MenuPermissions;
			console.debug('Use WOPI menu permissions.');
		} else {
			// download perm.json
			fetch(baseURL + '/perm.json')
				.then(function (response) {
					return response.json();
				})
				.then(function (data) {
					this._map.fire('permloaded', data);
				}.bind(this))
				.catch(function (error) {
					console.warn('perm.json load error:', error);
				});
		}
	},

	/**
	 * Handling after document layer initialization
	 *
	 * @private
	 */
	_onDocLayerInit: function () {
		var docType = this._map.getDocType();

		// 取得文件類型的識別色
		var docIdentify = getComputedStyle(document.documentElement).getPropertyValue('--' + docType + '-identify-color');
		// 設定 CSS 變數 --doc-identify-color 爲目前文件的識別色
		if (docIdentify) {
			document.documentElement.style.setProperty('--doc-identify-color', docIdentify);
			console.debug('document identify color:', docIdentify);
		} else {
			console.warn('Can not get document identify color: ' + docType);
		}

		// 初始化文件的預設設定
		// TODO: 這個步驟將來改寫到 這個 class 中
		this._map.initializeDocumentPresets(docType);

		this._postloadData(docType);
	},

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

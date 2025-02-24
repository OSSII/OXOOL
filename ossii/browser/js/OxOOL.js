/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.OxOOL
 */
/* global L app _ */
L.OxOOL = L.Class.extend({
	options: {
	},

	moduleManager: null, // ModuleManager

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

		this._preloadData();

		// Listen to the doclayerinit event
		this._map.on('doclayerinit', this._onDocLayerInit, this);
		// Listen to the wopiprops event
		this._map.on('wopiprops', this._onWopiProps, this);
	},

	/**
	 * Get the module by name
	 *
	 * @param {string} name - the name of the module
	 * @return {object} the module object
	 */
	getModuleByName: function (name) {
		return this._modules[name];
	},

	// Private variables there --------------------------------------------
	_map: null, // the map object
	_socketOnMessage: null, // save the original socket onMessage function
	_savedDispatchFunction: null, // save the original dispatch function

	_modules: {}, // modules

	// Private methods there --------------------------------------------

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
		var handled = false; // whether the message is handled
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
				this._modules = {};
				for (var i = 0; i < options.modules.length; i++) {
					this._modules[options.modules[i].name] = options.modules[i];
				}

				this._map.fire('modulesloaded', this._modules); // fire modulesloaded event

				this.moduleManager = new L.Module(options);

			} catch (e) {
				console.error('Failed to parse modules: ', e);
			}

			handled = true;
		} else if (e.textMsg.startsWith('watermark:')) {
			this._map.options.watermark = JSON.parse(e.textMsg.substring(e.textMsg.indexOf('{')));
			handled = true;
		} else if (e.textMsg.startsWith('lokitversion ')) {
			try {
				var kitJson = JSON.parse(e.textMsg.substring('lokitversion '.length));
				this._map.setLoKitVersion(kitJson);
			} catch (e) {
				console.error('Failed to parse lokitversion: ', e);
			}
			// pass the message to the original socket onMessage function
		} else if (e.textMsg.startsWith('announce:')) {
			this._onAnnounce(e.textMsg);
			handled = true;
		}

		// Call the original socket onMessage function
		if (!handled && this._socketOnMessage) {
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
		if (!app.map.executeAllowedCommand(action)) {
			// Call the original dispatch function
			this._savedDispatchFunction(action);
		}
	},

	/**
	 * Register our own handlers
	 *
	 * @note There is a sequence, do not change it arbitrarily
	 * @note If you want to register a new handler, you should add it here
	 * @private
	 */
	_registerHandlers: function () {
		this._map.addHandler('Tasks', L.Map.Tasks);
		// register the resource handler
		this._map.addHandler('Icon', L.Map.Icon);
		// register the alternative command handler
		this._map.addHandler('alternativeCommand', L.Map.AlternativeCommand);
		// register the state change handler extension
		this._map.addHandler('stateChangeExtend', L.Map.StateChangeExtend);
		// register the ExternalEdit handler
		this._map.addHandler('ExternalEdit', L.Map.ExternalEdit);
	},

	/**
	 * Preload the data
	 *
	 * 在文件載入之前預先載入及處理和文件類型無關的資料
	 * 若需載入和文件類型有關的資料，需寫在 _postloadData 中
	 *
	 * @private
	 */
	_preloadData: function () {
	},

	/**
	 * Postload the data
	 *
	 * @private
	 */
	_postloadData: function () {

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

		// 載入和文件類型有關的資料
		this._postloadData();
	},

	/**
	 * Handling the WOPI properties message
	 *
	 * @param {*} wopiInfo
	 */
	_onWopiProps: function (wopiInfo) {
		// have to parse the UserExtraInfo
		if (wopiInfo.UserExtraInfo) {
			var userExtraInfoObj = {}; // the object of UserExtraInfo
			if (typeof wopiInfo.UserExtraInfo === 'string') {
				try {
					userExtraInfoObj = JSON.parse(wopiInfo.UserExtraInfo); // parse the UserExtraInfo
				} catch (e) {
					console.error('Failed to parse UserExtraInfo: ', e);
				}
			} else if (typeof wopiInfo.UserExtraInfo === 'object') {
				userExtraInfoObj = wopiInfo.UserExtraInfo; // the UserExtraInfo is already an object
			} else {
				console.error('Invalid UserExtraInfo type: ', typeof wopiInfo.UserExtraInfo);
			}

			this._map['wopi'].UserExtraInfo = userExtraInfoObj;
		}
	},

	/**
	 * Handling the announce message
	 *
	 * @param {string} msg
	 */
	_onAnnounce: function (msg) {
		var data = msg.substring('announce:'.length);
		this._map.hideBusy();
		try {
			var json = JSON.parse(data);
			var alertObj = {};
			if (json.title) {
				alertObj.title = json.title;
			}
			if (json.type) {
				alertObj.icon = json.type;
			}
			if (json.message) {
				alertObj.message = json.message;
			}
			L.dialog.alert(alertObj);
		} catch (e) {
			this._map.fire('warn', {msg: _(msg)});
		}
	},

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

/* -*- js-indent-level: 8 -*- */
/*
 * L.Map.StateChangeExtend is a extension of L.Map.StateChangeHandler
 *
 */

L.Map.mergeOptions({
	stateChangeExtend: true
});

L.Map.StateChangeExtend = L.Handler.extend({

	initialize: function (map) {
		this._map = map;
		this._items = {};
		this._commandCallbacks = {};

		var originalHandler = this._map['stateChangeHandler'];
		// 要移植的 method 列表
		var methods = ['setState', 'getState', 'on', 'off', 'launchAll'];
		// 移植到原本的 stateChangeHandler
		for (var i = 0; i < methods.length; i++) {
			originalHandler[methods[i]] = this[methods[i]].bind(this);
		}
	},

	addHooks: function () {
		this._map.on('commandstatechanged', this._onStateChanged, this);
	},

	removeHooks: function () {
		this._map.off('commandstatechanged', this._onStateChanged, this);
	},

	/**
	 * 設定命令狀態
	 *
	 * @param {string} command - 任何命令
	 * @param {any} state - 任意資料
	 */
	setState: function (command, state) {
		// 如果 state 是布林值的話，轉成字串
		if (typeof state === 'boolean') {
			state = state.toString();
		}

		this._map.fire('commandstatechanged', { commandName: command, state: state });
	},

	/**
	 * 取得指令狀態
	 * @param {string} command - 指令
	 * @returns object
	 */
	getState: function (command) {
		return this._createStateEvent(command, this._items[command]);
	},

	/**
	 * 註冊反應指令狀態的 callback
	 *
	 * @param {string} cmd - 指令名稱
	 * @param {function} func - callback function
	 * @param {object} bind - bind object
	 */
	on: function (cmd, func, bind) {
		// 建立新的 callback function 物件
		var callbackObject = this._createCallback(cmd, func, bind);
		if (callbackObject === null) {
			console.warn('Warning! map.stateChangeHandler.on("command", callback[, bind])');
			return this;
		}

		// 是否已有這個命令的 callback 陣列
		var callbacks = this._commandCallbacks[cmd];
		// 沒有的話新增這個命令的 callbacks 陣列
		if (callbacks === undefined) {
			callbacks = [];
			this._commandCallbacks[cmd] = callbacks;
		}

		// 檢查新的 callback function 是否存在
		var callbackExist = false;
		for (var i = 0; i < callbacks.length; i++) {
			if (callbacks[i].function === func && callbacks[i].bind === bind) {
				callbackExist = true;
				break;
			}
		}

		// 不存在的話就新增
		if (!callbackExist) {
			callbacks.push(callbackObject);
		} else {
			console.debug('command callback:' + cmd + ' exists!');
		}

		// TODO: 註冊完畢，是否需要立刻執行該指令狀態回報？
		// var event = this._createStateEvent(cmd, this._items[cmd]);
		// this._createCallback(event, callbackObject);

		return this;
	},

	/**
	 * 解除指令自訂功能
	 *
	 * @param {string} cmd - 指令名稱
	 * @param {function} func - callback function
	 * @param {object} bind - bind object
	 *
	 * @returns this
	 */
	off: function (cmd, func, bind) {
		// 是否已有這個命令的 callbacks
		var callbacks = this._commandCallbacks[cmd];
		// 沒有就結束
		if (callbacks === undefined)
			return this;

		// 檢查 callback function 是否存在
		for (var i = 0; i < callbacks.length; i++) {
			// 若存在的話，移除它
			if (callbacks[i].function === func && callbacks[i].bind === bind) {
				delete callbacks[i];
				callbacks.splice(i, 1);
				break;
			}
		}

		return this;
	},

	/**
	 * 發送全部註冊過的回報指令
	 */
	launchAll: function () {
		// 把所有已註冊的指令狀態物件重新發送一次
		for (var command in this._commandCallbacks) {
			this._launchCommand(this._createStateEvent(command, this._items[command]));
		}
	},

	/**
	 * 接收指令狀態變更事件
	 *
	 * @param {event} e - 指令狀態物件
	 * e.commandName: 指令名稱
	 * e.state: 指令狀態值
	 */
	_onStateChanged: function (e) {
		var state;
		// 如果是字串的話，試著解析成物件
		if (typeof e.state === 'string') {
			var index = e.state.indexOf('{');
			state = index !== -1 ? JSON.parse(e.state.substring(index)) : e.state;
		} else { // 否則就直接使用
			state = e.state;
		}

		this._items[e.commandName] = state; // 紀錄指令狀態

		var event = this._createStateEvent(e.commandName, state);

		this._launchCommand(event); // 執行已註冊該指令的 callback
	},

	/**
	 * 建立特定指令的 callback object
	 * @param {string} cmd - 需狀態回報的指令名稱
	 * @param {function} func - callback function
	 * @param {object} bind - bind object
	 * @returns object
	 */
	_createCallback: function (cmd, func, bind) {
		// 檢查參數是否正確
		if (typeof cmd !== 'string' || typeof func !== 'function') {
			return null;
		}

		return ({
			function: func,
			bind: bind
		});
	},

	/**
	 * 執行已註冊的命令
	 *
	 * @param {object} e - 指令狀態物件
	 */
	_launchCommand: function (e) {
		var callbacks = this._commandCallbacks[e.commandName];
		// 如果是陣列，且有資料的話
		if (L.Util.isArray(callbacks) && callbacks.length > 0) {
			// 逐一執行
			for (var i = 0; i < callbacks.length; i++) {
				this._launchCallback(e, callbacks[i]);
			}
		}
	},

	/**
	 * 執行單一 callback
	 *
	 * @param {object} e - 指令狀態物件
	 * @param {object} callback - callback object
	 */
	_launchCallback: function (e, callback) {
		try {
			// 如果有 bind 的話，就用 bind 執行
			if (callback.bind !== undefined) {
				callback.function.call(callback.bind, e);
			} else {
				callback.function(e);
			}
		} catch (e) {
			console.warn('State change callback error!', e, callback);
		}
	},

	/**
	 * 重新封裝 state change 物件，增加 disabled(), checked(), hasValue(), value()
	 *
	 * @param {string} command - 指令名稱
	 * @param {any} state - 指令狀態值
	 * @returns object
	 */
	_createStateEvent: function (command, state) {
		return {
			commandName: command, // 紀錄指令名稱
			state: state, // 指令狀態值
			/**
			 * 該指令是否 disabled
			 * @returns true: 是, false: 否
			 */
			disabled: function () {
				return this.state === 'disabled';
			},
			/**
			 * 該指令是否被選取
			 * @returns true: 是, false: 否
			 */
			checked: function () {
				return (this.state === 'true' || this.state === true);
			},
			/**
			 * 真的有值(非 enabled/disabled/true/false/undefined/null)
			 */
			hasValue: function () {
				return (this.state !== 'enabled' && this.state !== 'disabled' &&
					this.state !== 'true' && this.state !== 'false' &&
					this.state !== true && this.state !== false &&
					this.state !== undefined && this.state !== null);
			},
			/**
			 * 該指令的實際狀態值
			 * @returns
			 */
			value: function () {
				return this.state;
			}
		};
	},
});

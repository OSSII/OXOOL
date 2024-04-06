/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.Module.%MODULE_NAME%: %MODULE_SUMMARY%
 *
 * @file module.js
 * @created %GENERATE_DATETIME%
 * @author %MODULE_AUTHOR%
 * @license %MODULE_LICENSE%
 * @description %MODULE_DESCRIPTION%
 */
/* global L */

L.Module.%MODULE_NAME% = L.Module.extend({

	/**
	 * Initialize the module.
	 *
	 * 呼叫前，已設定：
	 *      this.base 爲 L.ModuleManager
	 *      this.details 爲本模組的 details
	 */
	initialize: function () {
	},

	/**
	 * When the module is added to the module manager.
	 *
	 * @param {object} map
	 */
	onAdd: function (map) {
		this._map = map;

		// Register the onmessage event
		// map.on("onmessage", this.onMessage, this);
	},

	/**
	 * When the module is removed from the module manager.
	 *
	 * @param {object} map
	 */
	onRemove: function (map) {

		// Unregister the onmessage event
		// map.off("onmessage", this.onMessage, this);
	},

	/**
	 * Process messages from the server.
	 *
	 * @description If you register map.on('onmessage', this.onMessage, this) in onAdd,
	 *              the message will be sent to this function.
	 *
	 * @param {object} e - the event object
	 * @param {string} e.textMsg - the message text
	 * @param {any} e.img - the img data
	 */
	onMessage: function (e) {
	},

	/**
	 * Process messages from the owning server module.
	 *
	 * @param {string} textMsg
	 */
	onModuleMessage: function (textMsg) {
	},

	/**
	 * Send message to the owning server module.
	 *
	 * @description Send message to the server, the message will be prefixed with the module ID
	 *              so the server can route the message to the correct server module.
	 *              The message will be sent to the server as '<module-id>message'
	 *
	 *              If you wont to send message to the server without prefix, use app.socket.sendMessage()
	 *
	 * @param {string} msg
	 */
	sendMessage: function (msg) {
		// call the base class sendMessage to send message to server
		this.base.sendMessage.call(this, msg);
	},

	/******************************************************************
	 * Add your own functions here
	 ******************************************************************/

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

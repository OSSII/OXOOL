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
/* global L _ */

L.Module.%MODULE_NAME% = L.Module.extend({

	/**
	 * Define menu items. Can be a single item or a submenu.
	 */
	menubar: {
		// 'text' is for text document(writer)
		'text': [
		],
		// 'spreadsheet' is for spreadsheet document(calc)
		'spreadsheet': [

		],
		// 'presentation' is for presentation document(impress)
		'presentation': [

		],
		// 'drawing' is for drawing document(draw)
		'drawing': [
		]
	},

	/**
	 * Define toolbar items.
	 */
	toolbar: {
	},

	/**
	 * Define notebookbar items.
	 */
	notebookbar: {
	},

	/**
	 * Initialize the module.
	 *
	 * When implementing this module, the system has built-in several methods for you:
	 * -------------------------------------------------------------------------------
	 * 1. this.base is L.ModuleManager
	 * 2. this.getDetail() get the detail object of this module
	 */
	initialize: function () {
		// this.onModuleMessage() can receive 'pong' message.
		// The fragment responding to 'pong' is written in handleClientMessage() of Module.cpp
		this.sendMessage('ping');

		// Add your own initialization code here
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

		// Unregister the onmessage event, if registered previously.
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
		// Process the message here
	},

	/**
	 * Process messages from the owning service module.
	 *
	 * @param {string} textMsg
	 */
	onModuleMessage: function (textMsg) {
		// Process the module message here
		// Process the module message here
		if (textMsg.startsWith('pong')) {
			console.debug('I got my service response pong.');
		} else {
			coonsole.debug('other msg: ', textMsg);
		}
	},

	/**
	 * Process commands from user interface.
	 *
	 * when the user clicks the menu item or notebookbar item or toolbar item,
	 * the command will be sent to this function.
	 *
	 * command is the id of the menu item or notebookbar item or toolbar item.
	 * so id should be unique.
	 *
	 * @description The command is sent from the user interface, you can process the command here.
	 * @param {string} command
	 */
	onCommand: function (command) {
		console.debug('Execute command: %s', command);
	},

	/**
	 * Send message to the owning service module.
	 *
	 * @description Send message to the server, the message will be prefixed with the module ID
	 *              so the server can route the message to the you own service module.
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
	 * Add your own methods here
	 ******************************************************************/

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * L.AdminModule.%MODULE_NAME%: %MODULE_SUMMARY%
 *
 * @file admin.js
 * @created %GENERATE_DATETIME%
 * @author %MODULE_AUTHOR%
 * @license %MODULE_LICENSE%
 * @description %MODULE_DESCRIPTION%
 */
/* global L _ */

L.AdminModule.%MODULE_NAME% = L.AdminModule.extend({

	/**
	 * Initialize the module.
	 *
	 * When implementing this module, the system has built-in several methods for you:
	 * -------------------------------------------------------------------------------
	 * 1. this.getDetail() get the detail object of this module
	 * 2. this.sendMessage(textMsg) send a message to own module's handleAdminMessage() function.
	 */
	initialize: function() {
		// Add your own initialization code here

	},

	/**
	 * Process messages from the owning service module.
	 *
	 * @param {string} textMsg - the message text
	 */
	onMessage: function(textMsg) {
		// process the message here

	},

	/**
	 * When this module is to be terminated.
	 */
	terminate: function() {
		// put your termination code here

	},

	/******************************************************************
	 * Add your own methods here
	 ******************************************************************/

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

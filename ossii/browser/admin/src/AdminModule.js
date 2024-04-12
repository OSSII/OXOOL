/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * L.AdminModule
 */
/* global L */

/**
 * AdminModule class
 *
 * @class AdminModule
 * @classdesc AdminModule class
 * @description Base class for admin modules
 * @type {L.Class}
 * @extends {L.Class}
 * @property {function} initialize - Constructor
 * @property {function} onMessage - Handle incoming messages
 * @property {function} sendMessage - Send message to the server
 * @property {function} terminate - Terminate the module
 */
L.AdminModule = L.Class.extend({

    initialize: function () {
        console.debug('AdminModule.initialize:');
    },

    onMessage: function (msg) {
        console.debug('AdminModule.onMessage:', msg);
    },

    sendMessage: function (msg) {
        console.debug('AdminModule.sendMessage:', msg);
    },

    terminate: function () {
        console.debug('AdminModule.terminate: this is base class, should be overridden by derived class.');
    },

});
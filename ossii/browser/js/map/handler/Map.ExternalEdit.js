/* -*- js-indent-level: 8 -*- */
/*
 * Copyright the OxOffice Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Map.ExternalEdit is a class that handles the external editing of the map.
 */

/* global L _ */

L.Map.mergeOptions({
	ExternalEdit: true
});

L.Map.ExternalEdit = L.Handler.extend({
    options: {
    },

    initialize: function (map) {
        this._map = map;
    },

    addHooks: function () {
        this._map.on('commandresult', this._onCommandResult, this);
    },

    removeHooks: function () {
        this._map.off('commandresult', this._onCommandResult, this);
    },

    register: function (fileType, handler, context) {
        var types = []; // 空陣列

        if (typeof fileType === 'string') {
            types.push(fileType.trim().toLowerCase());
        } else if (Array.isArray(fileType)) {
            fileType.forEach(function (type) {
                types.push(type.trim().toLowerCase());
            });
        }

        if (types.length === 0 || typeof handler !== 'function') {
            console.error('Register external editor failed: invalid parameters.',
                'file type must be a string or an array of strings, and handler must be a function.');
            return;
        }

        // Add type and handler to the map.
        types.forEach(function (type) {
            if (!this._fileTypeMap[type]) {
                this._fileTypeMap[type] = [];
            }
            this._fileTypeMap[type].push(handler.bind(context));
        }.bind(this));
    },

    // Private variables there --------------------------------------------

    /**
     * File type map for the external editing.
     * @private
     * @type {object}
     * @property {string} fileType - The file type.
     * @property {array} handlers - The handlers for the file type.
     */
    _fileTypeMap: {},

    // Private methods there --------------------------------------------

    /**
     * Filter .uno:ExternalEdit command result.
     *
     * @param {object} e
     * @param {string} e.commandName - The command name.
     * @param {boolean} e.success - The command result.
     * @param {object} e.result - The result object.
     * @param {string} e.result.type - The file type.
     * @param {string} e.result.data - The base64 encoded content.
     */
    _onCommandResult: function (e) {
        // Only handle the .uno:ExternalEdit command and the success result.
        if (e.commandName === '.uno:ExternalEdit' && e.success) {
            var type = e.result.type; // The file type.
            var content = atob(e.result.data); // The base64 encoded content.
            // Call the handlers.
            var handled = false;
            var handlers = this._fileTypeMap[type]; // The handlers for the file type.
            for (var i = 0; (handlers && i < handlers.length); i++) {
                // If any handler returns true, means the handler has handled the content.
                // So, break the loop.
                if (handlers[i]({type: type, content: content}) === true) {
                    handled = true;
                    break;
                }
            }

            if (!handled) {
                this._map.uiManager.showConfirmModal(
                    'oxool-ExternalEdit', _('Inform'),
                    _('There is no handler that can handle this format:') + ' ' + type,
                    _('OK'), null, true
                );
            }
        }
    },

});

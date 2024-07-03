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
 * L.Map.Tasks is a handler for tasks
 */
/* global L */

L.Map.mergeOptions({
	Tasks: true
});

L.Map.Tasks = L.Handler.extend({

    /**
	 * Initialize
	 * @param {L.Map} map - map object
	 */
	initialize: function (map) {
		this._map = map;
    },

    /**
	 * On add hooks
	 */
	addHooks: function () {

	},

	/**
	 * On remove hooks
	 */
	removeHooks: function () {

	},

    /**
     * Register preload
     *
     * give a name to the preload, and check if all preloads are complete
     *
     * @param {object}
     * {
     *     name: string, (required, a unique name for this preload)
     *      url: string, (required)
     *   method: string, (optional, default is 'GET'. other options: 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD')
     *     type: string, (optional, default is auto detect. other options: 'json', 'text', 'html', 'xml', 'script', 'blob')
     *  success: function, (optional, return data)
     *    error: function (optional, return error. default is console.error)
     * }
     */
    registerPreload: function (options) {
        this._preloadCondition[options.name] = false;

        fetch(options.url, {
            method: options.method,
        }).then(function(response) {
                if (response.ok) {
                    var contentType = response.headers.get('content-type');
                    // auto detect type
                    if (options.type === 'json' || contentType.includes('application/json')) {
                        return response.json();
                    } else if (options.type === 'text' || contentType.includes('text/plain')) {
                        return response.text();
                    } else if (options.type === 'html' || contentType.includes('text/html')) {
                        return response.text().then(function(text) {
                            var parser = new DOMParser();
                            return parser.parseFromString(text, 'text/html');
                        });
                    } else if (options.type === 'xml' || contentType.includes('application/xml')) {
                        return response.text().then(function(text) {
                            var parser = new DOMParser();
                            return parser.parseFromString(text, 'application/xml');
                        });
                    } else if (options.type === 'script' || contentType.includes('application/javascript')) {
                        return response.text();
                    } else { // fallback to blob
                        return response.blob();
                    }
                } else {
                    throw new Error('response not ok: ' + response.status + ' ' + response.statusText);
                }
            })
            .then(function(data) {
                if (options.success && typeof options.success === 'function') {
                    options.success(data);
                }
                this._preloadCondition[options.name] = true; // mark as complete
            }.bind(this))
            .catch(function(error) {
                if (options.error && typeof options.error === 'function') {
                    options.error(error);
                }
                this._preloadCondition[options.name] = true; // mark as complete
            }.bind(this));
    },

    /**
     * Check if all preloads are complete
     */
    isAllPreloadComplete: function () {
        for (var key in this._preloadCondition) {
            if (!this._preloadCondition[key]) {
                return false;
            }
        }
        return true;
    },

    /**
     * Wait for all preloads to complete
     * then trigger callback function
     *
     * @param {function} callbackFn - callback function
     * @param {number} timeOut - timeout in milliseconds
     */
    whanPreloadComplate: function (callbackFn, timeOut) {
        timeOut = timeOut || 2000; // default 2 seconds(2000ms)
        var interval = setInterval(function() {
            if (this.isAllPreloadComplete()) {
                clearInterval(interval);
                callbackFn(this._preloadCondition);
            } else {
                timeOut -= 10;
                if (timeOut <= 0) {
                    clearInterval(interval);
                    callbackFn(this._preloadCondition);
                }
            }
        }.bind(this), 1);
    },

    // Private variables here -------------------------
    _preloadCondition: {},

    // Private methods here -------------------------


});

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
/*
 * L.Control.NotebookbarEnhancedBuilder - builder of native HTML widgets for tabbed menu
 */

/* global L $ */

L.Control.NotebookbarEnhancedBuilder = L.Control.NotebookbarBuilder.extend({
	_enhanceHandlers: function () {
		this._controlHandlers['vseparator'] = this._vSeparatorHandler;

		this._toolitemHandlers['downloadas'] = this._downloadAsControl;
	},

	/**
	 * Vertical separator handler
	 *
	 * @param {*} parentContainer
	 * @param {*} data
	 * @param {*} builder
	 */
	_vSeparatorHandler: function (parentContainer/* , data, builder */) {
		L.DomUtil.create('div', 'notebookbar vseparator', parentContainer);
		return false;
	},

	/**
	 * Download as control handler
	 *
	 * @param {*} parentContainer
	 * @param {*} data
	 * @param {*} builder
	 */
	_downloadAsControl: function(parentContainer, data, builder) {
		var options = {hasDropdownArrow: true};
		var control = builder._unoToolButton(parentContainer, data, builder, options);
		var selectorId = data.id;

		$(control.container).unbind('click.toolbutton');
		var formats = builder.map.getExportFormats();
		var menuItems = {};
		formats.forEach(function(item) {
			var id = 'downloadas-' + item.format;
			menuItems[id] = {
				//icon: 'res:' + id,
				name: item.label
			};
		});

		L.installContextMenu({
			selector: '#' + selectorId,
			className: 'oxool-font',
			trigger: 'left',
			// Display the menu at the bottom of the button
			position: function(opt/* , x, y */) {
				opt.$menu.position({
					my: 'left top',
					at: 'left bottom',
					of: opt.$trigger
				});
			},
			items: menuItems,
			callback: function(key/* , options */) {
				builder.map.executeAllowedCommand(key);
			}
		});
		builder._preventDocumentLosingFocusOnClick(control.container);
	},
});

// Override the default notebookbar builder
L.control.notebookbarBuilder = function (options) {
	var builder = new L.Control.NotebookbarEnhancedBuilder(options);
	builder._setup(options);
	builder._overrideHandlers();
	builder._enhanceHandlers();
	builder._customizeOptions();
	options.map.on('commandstatechanged', builder.onCommandStateChanged, builder);
	return builder;
};

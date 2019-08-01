/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.Dialogs
 */
/* global $ */

L.Control.Dialogs = L.Control.extend({
	options: {
	},

	onAdd: function (map) {
		map.on('executeDialog', this._onExecuteDialog, this);
	},

	onRemove: function (/*map*/) {
		// do nothing.
	},

	/* Private methods */
	_onExecuteDialog: function (e) {
		window.map = this._map;
		var dialogName = e.dialog + '.js'
		var dialogURL = 'uiconfig/dialogs/' + dialogName;
		$.getScript(dialogURL);
	}
});

L.control.dialogs = function (options) {
	return new L.Control.Dialogs(options);
};

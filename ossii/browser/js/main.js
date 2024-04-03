/* -*- js-indent-level: 8; fill-column: 100 -*- */
/* global L app */

(function() {
	'use strict';
	// Inititalize OxOOL
	app.oxool = new L.OxOOL({
		map: app.map,
	});

	// register the dialogs control
	// TODO: 將來應該要移到 OxOOL 中
	app.map.addControl(L.control.dialogs());

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */
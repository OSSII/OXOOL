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
/* global errorMessages getParameterByName accessToken accessTokenTTL accessHeader createOnlineModule */
/* global app L host idleTimeoutSecs outOfFocusTimeoutSecs _ */
/*eslint indent: [error, "tab", { "outerIIFEBody": 0 }]*/
(function (global) {


var wopiParams = {};
var wopiSrc = getParameterByName('WOPISrc');

if (wopiSrc !== '' && accessToken !== '') {
	wopiParams = { 'access_token': accessToken, 'access_token_ttl': accessTokenTTL };
}
else if (wopiSrc !== '' && accessHeader !== '') {
	wopiParams = { 'access_header': accessHeader };
}

if (window.ThisIsTheEmscriptenApp)
	// Temporary hack
	var filePath = 'file:///sample.docx';
else
	var filePath = getParameterByName('file_path');

app.file.permission = getParameterByName('permission') || 'edit';

var timestamp = getParameterByName('timestamp');
var target = getParameterByName('target') || '';
// Should the document go inactive or not
var alwaysActive = getParameterByName('alwaysactive');
// Oxool Debug mode
var debugMode = getParameterByName('debug');

var docURL, docParams;
var isWopi = false;
if (wopiSrc != '') {
	docURL = decodeURIComponent(wopiSrc);
	docParams = wopiParams;
	isWopi = true;
} else {
	docURL = filePath;
	docParams = {};
}

var notWopiButIframe = getParameterByName('NotWOPIButIframe') != '';
var map = L.map('map', {
	server: host,
	doc: docURL,
	docParams: docParams,
	timestamp: timestamp,
	docTarget: target,
	documentContainer: 'document-container',
	debug: debugMode,
	// the wopi and wopiSrc properties are in sync: false/true : empty/non-empty
	wopi: isWopi,
	wopiSrc: wopiSrc,
	notWopiButIframe: notWopiButIframe,
	alwaysActive: alwaysActive,
	idleTimeoutSecs: idleTimeoutSecs,  // Dim when user is idle.
	outOfFocusTimeoutSecs: outOfFocusTimeoutSecs, // Dim after switching tabs.
});

L.Map.THIS = map;
app.map = map;
app.idleHandler.map = map;

function waitForBrandingJsLoaded(callback) {
	if (window.brandingjsLoaded === true) {
		callback();
	} else {
		setTimeout(function() { waitForBrandingJsLoaded(callback); }, 10);
	}
}

waitForBrandingJsLoaded(function() {
	////// Controls /////

	map.uiManager = L.control.uiManager();
	map.addControl(map.uiManager);

	map.uiManager.initializeBasicUI();

	if (wopiSrc === '' && filePath === '' && !window.ThisIsAMobileApp) {
		map.uiManager.showInfoModal('wrong-wopi-src-modal', '', errorMessages.wrongwopisrc, '', _('OK'), null, false);
	}
	if (host === '' && !window.ThisIsAMobileApp) {
		map.uiManager.showInfoModal('empty-host-url-modal', '', errorMessages.emptyhosturl, '', _('OK'), null, false);
	}

	if (L.Map.versionBar)
		map.addControl(L.Map.versionBar);

	if (window.ThisIsTheEmscriptenApp) {
		var Module = {
			onRuntimeInitialized: function() {
				map.loadDocument(global.socket);
			},
			print: function (text) {
				if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
				console.warn(text);
			},
			printErr: function (text) {
				if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
				console.error(text);
			},
			arguments_: [docURL],
			arguments: [docURL],
		};
		createOnlineModule(Module);
		app.HandleOXOOLMessage = Module['_handle_oxool_message'];
		app.AllocateUTF8 = Module['allocateUTF8'];
	} else {
		map.loadDocument(global.socket);
	}

	window.addEventListener('beforeunload', function () {
		if (map && app.socket) {
			if (app.socket.setUnloading)
				app.socket.setUnloading();
			app.socket.close();
		}
	});

	window.bundlejsLoaded = true;


	////// Unsupported Browser Warning /////

	if (L.Browser.isInternetExplorer) {
		map.uiManager.showInfoModal('browser-not-supported-modal', '', _('Warning! The browser you are using is not supported.'), '', _('OK'), null, false);
	}
});

}(window));

/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.Dialogs
 */
/* global $ _ w2popup w2alert */

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
		if (e.dialog === 'saveAs') {
			this._saveAs();
			return;
		}
		window.map = this._map;
		var dialogName = e.dialog + '.js'
		var dialogURL = 'uiconfig/dialogs/' + dialogName;
		$.getScript(dialogURL);
	},

	// 暫時把 saveAS 放在內部，因為打包起來後， $.getScript() 會失效
	_saveAs: function () {
		var map = this._map;
		var body = 
			'<div style="padding:10px; font-size:16px;">' +
				'<div id="l10nlabel"></div>' +
				'<br>' +
				'<div class="w2ui-field w2ui-span4">' +
					'<label id="l10nNewfilename"></label>' +
					'<div>' +
						'<input id="newfile_name" class="w2ui-input" type="text" autofocus>' +
					'</div>' +
				'</div>' +
			'</div>';
			
		var buttons = '<button class="w2ui-btn" onclick="w2popup.close()">' + _('Cancel') + '</button>' +
				'<button class="w2ui-btn w2ui-btn-blue" id="okBtn">' + _('OK') + '</button>';
			
		var l10n = {
			l10nlabel: _('Please enter a new filename.'),
			l10nNewfilename: _('File name:'), // 新檔名
		};
		
		w2popup.open({
			title: _('Save As'),
			body: body,
			buttons: buttons,
			width: 350,
			height: 200,
		});
		
		for (var key in l10n) { 
			$('#' + key).text(l10n[key]);
		}
		
		$('#okBtn').click(function () {
			var val = $('#newfile_name').val();
			if (val.length) {
				map.saveAs(val);
				w2popup.close();
			} else {
				w2alert(_('Unspecified filename'));
			}
		});
	}
});

L.control.dialogs = function (options) {
	return new L.Control.Dialogs(options);
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.OXSaveAs
 * OXOOL 自帶的 SaveAs 對話盒
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ */
L.dialog.OXSaveAs = {
	_dialog: undefined,

	init: function(map) {
		this._map = map;
	},

	run: function(/*paramater*/) {
		var map = this._map;
		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		this._dialog.innerHTML = '<p>' +
		'<b>' + _('File name:') + '<b><br><input type="text" id="newFileName" style="width:100%" autofocus>' +
		'</p>';

		$(this._dialog).dialog({
			title: _('Please enter a new filename.'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			//draggable: true,
			closeOnEscape: true,
			close: function(/*e, ui*/) {
				// 對話框關閉就徹底移除，下次要重新建立
				$(this).dialog('destroy').remove();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var val = $('#newFileName').val();
						if (val.length) {
							map.saveAs(val);
						}
						$(this).dialog('close');
					}
				},
				{
					text: _('Cancel'),
					click: function() {
						$(this).dialog('close');
					}
				}
			]
		});
	},
}

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.OXSaveAs
 * OXOOL 自帶的 SaveAs 對話盒
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ */
L.dialog.OXSaveAs = {
	_dialog: null,

	initialize: function() {

	},

	run: function(/*parameter*/) {
		var that = this;

		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		this._dialog.innerHTML = '<p>' +
		'<b>' + _('File name:') + '<b><br><input type="text" id="OxSaveAsFileName" style="width:100%">' +
		'</p>';

		$(this._dialog).dialog({
			title: _('Please enter a new filename.'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			draggable: true,
			closeOnEscape: true,
			close: function(/*e, ui*/) {
				// 對話框關閉就徹底移除，下次要重新建立
				$(this).dialog('destroy').remove();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var filename = $('#OxSaveAsFileName').val().trim();
						if (filename.length) {
							that._map.saveAs(filename);
							$(this).dialog('close');
						} else {
							L.dialog.alert({
								icon: 'error',
								message: _('Please enter a new filename.')
							});
						}
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

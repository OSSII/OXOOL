/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.dlgSecurePrint
 *
 *
 * Author:
 */
/* global $ _ _UNO */
L.dialog.dlgSecurePrint = {
	_dialog: undefined,

	init: function(map) {
		this._map = map;
	},

	run: function(/*parameter*/) {
		var map = this._map;
		var docLayer = map._docLayer;
		var docType = map.getDocType()
		var fileName = this._map['wopi'].BaseFileName
		var maskItems = "";

		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		this._dialog.innerHTML = '<input name="maskEmail" id="maskEmail" class="w2ui-input-chk-hfdlg" type="checkbox"/>'+ _('maskEmail')+'<br/>'+
									'<input name="maskAddress" id="maskAddress" class="w2ui-input-chk-hfdlg" type="checkbox"/>'+ _('maskAddress')+'<br/>'+
									'<input name="maskPhone" id="maskPhone" class="w2ui-input-chk-hfdlg" type="checkbox"/>'+ _('maskPhone')+'<br/>'+
									_('extraRule')+'<br/>'+
									'<input name="extraRule" id="extraRule" class="w2ui-input-hfdlg" type="text" placeholder="'+_('input ex:AAA;BBB')+'"/><br/>';

		$(this._dialog).dialog({
			title: _UNO('.uno:SecurePrint', 'text', true),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			closeOnEscape: true,
			close: function(/*e, ui*/) {
				// 對話框關閉就徹底移除，下次要重新建立
				$(this).dialog('destroy').remove();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
							if ($('#maskEmail').is(':checked')) {
								maskItems = maskItems + 'maskEmail=1' + ',';
							} else {
								maskItems = maskItems + 'maskEmail=0' + ',';
							}
							if ($('#maskAddress').is(':checked')) {
								maskItems = maskItems + 'maskAddress=1' + ',';
							} else {
								maskItems = maskItems + 'maskAddress=0' + ',';
							}
							if ($('#maskPhone').is(':checked')) {
								maskItems = maskItems + 'maskPhone=1' + ',';
							} else {
								maskItems = maskItems + 'maskPhone=0' + ',';
							}
							if ($('#extraRule').val()) {
								maskItems = maskItems + 'extraRule=' + $('#extraRule').val();
							} else {
								maskItems = maskItems + 'extraRule=';
							}
						if (docType === 'text') {
							map.secureprint(fileName, maskItems);
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
};

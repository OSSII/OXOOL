/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.ProtectTable
 * Calc : 保護工作表
 *
 * Author: Sharon <sharon.wu@ossii.com.tw>
 */
/* global $ _ _UNO vex */
L.dialog.ProtectTable = {
	_dialog: undefined,

	init: function(map) {
		this._map = map;
	},

	run: function(/*parameter*/) {
		var that = this;
		this._dialog = L.DomUtil.createWithId('div', '', document.body);

		this._dialog.innerHTML = '<fieldset>' +
		'<legend><b>' + _('Password') + ' :</b></legend>' +
		'<div>' + _('Password') + ' : ' + '<input type="password" id="password" style="margin-top:12px;padding:5px 0px 5px;"></div>' +
		'<div>' + _('Confirm') + ' : ' + '<input type="password" id="confirm" style="margin-top:12px;padding:5px 0px 5px;"></div>' +
		'</fieldset>';

		this._dialog.innerHTML += '<fieldset style="margin-top:12px;">' +
		'<legend><b>' + _('Allow all users of this sheet to') + ':</b></legend>' +
		'<div><label><input type="checkbox" name="allowActions" value="0" checked> ' + _('Select Protected Cells') + '</label></div>' +
		'<div><label><input type="checkbox" name="allowActions" value="1" checked> ' + _('Select Unprotected Cells') + '</label></div>' +
		'<div><label><input type="checkbox" name="allowActions" value="2"> ' + _('Insert Column') + '</label></div>' +
		'<div><label><input type="checkbox" name="allowActions" value="3"> ' + _('Insert Row') + '</label></div>' +
		'<div><label><input type="checkbox" name="allowActions" value="4"> ' + _('Delete Column') + '</label></div>' +
		'<div><label><input type="checkbox" name="allowActions" value="5"> ' + _('Delete Row') + '</label></div>' +
		'</fieldset>';

		$(this._dialog).dialog({
			title: _UNO('.uno:Protect', 'spreadsheet', true),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 320,
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
					class: 'buttonOk',
					click: function() {
						that._okCommand();
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

		// 動態檢查 input 值
		$(document).on('input', 'input[type=password]', that._checkPassword);
	},

	// 按下 確認 按鈕
	_okCommand: function() {
		var map = this._map;
		var optString = '';
		$('input[name=allowActions]').each(function(){
			var isChecked = $(this).prop('checked')
			optString += isChecked ? '1' : '0';
		})
		console.debug('Options value = ' + optString);

		var args = {
			Protect: {
				type: 'boolean',
				value: true
			},
			PassWord: {
				type: 'string',
				value: $('#password').val()
			},
			Options: {
				type: 'string',
				value: optString
			}
		};
		map.sendUnoCommand('.uno:OxProtect', args);
	},

	// 檢查密碼欄位
	_checkPassword: function() {
		var pwd = $('#password').val();
		var cfm = $('#confirm').val();
		var emptyInputs = pwd === '' && cfm === '';
		if (emptyInputs || pwd === cfm) {
			$('.buttonOk').attr('disabled', false).removeClass('ui-state-disabled');
		} else {
			$('.buttonOk').attr('disabled', true).addClass( 'ui-state-disabled');
		}
	}
};

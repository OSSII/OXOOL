/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.TraceChangeMode
 * 啟用或關閉 Calc 追蹤修訂功能
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ */
L.dialog.TraceChangeMode = {
	_dialog: undefined,

	init: function(map) {
		this._map = map;
	},

	run: function(/*parameter*/) {
		var map = this._map;
		var stateHandler = map['stateChangeHandler'];
		var state = stateHandler.getItemProperty('.uno:TraceChangeMode');

		// 沒有找到 .uno: TraceChangeMode 的狀態資料
		if (state === undefined) {
			console.debug('No state found for .uno:TraceChangeMode');
			return;
		}

		var args = {
			TraceChangeMode: {
				type: 'boolean',
				value: !(state.checked === true)
			}
		};

		if (state.checked !== true) {
			map.sendUnoCommand('.uno:TraceChangeMode', args);
			return;
		}


		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		this._dialog.innerHTML = '<p>' + _('Stop tracking changes, will lose information about the changes.') + '</p>';

		$(this._dialog).dialog({
			title: _('Warning'),
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
						map.sendUnoCommand('.uno:TraceChangeMode', args);
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

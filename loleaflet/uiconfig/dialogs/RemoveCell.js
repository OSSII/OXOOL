/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.RemoveCell
 * Calc 刪除儲存格
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.RemoveCell = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),

	// init 只會在載入的第一次執行
	init: function(map) {
		var that = this;
		this._map = map;
		this._id = '#' + this.$dialog.attr('id');
		this.$dialog.html('<div><b>' + _('Selection') + ' :</b><div><br>' +
			'<div><label><input type="radio" name="DeleteCellGroup" value="U" checked> ' + _('Shift cells up') + '</label></div>' +
			'<div><label><input type="radio" name="DeleteCellGroup" value="L"> ' + _('Shift cells left') + '</label></div>' +
			'<div><label><input type="radio" name="DeleteCellGroup" value="R"> ' + _('Delete entire row(s)') + '</label></div>' +
			'<div><label><input type="radio" name="DeleteCellGroup" value="C"> ' + _('Delete entire column(s)') + '</label></div>'
		);

		this.$dialog.dialog({
			title: _UNO('.uno:DeleteCell', map.getDocType(), true),
			closeText: _('Close'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function(/*event, ui*/) {
				// 預設選取第一個 button
				$(this).siblings('.ui-dialog-buttonpane').find('button:eq(0)').focus();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var args = {
							Flags: {
								type: 'string',
								value: $(that._id + ' input[name="DeleteCellGroup"]:checked').val()
							}
						};
						map.sendUnoCommand('.uno:DeleteCell', args);
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

	// 每次都會從這裡開始
	run: function(/*parameter*/) {
		this.$dialog.dialog('open');
	},
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.ColumnWidth
 * Calc 設定欄位寬度
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.ColumnWidth = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),

	// init 只會在載入的第一次執行
	init: function(map) {
		//var that = this;
		this._map = map;
		this._id = '#' + this.$dialog.attr('id');
		this.$dialog.html(
		'<p><div><label for="CalcColumnWidth">' + _('Width') + ' : </label>' +
		'<input id="CalcColumnWidth" name="CalcColumnWidth"> ' +
		_('cm') + '</div></p>'
		);

		$('#CalcColumnWidth').spinner({
			step: 0.01,
			numberFormat: 'n'
		}).width(70);

		this.$dialog.dialog({
			title: _UNO('.uno:ColumnWidth', 'spreadsheet'),
			closeText: _('Close'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function(/*event, ui*/) {
				// 讀取所在欄位的寬度
				var size = map._docLayer._cellCursorTwips.getSize();
				var width = Number((size.x / 567).toFixed(2));
				$('#CalcColumnWidth').spinner('value', width);
				// 預設選取第一個 button
				$(this).siblings('.ui-dialog-buttonpane').find('button:eq(0)').focus();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var widthCM = parseFloat($('#CalcColumnWidth').val());
						if (!isNaN(widthCM)) {
							var width = parseInt(widthCM * 1000);
							var args = {
								ColumnWidth: {
									type: 'unsigned short',
									value: Math.max(width, 0)
								}
							};
							map.sendUnoCommand('.uno:ColumnWidth', args);
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

	// 每次都會從這裡開始
	run: function(/*parameter*/) {
		this.$dialog.dialog('open');
	},
};

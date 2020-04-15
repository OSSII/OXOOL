/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.RowHeight
 * Calc 設定列高
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.RowHeight = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),

	// init 只會在載入的第一次執行
	init: function(map) {
		//var that = this;
		this._map = map;
		this._id = '#' + this.$dialog.attr('id');
		this.$dialog.html(
		'<p style="text-align=center;"><label for="CalcRowHeight">' + _('Height') + ' : </label>' +
		'<input id="CalcRowHeight" name="CalcRowHeight"> ' +
		_('cm') + '</p>'
		);

		$('#CalcRowHeight').spinner({
			step: 0.01,
			numberFormat: 'n'
		}).width(70);

		this.$dialog.dialog({
			title: _UNO('.uno:RowHeight', 'spreadsheet'),
			closeText: _('Close'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function(/*event, ui*/) {
				// 讀取所在欄位的高度
				var size = map._docLayer._cellCursorTwips.getSize();
				var width = Number((size.y / 567).toFixed(2));
				$('#CalcRowHeight').spinner('value', width);
				// 預設選取第一個 button
				$(this).siblings('.ui-dialog-buttonpane').find('button:eq(0)').focus();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var heightCM = parseFloat($('#CalcRowHeight').val());
						if (!isNaN(heightCM)) {
							var height = parseInt(heightCM * 1000);
							var args = {
								RowHeight: {
									type: 'unsigned short',
									value: Math.max(height, 0)
								}
							};
							map.sendUnoCommand('.uno:RowHeight', args);
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

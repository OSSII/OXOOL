/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.SetTabBgColor
 * Calc 設定標籤色彩
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.SetTabBgColor = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),

	// init 只會在載入的第一次執行
	initialize: function() {
		var that = this;
		var map = this._map;
		this._colorId = 'SetTabBgColor_' + this.$dialog.attr('id');
		this.$dialog.html(
			'<input id="' + this._colorId + '" value="">'
		);

		this.$dialog.dialog({
			title: _UNO('.uno:TabBgColor', 'spreadsheet'),
			closeText: _('Close'),
			position: {my: 'center', at: 'center', of: window},
			width: 'auto',
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
						var color = $('#' + that._colorId).val();
						var bgColor = -1; // 沒有顏色
						if (color !== '#ffffff') {
							bgColor = parseInt('0x' + color.substring(1)); // 轉成十進位數字
						}
						var args = {
							TabBgColor: {
								type: 'long',
								value: bgColor
							}
						};
						map.sendUnoCommand('.uno:SetTabBgColor', args); // 變更顏色
						map.getDocumentStatus(); // 取回最新的文件狀態
						$(this).dialog('close');
					}
				},
				{
					text: _('Cancel'),
					click: function() {
						$(this).dialog('close');
					}
				},
				{
					text: _('Default'),
					click: function(/*e*/) {
						map.sendUnoCommand('.uno:SetTabBgColor?TabBgColor:long=-1'); // 變更顏色
						map.getDocumentStatus(); // 取回最新的文件狀態
						$(this).dialog('close');
					}
				}
			]
		});
	},

	// 每次都會從這裡開始
	run: function(/*parameters*/) {
		var pInfo = this._map.getPartProperty(); // 目前選取工作表的屬性資料
		if (pInfo !== undefined) {
			var bgColor = '#ffffff';
			if (pInfo.bgColor !== '-1') {
				bgColor = parseInt(pInfo.bgColor).toString(16);
				bgColor = '#' + '0'.repeat(6 - bgColor.length) + bgColor; // 不足六碼前面補0
			}
			$('#' + this._colorId).val(bgColor);
			$('#' + this._colorId).spectrum({
				type: 'flat',
				preferredFormat: 'hex',
				showInitial: true,
				showAlpha: false,
				showButtons: false,
				allowEmpty: false,
				showPaletteOnly: (window.mode.isMobile() ? true : false)
			});
			this.$dialog.dialog('open');
		}
	},
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.PdfWatermarkText
 * 設定列印或下載為 pdf 的浮水印文字
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ */
L.dialog.PdfWatermarkText = {
	_dialog: L.DomUtil.create('div', '', document.body),

	l10n: [
		'Watermark text', // 浮水印文字
		'If no needed, please leave it blank.', // 如果不需要，請保持空白
		'Direction', // 方向
	],


	// init 只會在載入的第一次執行
	initialize: function() {
		var that = this;
		this._id = $(this._dialog).uniqueId().attr('id');
		this._watermarkTextId = this._id + '_watermarkText';
		this._dialog.innerHTML =
			'<span _="Watermark text"></span><input type=text id="' + this._watermarkTextId + '" /><br>' +
			'<strong><small _="If no needed, please leave it blank."></small></strong>' +
			'<fieldset style="margin-top:8px;"><legend _="Direction"></legend>' +
			'<label style="margin-right:24px;"><input type="radio" name="watermarkAngle" value="45" checked> <span _="Diagonal"></span></label>' +
			'<label><input type="radio" name="watermarkAngle" value="0"> <span _="Horizontal"></span></label>' +
			'</fieldset>'

		this._map.translationElement(this._dialog);

		$(this._dialog).dialog({
			title: _('Add watermark'),
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
						// 文字
						var text = document.getElementById(that._watermarkTextId).value.trim();
						// 角度
						var angle = document.querySelector('input[name="watermarkAngle"]:checked').value;
						var watermark = {
							text: text,
							angle: angle,
							familyname: 'Carlito',
							color: '#000000',
							opacity: 0.2
						};
						var jsonStr = JSON.stringify(watermark);
						var watermarkText = (text !== '') ? ',Watermark=' + jsonStr + 'WATERMARKEND' : '';
						that._map.showBusy(_('Downloading...'), false);
						that._map._socket.sendMessage('downloadas ' +
							'name=' + encodeURIComponent(that._args.name) + ' ' +
							'id=' + that._args.id + ' ' +
							'format=pdf ' +
							'options=' + that._args.options + watermarkText);
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
	run: function(param) {
		this._args = param.args;
		if (this._args === undefined) {
			return;
		}
		this._map.hideBusy();
		$(this._dialog).dialog('open');
	},
};

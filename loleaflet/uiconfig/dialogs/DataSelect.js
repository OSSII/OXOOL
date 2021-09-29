/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.DataSelect
 * Calc 儲存格選擇清單
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ */
L.dialog.DataSelect = {
	_dialog: null,

	initialize: function() {
	},

	run: function(args) {
		console.debug(args);
		var that = this;

		// 沒有標題欄
		var dialogClass = 'lokdialog_container lokdialog_notitle';
		// 建立視窗
		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		L.DomUtil.setStyle(this._dialog, 'fontSize', '12px');
		L.DomUtil.setStyle(this._dialog, 'padding', '0px');
		L.DomUtil.setStyle(this._dialog, 'margin', '0px');
		// 文字由右至左
		if (args.isRTL === 'true') {
			L.DomUtil.setStyle(this._dialog, 'direction', 'rtl');
		}
		// 產生唯一 ID
		this._uniqueId = $(this._dialog).uniqueId().attr('id');
		var selectId = this._uniqueId + 'select';

		// 縮放比
		var zoomScale = 1.0 / this._map.getZoomScale(this._map.getZoom(), 10);
		var topPx = parseInt(args.top) / zoomScale;
		var leftPx = parseInt(args.left) / zoomScale;
		var widthPx = parseInt(args.width) / zoomScale;
		var heightPx = parseInt(args.height) / zoomScale;

		// 下拉選項視窗項目最多10項，超過出現捲動視窗
		var size = args.list.length > 10 ? 10 : args.list.length;
		// 製作下拉列表
		var select = '<select id="' + selectId + '" size="' + size
				   + '" style="min-width:' + widthPx
				   + 'px;border:0px;outline:1px #808080;overflow-y:auto;overflow-x:hidden;padding:3px;">';

		args.list.forEach(function(data) {
			var value = data.item;
			select += '<option value="' + value + '"' + (data.checked === 'true' ? ' selected' : '') + '>' + value + '</option>';
		});
		select += '</select>';
		this._dialog.innerHTML = select;

		// 轉換為頁面絕對座標
		var origin = this._map.getPixelOrigin();
		var panePos = this._map._getMapPanePos();
		var left = leftPx + panePos.x - origin.x;
		var top = topPx + panePos.y - origin.y;
		// 清單位置預設在儲存格下方
		var position = {
			my: 'left top',
			at: 'left+' + left + ' top+' + (top + heightPx),
			of: '#document-container',
			collision: 'fit'
		};
		// 編輯區 offset
		var docContainerOffset = $('#document-container').offset();
		// 清單高度
		var dialogHeight = $('#' + this._uniqueId).height();
		// 如果下方空間不足，改成儲存格上方
		if ((docContainerOffset.top  + top + heightPx + dialogHeight) > $(document).height()) {
			position.my = 'left bottom';
			position.at = 'left+' + left + ' top+' + top;
		}

		// 選項有變更，把選取的資料填入儲存格後，關閉選單
		$('#' + selectId).on('change', function() {
			var command = {
				'StringName': {
					type: 'string',
					value: this.value
				},
				'DontCommit': {
					type: 'boolean',
					value: false
				}
			};
			that._map.sendUnoCommand('.uno:EnterString ', command);
			that._closeDialog();
		});

		$(this._dialog).dialog({
			dialogClass: dialogClass,
			position: position,
			width: 'auto',
			minWidth: 'none',
			maxWidth: 'none',
			height: 'auto',
			minHeight: 'none',
			maxHeight: 'none',
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			draggable: false,
			closeOnEscape: true,
			open: function(/*e, ui*/) {
				// 點擊視窗外位置就關掉視窗
				$('.ui-widget-overlay').click(function () {
					that._closeDialog();
				});
			},
			close: function(/*e, ui*/) {
				that._closeDialog();
			},
		});
	},

	/**
	 * 移除 Dialog
	 */
	_closeDialog: function() {
		if (this._dialog)
		{
			$(this._dialog).dialog('destroy').remove();
			this._dialog = null;
		}
	}
}

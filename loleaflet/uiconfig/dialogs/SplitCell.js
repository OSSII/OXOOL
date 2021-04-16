/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.SplitCell
 * Writer 分割儲存格
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global $ _ _UNO */
L.dialog.SplitCell = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),

	// init 只會在載入的第一次執行
	init: function(map) {
		this._map = map;
		this._id = this.$dialog.attr('id');
		var that = this;
		var nocId = 'NumberOfColumns' + this._id;
		var norId = 'NumberOfRows' + this._id;
		var columnsId = 'columns' + this._id;
		var rowsId = 'rows' + this._id;
		this.$dialog.html(
		'<p><div>' +
		'<input type="radio" id="' + nocId + '" name="SwSplitCell" value="columns">' +
		'<label for="' + nocId + '">' + _('Columns') + ' : <label>' +
		'<input id="' + columnsId + '" value="2"> ' +
		'</div></p>' +
		'<p><div>' +
		'<input type="radio" id="' + norId + '" name="SwSplitCell" value="rows">' +
		'<label for="' + norId + '">' + _('Rows') + ' : <label>' +
		'<input id="' + rowsId + '" value="2"> ' +
		'</div></p>'
		);

		this._columnSpinner = $('#' + columnsId).spinner({
			step: 1,
			min: 2,
			max: 63,
			numberFormat: 'n'
		}).width(50);

		this._rowSpinner = $('#' + rowsId).spinner({
			step: 1,
			min: 2,
			max: 18,
			numberFormat: 'n'
		}).width(50);

		$('input[type=radio][name=SwSplitCell]').change(function() {
			that._setSpinnerOnOff();
		});

		this.$dialog.dialog({
			title: _UNO('.uno:SplitCell', 'text'),
			closeText: _('Close'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function(/*event, ui*/) {
				// 預設選取分割欄
				$('#' + nocId).prop('checked', true);
				that._setSpinnerOnOff();
				// 預設分割數量
				$('#' + columnsId).val(2);
				$('#' + rowsId).val(2);
				// 預設選取第一個 button
				$(this).siblings('.ui-dialog-buttonpane').find('button:eq(0)').focus();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var args = {
							Horizontal: {
								type: 'boolean',
								value: false // false: 分割欄, true: 分割列
							},
							Proportional: {
								type: 'boolean',
								value: false
							},
							Amount: {
								type: 'unsigned short',
								value: 1
							}
						};
						// 分割欄還是列？
						var splitType = that._getType();
						// 分割欄
						if (splitType === 'columns') {
							args.Horizontal.value = false;
							args.Amount.value = $('#' + columnsId).val();
						} else { // 分割列
							args.Horizontal.value = true;
							args.Amount.value = $('#' + rowsId).val();
						}
						map.sendUnoCommand('.uno:SplitCell', args);
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

	// 取得目前選取的分割類別
	_getType: function() {
		return $('input[name="SwSplitCell"]:checked').val();
	},

	_setSpinnerOnOff: function() {
		var type = this._getType();

		if (type === 'columns') {
			this._columnSpinner.spinner('enable');
			this._rowSpinner.spinner('disable');
		} else {
			this._columnSpinner.spinner('disable');
			this._rowSpinner.spinner('enable');
		}
	}
};

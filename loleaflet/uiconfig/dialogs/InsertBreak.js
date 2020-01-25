/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.InsertBreak
 * Writer : 插入手動分隔
 *
 * Author: Firefly <firefly@ossii.com.tw>
 * Note: 使用 jquery-ui 1.12.1 以上，使用方法參閱：	https://jqueryui.com/
 */
/* global $ _ _UNO */
L.dialog.InsertBreak = {
	_dialog: undefined,

	init: function(map) {
		this._map = map;
	},

	run: function(/*paramater*/) {
		var pageStyles = this._map.getStyleFamilies().PageStyles; // 頁面式樣
		var options = '<option value="">' + _('None') + '</option>';
		var that = this;
		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		for (var style in pageStyles) {
			options += '<option value="' + pageStyles[style] + '">' + _(pageStyles[style]) + '</option>';
		}
		this._dialog.innerHTML = '' +
		'<div><b>' + _('Type') + ' :</b></div>' +
		'<div><label><input type="radio" name="Kind" value="1"> ' + _('Line break') + '</label></div>' +
		'<div><label><input type="radio" name="Kind" value="2"> ' + _('Column break') + '</label></div>' +
		'<div><label><input type="radio" name="Kind" value="3" checked> ' + _('Page break') + '</label></div>' +
		'<div style="margin-top:16px;"><b>' + _('Style') + ' :</b></div>' +
		'<select name="TemplateName" id="TemplateName">' + options + '</select>' +
		'<label><input type="checkbox" name="PageNumberFilled" id="PageNumberFilled" disabled> ' + ('Change page number') + '</label>' +
		'<input id="PageNumber" name="PageNumber" disabled>';

		$(this._dialog).dialog({
			title: _UNO('.uno:InsertBreak', 'text', true),
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

		// 頁數微調事件處理
		$('#PageNumber').spinner({
			min: 0,
			numberFormat: 'n',
			change: function (event) {
				console.debug(event);
			},
		});

		// 類型變更事件處理
		$('input[type=radio][name=Kind]').on('change', function() {
			// 選擇頁面時，式樣才能選取
			if (this.value !== '3') {
				$('#TemplateName').selectmenu('disable');
				$('#PageNumberFilled').checkboxradio('disable'); // 停用變更頁面
				$('#PageNumber').spinner('disable').spinner('value', ''); // 停用頁數微調
			} else {
				$('#TemplateName').selectmenu('enable');
				if ($('#TemplateName').val() !== '') {
					$('#PageNumberFilled').checkboxradio('enable'); // 啟用變更頁面
					$('#PageNumber').spinner('enable'); // 啟用頁數微調
				}
			}
		});

		// 變更頁碼事件處理
		$('#PageNumberFilled').on('change', function() {
			$('#PageNumber').spinner('value', $(this).prop('checked') === true ? '1' : '');
		}).checkboxradio();

		// 下拉選單必須在 dialog('open') 後，再指定，否則會被遮住
		// 式樣變更事件處理
		$('#TemplateName').selectmenu({
			change: function(/*event, ui*/) {
				// 式樣為'無'時，變更頁碼和頁數不能操作
				if (this.value === '') {
					$('#PageNumberFilled').checkboxradio('disable');
					$('#PageNumber').spinner('disable').spinner('value', '');
				} else {
					$('#PageNumberFilled').checkboxradio('enable');
					$('#PageNumber').spinner('enable');
				}
			},
		}).selectmenu('menuWidget').css('height', '160px');
	},

	// 按下 OK 按鈕
	_okCommand: function() {
		var kind = parseInt($('input[type=radio][name=Kind]:checked').val());
		var templateName = $('#TemplateName').val();
		var pageNumberFilled = $('#PageNumberFilled').prop('checked');
		var pageNumber = $('#PageNumber').spinner('value');
		var args = {
			Kind: {
				type: 'short',
				'value': kind
			},
			TemplateName: {
				type: 'string',
				value: templateName
			},
			PageNumber: {
				type: 'short',
				value: pageNumber === null ? 0 : pageNumber
			},
			PageNumberFilled: {
				type: 'boolean',
				value: pageNumberFilled
			}
		};
		this._map.sendUnoCommand('.uno:InsertBreak', args);
	},
};
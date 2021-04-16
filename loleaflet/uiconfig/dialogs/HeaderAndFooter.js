/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.HeaderAndFooter
 * Impress 頁首與頁尾
 *
 * Author: Tommy <tommy@ossii.com.tw>
 */
/* global $ _ */
L.dialog.HeaderAndFooter = {
	// dialog 要一直存在，所以要建立具有唯一 ID 的 dialog 元素
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),
	_defaultText: '裝訂線',
	_defaultFont: '標楷體',

	// init 只會在載入的第一次執行
	init: function (map) {
		this._map = map;

		// 取得 OxOOL 字型列表
		var fontList = map.getFontList();

		this._id = this.$dialog.attr('id');
		this._textId = this._id + '_text';
		this._colorPickerId = this._id + '_colorPicker';
		this._fontSelectId = this._id + '_fontSelect';
		this._fontSizetId = this._id + '_fontSize';
		this._whatPageId = this._id + '_whatPage';
		this._positionId = this._id + '_position';
		this._boundaryId = this._id + '_boundary';
		var bodyStart =
			'<div style="padding:10px; font-size:16px;">' +
			'<div id="l10nlabel"></div>' +
			'<br>' +
			'<div>' +
			'<div>' +
			'<input name="dateandtime" id="dateandtime" class="w2ui-input-chk-hfdlg" type="checkbox"/>' + _('Date and time') + '<br/>' +
			'<input name="dt_radio" id="dt_fixed" class="w2ui-input-hfdlg" type="radio" value="fixed" style="margin-left: 10px;" disabled="disabled"/>' + _('Fixed') + ' :&nbsp;' +
			'<input name="dt_text" id="dt_text" class="w2ui-input-hfdlg" type="text" placeholder="' + _('input ex:2019/01/01(no comma,space symbols)') + '" disabled="disabled"/><br/>' +
			'<input name="dt_radio" id="dt_variable" class="w2ui-input-hfdlg" type="radio" value="variable" style="margin-left: 10px; disabled="disabled"/>' + _('Variable') + '<br/>' +
			'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + _('Format') + ' :&nbsp;<select name="dt_format" id="dt_format" class="w2ui-input-hfdlg" disabled="disabled">' +
			'</select><br/>' +
			'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + _('Language') + ' :&nbsp;<select name="dt_language" id="dt_language" class="w2ui-input-hfdlg" disabled="disabled">' +
			'<option value="1">' + _('Chinese(zh-TW)') + '</option>' +
			'<option value="0">' + _('English(en)') + '</option>' +
			'</select><br/>' +
			'<input name="footer" id="footer" class="w2ui-input-chk-hfdlg" type="checkbox"/>' + _('Footer') + '<br/>' +
			'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + _('Footer text') + ' :&nbsp;<input name="ft_text" id="ft_text" class="w2ui-input-hfdlg" type="text" placeholder="' + _('input any string(no comma,space symbols)') + '" disabled="disabled"/><br/>' +
			'<input name="pageno" id="pageno" class="w2ui-input-chk-hfdlg" type="checkbox"/>' + _('Slide number') + '<br/>' +
			'<input name="usecover" id="usecover" class="w2ui-input-chk-hfdlg" type="checkbox"/>' + _('Do not show on the first slide') + '<b/>';
		var bodyEnd =
			'</div>' +
			'</div>' +
			'</div>';

		var bodyMid = '';
		var body = bodyStart + bodyMid + bodyEnd;
		this.$dialog.html(
			body
		);


		var that = this;
		this.$dialog.dialog({
			title: _('Header and Footer'),
			closeText: _('Close'),
			position: { my: 'center', at: 'center', of: window },
			minWidth: 450,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function (/*event, ui*/) {
				// 預設選取第一個 button
			},
			buttons: [
				{
					text: _('Apply to All'),
					click: function () {
						var allPage = true;
						var enDate = false;
						var dateText = '2000/01/01';
						if ($('#dateandtime').is(':checked')) {
							enDate = true;
							//~ console.log($('#dt_text').val());
							if ($('#dt_variable:checked').val())
								dateText = $('#dt_format option:selected').text();
							else
								dateText = $('#dt_text').val();
						}
						var enFooter = false;
						var footerText = 'Default';
						if ($('#footer').is(':checked')) {
							enFooter = true;
							//~ console.log($('#ft_text').val());
							footerText = $('#ft_text').val();
						}
						var enPageno = false;
						if ($('#pageno').is(':checked'))
							enPageno = true;
						var useCover = false;
						if ($('#usecover').is(':checked'))
							useCover = true;
						var enAllpage = false;
						if (allPage == true)
							enAllpage = true;
						var macro = 'macro:///OxOOL.Impress.SetHeaderandFooter(' + enDate + ',' + dateText +
							',' + enFooter + ',' + footerText + ',' + enPageno + ',' + useCover + ',' + enAllpage + ')';
						map.sendMacroCommand(macro);
						$(this).dialog('close');
					}
				},
				{
					text: _('OK'),
					click: function () {
						var allPage = false;
						var enDate = false;
						var dateText = '2000/01/01';
						if ($('#dateandtime').is(':checked')) {
							enDate = true;
							//~ console.log($('#dt_text').val());
							if ($('#dt_variable:checked').val())
								dateText = $('#dt_format option:selected').text();
							else
								dateText = $('#dt_text').val();
						}
						var enFooter = false;
						var footerText = 'Default';
						if ($('#footer').is(':checked')) {
							enFooter = true;
							//~ console.log($('#ft_text').val());
							footerText = $('#ft_text').val();
						}
						var enPageno = false;
						if ($('#pageno').is(':checked'))
							enPageno = true;
						var useCover = false;
						if ($('#usecover').is(':checked'))
							useCover = true;
						var enAllpage = false;
						if (allPage == true)
							enAllpage = true;
						var macro = 'macro:///OxOOL.Impress.SetHeaderandFooter(' + enDate + ',' + dateText +
							',' + enFooter + ',' + footerText + ',' + enPageno + ',' + useCover + ',' + enAllpage + ')';
						map.sendMacroCommand(macro);
						$(this).dialog('close');
					}
				},
				{
					text: _('Cancel'),
					click: function () {
						$(this).dialog('close');
					}
				}
			]
		});

		var l10n = {
			l10nlabel: _('Include on Slide'),
		};


		for (var key in l10n) {
			$('#' + key).text(l10n[key]);
		}

		function padStr(i) {
			return (i < 10) ? '0' + i : '' + i;
		}

		var currentdate = new Date();
		var abbdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		var fulldays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		var abbmonths = ['Jan', 'Febr', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var fullmonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var fullyear = currentdate.getFullYear();
		var month = currentdate.getMonth();
		var date = currentdate.getDate();
		var day = currentdate.getDay();
		var halfyear = padStr(currentdate.getFullYear()).substring(2, 4);
		var formatEA = (month + 1) + '/' + date + '/' + fullyear;
		var formatEB = (month + 1) + '/' + date + '/' + halfyear;
		var formatEC = abbmonths[month] + '-' + date + '-' + fullyear;
		var formatED = abbdays[day] + '-' + fullmonths[month] + '-' + date + '-' + fullyear;
		var formatEE = fulldays[day] + '-' + fullmonths[month] + '-' + date + '-' + fullyear;
		var formatCA = (fullyear - 1911) + '/' + (month + 1) + '/' + date;
		var formatCB = fullyear + '/' + (month + 1) + '/' + date;
		var formatCC = fullyear + _('year') + (month + 1) + _('month') + date + _('day');

		$('#dt_format option').remove();
		$('#dt_format').append('<option>' + formatCA + '</option>');
		$('#dt_format').append('<option>' + formatCB + '</option>');
		$('#dt_format').append('<option>' + formatCC + '</option>');

		$('select').on('change', function () {
			if (this.value == '1') {
				$('#dt_format option').remove();
				$('#dt_format').append('<option>' + formatCA + '</option>');
				$('#dt_format').append('<option>' + formatCB + '</option>');
				$('#dt_format').append('<option>' + formatCC + '</option>');
			}
			if (this.value == '0') {
				$('#dt_format option').remove();
				$('#dt_format').append('<option>' + formatEA + '</option>');
				$('#dt_format').append('<option>' + formatEB + '</option>');
				$('#dt_format').append('<option>' + formatEC + '</option>');
				$('#dt_format').append('<option>' + formatED + '</option>');
				$('#dt_format').append('<option>' + formatEE + '</option>');
			}
		});

		$('input').on('click', function () {
			if ($('#dateandtime').is(':checked')) {
				$('#dt_fixed').attr('disabled', false);
				if ($('#dt_fixed:checked').val()) {
					$('#dt_text').prop('disabled', false);
					$('#dt_format').attr('disabled', true);
					$('#dt_language').attr('disabled', true);
				}
				$('#dt_variable').attr('disabled', false);
				if ($('#dt_variable:checked').val()) {
					$('#dt_text').prop('disabled', true);
					$('#dt_format').attr('disabled', false);
					$('#dt_language').attr('disabled', false);
				}
			} else {
				$('#dt_fixed').attr('disabled', true);
				$('#dt_text').prop('disabled', true);
				$('#dt_variable').attr('disabled', true);
				$('#dt_format').attr('disabled', true);
				$('#dt_language').attr('disabled', true);
			}
			if ($('#footer').is(':checked'))
				$('#ft_text').attr('disabled', false);
			else
				$('#ft_text').attr('disabled', true);
		});
	},

	// 每次都會從這裡開始
	run: function (/*parameter*/) {
		this.$dialog.dialog('open');
	},
};

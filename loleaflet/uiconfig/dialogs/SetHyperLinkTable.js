/* -*- js-indent-level: 8 -*- */
/**
 * L.dialog.SetHyperLinkTable
 *
 * @description calc 插入文件內連結
 * @author Firefly <firefly@ossii.com.tw>
 */
/* global $ _ */
L.dialog.SetHyperLinkTable = {
	_dialog: undefined,

	initialize: function() {
		// do nothing.
	},

	run: function(/*parameter*/) {
		var map = this._map;
		var docLayer = map._docLayer;

		// 不是試算表文件就結束
		if (map.getDocType() !== 'spreadsheet') return;

		if (docLayer._graphicSelection && !docLayer._isEmptyRectangle(docLayer._graphicSelection)) {
			L.dialog.alert({
				icon: 'error',
				message: _('Worksheet link not supported!')
			});
			return;
		}

		var hyperlink = {
			text: '', // 顯示文字
			cell: 'A1', // 儲存格或範圍名稱
			table: '' // 工作表
		};

		// 游標位於超連結上，且標記出整段超連結
		if (map.hyperlinkUnderCursor &&
			docLayer._selections.getLayers().length > 0) {
			hyperlink.text = map.hyperlinkUnderCursor.text;
			var link = map.hyperlinkUnderCursor.link;
			// # 號開頭表示是工作表連結
			if (link.startsWith('#')) {
				// 1. 先擷取儲存格名稱
				var cellIdx = link.indexOf('!');
				if (cellIdx >= 0) {
					hyperlink.cell = link.substr(cellIdx + 1);
					link = link.substr(0, cellIdx - 1); // URL 截斷 cell 位址
				}
				// 2. 擷取工作表名稱
				link = link.substr(1); // 去掉 # 號
				hyperlink.table = link.replace('\'', ''); // 去掉 ' 號
				useSystemDialog = false;
			}
		}

		var numParts = map.getNumberOfParts();
		var names = docLayer._partNames;
		var options = '';

		this._dialog = L.DomUtil.createWithId('div', '', document.body);
		this._uniqueId = $(this._dialog).uniqueId().attr('id'); // 唯一 ID
		var textId = this._uniqueId + 'text';
		var cellId = this._uniqueId + 'cell';
		var tableId = this._uniqueId + 'table';

		// 製作選擇列表
		for (var i = 0 ; i < numParts; i ++) {
			if (!map.isHiddenPart(i)) {
				var selected = (names[i] === hyperlink.table ? 'selected' : '');
				options += '<option value="' + names[i] + '" ' + selected + '>' + names[i] + '</option>';
			}
		}

		this._dialog.innerHTML =
		'<label for="' + textId + '">' + _('Text to display') + ' : ' + '</label><br>'
		+ '<input type="text" id="' + textId + '" value="' + hyperlink.text + '"><br>'
		+ '<label for="' + cellId + '">' + _('Cell') + ' : ' + '</label><br>'
		+ '<input type="text" id="' + cellId + '" value="' + hyperlink.cell + '"><br>'
		+ '<select id="' + tableId + '" size="8" style="width:100%; overflow-y: auto">'
		+ options + '</select>';

		// 選項有變更
		$('#' + tableId).on('change', function() {
			if ($('#' + textId).val() === '') {
				$('#' + textId).val(this.value);
			}
		});

		$(this._dialog).dialog({
			title: _('Worksheet link'),
			position: {my: 'center', at: 'center', of: window},
			minWidth: 250,
			autoOpen: true, // 自動顯示對話框
			modal: true,
			resizable: false,
			draggable: true,
			closeOnEscape: true,
			close: function(/*e, ui*/) {
				// 對話框關閉就徹底移除，下次要重新建立
				$(this).dialog('destroy').remove();
			},
			buttons: [
				{
					text: _('OK'),
					click: function() {
						var selected = $('#' + tableId).val();
						if (!selected) {
							L.dialog.alert({
								icon: 'error',
								message: _('Please select the target worksheet.')
							})
							return;
						}

						var url = '#\'' + selected + '\''; // 工作表 URL
						var cell = $('#' + cellId).val().trim(); // 儲存格
						var text = $('#' + textId).val().trim(); // 顯示文字
						if (text === '') {
							text = url; // 未指定顯示文字的話，就用工作表名稱當作顯示文字
						}
						if (cell === '') {
							cell = 'A1'; // 未指定儲存格，預設為 A1
						}
						var args = {
							'Hyperlink.Text': {
								type: 'string',
								value: text
							},
							'Hyperlink.URL': {
								type: 'string',
								value: url + '!' + cell
							},
							'Hyperlink.Type': {
								type: 'short',
								value: 1
							},
							/*'Hyperlink.Name': {
								type: 'string',
								value: ''
							}*/
						}
						map.sendUnoCommand('.uno:SetHyperlink', args);
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
};

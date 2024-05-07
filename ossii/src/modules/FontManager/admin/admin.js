/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * L.AdminModule.FontManager: Font Management
 *
 * @file admin.js
 * @created Thu, 2 May 2024 16:42:54 +0800
 * @author Firefly <firefly@ossii.com.tw>
 * @license MPLv2.0
 * @description
 */
/* global L _ */

L.AdminModule.FontManager = L.AdminModule.extend({

	_l10n: [
		_('Font Manager'), // 字型管理
		_('Select all'), // 全選
		_('File name'), // 檔案名稱
		_('Font name (preview)'), // 字型名稱（預覽）
		_('Style'), // 樣式
		_('Color font'), // 彩色字型
		_('Symbol font'), // 符號字型
		_('Delete'), // 刪除
		_('Delete selected files?'), // 刪除選取的字型嗎？
		_('Upload font files.'), // 上傳字型檔
		_('file(s).'), // 個檔案
		_('font(s).'), // 個字型
		_('Transmission'), // 傳輸中
	],

	_lang: String.locale.toLowerCase(),
	_fontList: {},


	_fileInfo : null, // 欲傳送的檔案資訊
	_fileReader : new FileReader(), // 檔案存取物件
	_sliceSize : 1024000, // 每次傳送的大小
	_loaded : 0, // 已經傳輸的 bytes

	/**
	 * Initialize the module.
	 *
	 * When implementing this module, the system has built-in several methods for you:
	 * -------------------------------------------------------------------------------
	 * 1. this.getDetail() get the detail object of this module
	 * 2. this.sendMessage(textMsg) send a message to own module's handleAdminMessage() function.
	 */
	initialize: function() {
		// 上傳按鈕點擊行為
		$('#uploadFonts').click(function() {
			// 模擬 input type=file 點擊，跳出檔案選取視窗
			document.getElementById('fontFiles').click();
		}).attr('title', _('Upload font files.'));

		// 上傳檔案有異動，表示有檔案被選取了
		$('#fontFiles').change(function(/*e*/) {
			this._uploadFileList = $('#fontFiles')[0].files;
			if (this._uploadFileList.length > 0) {
				this.uploadFonts(this._uploadFileList);
			}
		}.bind(this));

		$('#deleteButton').click(function(/*e*/) {
			//'刪除選取的 ' + checked.length + ' 個檔案嗎？'
			$('#deleteFontDialog').modal('show');
		}.bind(this));

		// 確定刪除字型
		$('#deleteOK').click(function() {
			var checked = $('input[name="filename"]:checked');
			if (checked.length > 0) {
				for (var i = 0 ; i < checked.length ; i++) {
					this.sendMessage('deleteFont ' + encodeURI(checked[i].value));
				}
				this.sendMessage('getFontlist');
			}
		}.bind(this));

		// 檔案全選或取消
		$('#selectAllFiles').change(function(/*e*/) {
			var $filenames = $('input[name="filename"]');
			if ($filenames.length > 0) {
				$filenames.prop('checked', $('#selectAllFiles').is(':checked'));
			}
			this._showOrHideDeleteButton();
		}.bind(this));

		this.sendMessage('getFontlist');

	},

	/**
	 * Process messages from the owning service module.
	 *
	 * @param {string} textMsg - the message text
	 */
	onMessage: function(textMsg) {
		// 傳回字型列表
		if (textMsg.startsWith('fontList:'))  {
			jsonIdx = textMsg.indexOf('[');
			if (jsonIdx > 0) {
				var json = JSON.parse(textMsg.substring(jsonIdx));
				this._updateFontList(json);
			}
			$('#fontFiles').val('');
		} else if (textMsg === 'deleteFontSuccess') {
			// do nothing
		} else {
			console.debug('unknow message :', textMsg);
		}
	},

	/**
	 * When this module is to be terminated.
	 */
	terminate: function() {
		// put your termination code here

	},

	uploadFonts: function(files) {
		var that = this;

		// 計算檔案總大小
		var totalSize = 0;
		for (var i = 0; i < files.length; i++) {
			totalSize += files[i].size;
		}

		var uploadURI = this.getDetail().serviceURI + 'uploadfonts';

		$('#uploadFonts').hide(); // 隱藏上傳按鈕
		$('#progressbar').css('width', '0%').attr('aria-valuenow', 0).text('');
		$('#uploadProgress').modal('show');

		var uploadCount = 0; // 已經上傳的檔案數量

		// 每次上傳一個檔案
		for (var i = 0; i < files.length; i++) {
			var formData = new FormData();
			formData.append('jwt', window.getCookie('jwt'));
			formData.append('file', files[i], files[i].name);

			ajax({
				method: 'POST',
				data: formData,
				url: uploadURI,
				success: function(data) {

				},
				error: function(xhr, text) {

				},
				complete: function(xhr) {
					uploadCount ++;
					// 全部上傳完畢
					if (uploadCount === files.length) {
						$('#uploadProgress').modal('hide'); // 隱藏進度條
						$('#uploadFonts').show(); // 顯示上傳按鈕
						that.sendMessage('getFontlist'); // 重新要求字型列表
					} else { // 更新進度條
						var percent = Math.round(uploadCount / files.length * 100);
						$('#progressbar').css('width', percent + '%')
						.attr('aria-valuenow', percent)
						.text(_('Transmission') + ' ' + percent + ' %');
					}
				}
			});
		}
	},

	/**
	 * 解析字型列表
	 * @param {object} fontList
	 */
	_updateFontList: function(fontList) {
		this._fontList = {}; // 清空之前的列表
		fontList.forEach(function(item/*, index*/) {
			var file = Object.keys(item)[0];
			var prop = item[file];
			var newProp = {
				// 字型名稱
				family: this._getNameByLocale(prop.family, prop.familylang),
				// 式樣名稱
				style: this._getNameByLocale(prop.style, prop.stylelang),
				// 彩色字型?
				color: (prop.color === 'true'),
				// 符號字型?
				symbol: (prop.symbol === 'true'),
				// 可變字型
				variable: (prop.variable === 'true'),
				// 支援語系
				lang: prop.lang,
				// 字體在字型檔中的編號(ttc 格式才有，一般是 0)
				index: prop.index,
				// 字體粗細
				weight: 400, // 預設為標準
				// 斜體
				slant: parseInt(prop.slant, 10),
			};

			switch (parseInt(prop.weight, 10)) {
			case 0: // Thin
				newProp.weight = 100;
				break;
			case 40: // Extra Light (Ultra Light)
				newProp.weight = 200;
				break;
			case 50: //
				newProp.weight = 300;
				break;
			case 80: // Normal (Regular)
				newProp.weight = 400;
				break;
			case 100: // Medium
				newProp.weight = 500;
				break;
			case 180: // Semi Bold
				newProp.weight = 600;
				break;
			case 200: // bold
				newProp.weight = 700;
				break;
			case 205: // Extra Bold
				newProp.weight = 800;
				break;
			case 210: // Black
				newProp.weight = 900;
				break;
			case 215: // Extra Black
				newProp.weight = 950;
				break;
			}

			var slant = parseInt(prop.slant, 10);
			newProp.slant = slant === 100 ? 'italic'
				: slant === 110 ? 'oblique' : 'normal';

			if (this._fontList[file] === undefined) {
				this._fontList[file] = [];
			}
			this._fontList[file].push(newProp);
		}.bind(this));

		// 更新畫面
		$('#font_list').html('');
		var count = 0, nFonts = 0;
		for (var key in this._fontList) {
			var trClass = '';
			var prop = this._fontList[key];
			nFonts += prop.length;
			count ++;
			if ((count % 2) === 0) {
				trClass = 'bg-light';
			}
			this._makeRow(key, prop, trClass);
		}

		// 強制取消全部選取狀態
		$('#selectAllFiles').prop('checked', false);
		this._showOrHideDeleteButton();

		// 有字型檔顯示數量標籤
		if (count > 0) {
			$('#totalFiles').text(count + ' ' + _('file(s).')).show();
			$('#totalFonts').text(nFonts + ' ' + _('font(s).')).show();
		} else {
			$('#totalFiles').hide();
			$('#totalFonts').hide();
		}

		$('input[name="filename"]').change(function(/*e*/) {
			var allFilenames = $('input[name="filename"]');
			var checked = $('input[name="filename"]:checked');
			$('#selectAllFiles').prop('checked', allFilenames.length === checked.length);
			this._showOrHideDeleteButton();
		}.bind(this));
	},

	/**
	 * 決定是否顯示刪除按鈕
	 */
	_showOrHideDeleteButton: function() {
		var checked = $('input[name="filename"]:checked');
		// 有任何檔案被選中，就顯示刪除按鈕
		if (checked.length > 0) {
			$('#deleteButton').html('<i class="bi bi-trash">&nbsp;</i>' +
				_('Delete') + ' ' + checked.length + ' ' + _('file(s).')).show();
		} else {
			$('#deleteButton').hide();
		}
	},

	/**
	 * 找出符合客戶端語系的名稱
	 * @param {string}} name - 以逗號','串接的名稱
	 * @param {string} nameLang - 以逗號','串接的語系
	 * @returns {string} 找到的名稱，空字串代表沒有找到
	 */
	_getNameByLocale: function(name, nameLang) {
		var aName = name.split(',');
		var aNameLang = nameLang.split(',');
		var langIdx = aNameLang.indexOf(this._lang); // 找指定的語系
		if (langIdx === -1) { // 沒有
			langIdx = aNameLang.indexOf('en'); // 找 en
			if (langIdx === -1) { // 又沒有
				langIdx = 0; // 預設第一個
			}
		}
		if (langIdx < aName.length) { // 索引在名稱列表範圍內
			return aName[langIdx]; // 傳回指定位置的名稱
		}
		return '';
	},

	/**
	 * 插入一列
	 * @param {*} key - 檔名
	 * @param {*} prop - 該檔案所屬的字型資訊
	 * @param {*} trClass - class
	 */
	_makeRow: function(key, prop, trClass) {
		var encodeKey = encodeURI(key);
		var formCheck = '<div class="form-check">' +
			'<input class="form-check-input" type="checkbox" value="' + key + '" id="'+ encodeKey +'" name="filename">' +
			'<label class="form-check-label" for="'+ encodeKey +'">' + key +
			'</label></div>';

		for (var i = 0 ; i < prop.length ; i++) {
			var row = document.createElement('tr');
			// 有指定 tr class
			if (trClass.length > 0)
				row.className = trClass;

			// 檔名 td
			var fileNameCell = document.createElement('td');
			if (prop.length > 1) {
				if (i === 0) {
					fileNameCell.rowSpan = prop.length;
					fileNameCell.innerHTML = formCheck;
					row.appendChild(fileNameCell);
				}
			} else {
				fileNameCell.innerHTML = formCheck;
				row.appendChild(fileNameCell);
			}

			// 字型名稱 td
			var fontNameCell = document.createElement('td');
			fontNameCell.className = 'fs-5';
			fontNameCell.style.fontFamily = prop[i].family;
			fontNameCell.style.fontWeight = prop[i].weight;
			fontNameCell.style.fontStyle = prop[i].slant;
			fontNameCell.innerText = prop[i].family;
			row.appendChild(fontNameCell);

			// 字型式樣 td
			var styleNameCell = document.createElement('td');
			styleNameCell.innerText = prop[i].style;
			row.appendChild(styleNameCell);

			// 彩色字型 td
			var isColorCell = document.createElement('td');
			isColorCell.className = 'text-center';
			isColorCell.innerHTML = (prop[i].color ? '<i class="bi bi-check2"></i>':'');
			row.appendChild(isColorCell);

			// 彩色字型 td
			var isSymbolCell = document.createElement('td');
			isSymbolCell.className = 'text-center';
			isSymbolCell.innerHTML = (prop[i].symbol ? '<i class="bi bi-check2"></i>':'');
			row.appendChild(isSymbolCell);

			document.getElementById('font_list').appendChild(row);
		}
	}

});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

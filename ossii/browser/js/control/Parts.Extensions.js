/* -*- js-indent-level: 8 -*- */
/*
 * Document parts extensions
 */

L.Map.include({
	/**
	 * 修改某張工作表或投影片名稱
	 * @author Firefly <firefly@ossii.com.tw>
	 *
	 * @param {string} name - 工作表或投影片名稱
	 * @param {number} nPos - 工作表位置(投影不須指定)
	 */
	 renamePage: function(name, nPos) {
		var command;
		switch (this.getDocType()) {
		case 'spreadsheet':
			command = {
				'Name': {
					'type': 'string',
					'value': name
				},
				'Index': {
					'type': 'long',
					'value': nPos + 1
				}
			};
			this.sendUnoCommand('.uno:Name', command);
			this.setPart(this._docLayer);
			break;
		case 'presentation':
		case 'drawing':
			command = {
				'Name': {
					'type': 'string',
					'value': name
				}
			};
			this.sendUnoCommand('.uno:RenamePage', command);
			break;
		}
	},

	/**
	 * 顯示指定名稱的工作表
	 * @param {*} sheetName
	 */
	showPage: function(sheetName) {
		if (this.getDocType() === 'spreadsheet' && this.hasAnyHiddenPart()) {
			var argument = {
				aTableName: {
					type: 'string',
					value: sheetName
				}
			};
			this.sendUnoCommand('.uno:Show', argument);
		}
	},

	/**
	 * 隱藏指定編號的工作表
	 * @param {*} tabNumber
	 */
	hidePage: function(tabNumber) {
		if (this.getDocType() === 'spreadsheet' && this.getNumberOfVisibleParts() > 1) {
			var argument = {
				nTabNumber: {
					type: 'int16',
					value: tabNumber
				}
			};
			this.sendUnoCommand('.uno:Hide', argument);
		}
	},

	/**
	 * 檢查工作表名稱是否合法
	 *
	 * @param {string} sheetName - 工作表名稱
	 * @param {number} nPos
	 * @returns true: 合法, false: 不合法或和現有名稱重複
	 */
	isSheetnameValid: function (sheetName, nPos) {
		var partNames = this._docLayer._partNames;
		var i;
		var invalidChars = '[]*?:/\\';
		var name = sheetName.trim();
		var isValid = (name.length > 0); // 非空字串

		// 工作表名稱頭尾不能有單引號
		if (isValid) {
			isValid = !(name.charAt(name.length - 1) === '\'' ||
			name.charAt(0) === '\'');
		}
		// 檢查是否有特殊字元
		for (i = 0 ; isValid && i < invalidChars.length ; i++) {
			if (name.includes(invalidChars[i])) {
				isValid = false;
			}
		}

		// nPos = -1 表示檢查是否和現有名稱重複
		if (nPos === undefined) {
			nPos = -1;
		}

		// 是否和現有工作表名稱重複
		for (i = 0 ; isValid && i < partNames.length ; i++) {
			// 同位置不檢查
			if (i !== nPos && name === partNames[i]) {
				isValid = false;
			}
		}
		return isValid;
	},

	/**
	 * 取得文件檔名(含副檔名)
	 */
	getFileName: function() {
		var file = this.options.wopi ? this.wopi.BaseFileName : this.options.doc;
		var idx = file.lastIndexOf('/');
		return file.substr(idx + 1);
	},

	/**
	 * 取得文件檔名(不含副檔名)
	 */
	getDocName: function() {
		var file = this.options.wopi ? this.wopi.BaseFileName : this.options.doc;
		var idx = file.lastIndexOf('.');
		// 去掉副檔名
		if (idx >= 0) {
			file = file.substr(0, idx);
		}

		idx = file.lastIndexOf('/');
		file = file.substring(idx + 1);
		return file;
	},

	/**
	 * 取得某工作表或投影片的詳細資訊
	 * @param {number} part - 從 0 開始的編號
	 * @returns null: Writer或系統不支援(後端不是OxOffice)
	 */
	getPartProperty: function(part) {
		// 文字文件目前不支援取得每頁資訊
		// TODO: 將來可能嗎？
		if (this.getDocType() === 'text' || this._docLayer._partsInfo === undefined) {
			return null;
		}
		// 未指定工作表或投影片編號，表示目前選取的工作表或投影片編號
		part = (part === undefined ? this._docLayer._selectedPart : parseInt(part, 10));
		return this._docLayer._partsInfo[part];
	},

	/**
	 * 指定工作表是否被保護
	 * @param {number} part - 從 0 開始的編號
	 * @returns
	 */
	isPartProtected: function(part) {
		var pInfo = this.getPartProperty(part);
		if (pInfo) {
			return pInfo.isProtected();
		}
		// 否則從 stateChangeHandler 取得
		var state = this.stateChangeHandler.getItemProperty('.uno:Protect');
		return state.checked();
	},

	/**
	 * 取得文字文件總頁數
	 * @author Firefly <firefly@ossii.com.tw>
	 * @returns 總頁數
	 */
	getNumberOfPages: function() {
		return this._docLayer._pages;
	},

	/**
	 *  取得所有隱藏的工作表名稱
	 * @returns 以逗號分隔的工作表字串
	 */
	getHiddenPartNames: function() {
		var partNames = this._docLayer._partNames;
		var names = [];
		for (var i = 0; i < partNames.length; ++i) {
			if (this.isHiddenPart(i))
				names.push(partNames[i]);
		}
		return names.join(',');
	},

	/**
	 * 取得文字文件目前由表所在頁號
	 * @author Firefly <firefly@ossii.com.tw>
	 * @returns 目前所在頁
	 */
	getCurrentPageNumber: function () {
		return this._docLayer._currentPage;
	},
});

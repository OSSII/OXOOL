/* -*- js-indent-level: 8 -*- */
/*
 * Document permission handler
 */

L.Map.include({
	readonlyBar: null,

	// 替代原本的 _shouldStartReadOnly
	_shouldStartReadOnly: function () {
		if (this.isLockedReadOnlyUser())
			return true;
		var fileName = this['wopi'].BaseFileName;
		// use this feature for only integration.
		if (!fileName) return false;
		var extension = this._getFileExtension(fileName);

		// 如果該檔案只能以 ODF 格式編輯的話
		if (this.isOnlySaveAsODF() && this.readonlyStartingFormats[extension] === undefined) {
			var odfFormat = this.wopi.UserExtraInfo.SaveToOdf;
			// 將該檔案類別設成不能編輯，只能唯讀
			this.readonlyStartingFormats[extension] = {canEdit: false, odfFormat: odfFormat};
		}

		if (!Object.prototype.hasOwnProperty.call(this.readonlyStartingFormats, extension))
			return false;
		return true;
	},

	// 替代原本的 _enterEditMode
	_enterEditMode: function (perm) {
		this._permission = perm;

		// 非手機設備且位於唯讀專用模式
		if (!window.mode.isMobile()) {
			if (this.readonlyBar !== null) {
				this.removeControl(this.readonlyBar);
				this.readonlyBar = null;
			}
		}

		if (!L.Browser.touch) {
			this.dragging.disable();
		}

		if ((window.mode.isMobile() || window.mode.isTablet()) && this._textInput && this.getDocType() === 'text') {
			this._textInput.setSwitchedToEditMode();
		}

		this.fire('updatepermission', {perm : perm});

		if (this._docLayer._docType === 'text') {
			this.setZoom(10);
		}

		if (window.ThisIsTheiOSApp && window.mode.isTablet() && this._docLayer._docType === 'spreadsheet')
			this.showCalcInputBar(0);

		if (window.ThisIsTheAndroidApp)
			window.postMobileMessage('EDITMODE on');
	},

	// 替代原本的 _enterReadOnlyMode
	_enterReadOnlyMode: function (perm) {
		this._permission = perm;

		// 非手機設備的話，要使用唯讀專用模式
		if (!window.mode.isMobile()) {
			if (this.readonlyBar === null) {
				this.readonlyBar = L.control.readonlyBar();
				this.addControl(this.readonlyBar);
			}
		}

		this.dragging.enable();
		// disable all user interaction, will need to add keyboard too
		if (this._docLayer) {
			this._docLayer._onUpdateCursor();
			this._docLayer._clearSelections();
			this._docLayer._onUpdateTextSelection();
		}
		this.fire('updatepermission', {perm : perm});
		this.fire('closemobilewizard');
		this.fire('closealldialogs');

		if (window.ThisIsTheAndroidApp)
			window.postMobileMessage('EDITMODE off');
	},

	isViewMode: function() {
		return this._permission === 'view';
	},

	/**
	 * 是否只能存成 ODF 格式
	 * @returns {boolean} true: Yes, false: No
	 */
	isOnlySaveAsODF: function () {
		if (this.wopi.UserExtraInfo && this.wopi.UserExtraInfo.SaveToOdf) {
			return (['odt', 'ods', 'odp'].indexOf(this.wopi.UserExtraInfo.SaveToOdf) >= 0);
		}
		return false;
	}
});

/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * L.AdminModule.SoftwareUpgrade: Software Upgrade
 *
 * @file admin.js
 * @created Thu, 7 May 2024 16:21:00 +0800
 * @author Firefly <firefly@ossii.com.tw>
 * @license MPLv2.0
 * @description
 */
/* global L _ */

L.AdminModule.SoftwareUpgrade = L.AdminModule.extend({

	_l10n: [
		_('Software Upgrade'), // 軟體升級
		_('The following file types are accepted : *.zip/*.tar.gz/*.rpm/.deb'), // 接受以下的檔案類型
		_('Upload'), // 上傳
		_('Transmission'), // 傳輸
		_('Unsupported package installation system!'), // 不支援的套件安裝系統
		_('Software upgrade only supports rpm and dep package formats.'), // 軟體升級僅支援 rpm 和 dep 套件格式
	],

	_packageBase: '', // 套件包裝格式

	/**
	 * Initialize the module.
	 *
	 * When implementing this module, the system has built-in several methods for you:
	 * -------------------------------------------------------------------------------
	 * 1. this.getDetail() get the detail object of this module
	 * 2. this.sendMessage(textMsg) send a message to own module's handleAdminMessage() function.
	 */
	initialize: function() {
		$('#filename').change(function () {
			var fname = $(this).val().substr(12);
			$('#filename-disp').val(fname);
			$('#upload').attr('disabled', fname === '' ? true : false);
		});
		$('#upload').click(function () {
			this.upload($('#filename')[0].files[0]);
		}.bind(this));

		this.sendMessage('getPackageBase'); // 取得套件包裝格式
	},

	/**
	 * Process messages from the owning service module.
	 *
	 * @param {string} textMsg - the message text
	 */
	onMessage: function(textMsg) {
		switch (textMsg)
		{
		case 'uncompressPackageFail': // 解壓縮失敗
			this._addMessage('<p class="text-danger h5">' + _('File decompression failed!') + '</p>');
			break;
		case 'upgradePackageTestFail': // 測試升級失敗
			this._addMessage('<p class="text-danger h5">' + _('Test upgrade failed!') + '</p>');
			break;
		case 'upgradeSuccess': // 軟體升級成功
			var successMsg = _('Software upgrade is successful.');
			this._addMessage('<p class="text-success h4 fw-bold">' + successMsg + '</p>');
			vex.dialog.alert({unsafeMessage: '<p class="text-success">' + successMsg +
				'<br>' + _('You may need to restart the service.') + '</p>'});
			break;
		case 'upgradeFail': // 軟體升級失敗
			this._addMessage('<p class="text-danger h4 fw-bold">' + _('Software upgrade failed!') + '</p>');
			break;
		default:
			// 傳回套件包裝格式
			if (textMsg.startsWith('packageBase:')) {
				this._packageBase = textMsg.substring(12);
				if (this._packageBase !== 'rpm' && this._packageBase !== 'deb') {
					$('#unsupport').show();
				} else {
					$('#uploadForm').show();
				}
			// 傳回升級過程訊息
			} else if (textMsg.startsWith('upgradeInfo:')) {
				this._addMessage(textMsg.substring(12));
			// 傳回升級訊息
			} else if (textMsg.startsWith('upgradeMsg:')) {
				this._addMessage('<p class="text-info h4 fw-bold">' + _(textMsg.substring(11)) + '<p>');
			} else {
				console.debug('未知訊息 : ' + textMsg);
			}
			break;
		}
	},

	/**
	 * When this module is to be terminated.
	 */
	terminate: function() {
		// put your termination code here

	},

	/**
	 * Upload file.
	 */
	upload: function() {
		var that = this;
		$('#filename').attr('disabled', true);
		$('#upload').attr('disabled', true);
		$('#console').show();

		var uploadURI = this.getDetail().serviceURI + 'upload';

		var formData = new FormData();
		formData.append('jwt', window.getCookie('jwt'));
		formData.append('file', $('#filename')[0].files[0]);

		ajax({
			url: uploadURI,
			method: 'POST',
			data: formData,
			progress: function(loaded, total) {
				var percent = Math.round((loaded / total) * 100);
				$('#progressbar').css('width', percent +'%')
					.attr('aria-valuenow', percent)
					.text(_('Transmission') + ' ' + percent + ' %');
			},
			success: function(data) {
				that.sendMessage('upgradePackage');
				console.debug('upload success:', data);
			},
			error: function(xhr) {
				vex.dialog.alert({unsafeMessage: _('File upload failed')});
				console.error('upload error:', xhr);
			},
			complete: function(xhr) {
				console.debug('upload complete');
			},
		});
	},

	/**
	 * Add message to console.
	 *
	 * @param {string} msg - the message text
	 */
	_addMessage: function(msg) {
		var view = $('#message-area');
		var text = view.html() + msg;
		view.html(text);
		view.scrollTop(view[0].scrollHeight);
	},
});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

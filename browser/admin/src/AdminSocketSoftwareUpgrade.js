/* -*- js-indent-level: 8 -*- */
/*
	Software upgrade in the admin console.
*/
/* global AdminSocketBase Admin $ _ vex */
var AdminSocketSoftwareUpgrade = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_l10nMsg: [
		_('The following file types are accepted : *.zip/*.tar.gz/*.rpm/.deb'), // 接受以下的檔案類型
		_('Upload'), // 上傳
		_('Unsupported package installation system!'), // 不支援的套件安裝系統
		_('Unable to enter the temporary directory!'), // 無法進入暫存目錄
		_('Unknown file type!'), // 未知的檔案型態
		_('File uncompressing...'), // 檔案解壓縮
		_('Test whether it can be upgraded.'), // 測試是否能升級
		_('Start the upgrade.'), // 開始升級
		_('Start the real upgrade.'), // 開始正式升級
	],

	_fileInfo : null, // 欲傳送的檔案資訊
	_fileReader : new FileReader(), // 檔案存取物件
	_sliceSize : 1024000, // 每次傳送的大小
	_loaded : 0, // 已經傳輸的 bytes

	onSocketOpen: function() {
		var that = this;
		// Base class' onSocketOpen handles authentication
		this.base.call(this);

		$('#filename').change(function () {
			var fname = $(this).val().substr(12);
			$('#filename-disp').val(fname);
			$('#upload').attr('disabled', fname === '' ? true : false);
		});
		$('#upload').click(function () {
			that._fileInfo = $('#filename')[0].files[0];
			that.socket.send(
				'uploadFile ' +
				encodeURI(that._fileInfo.name) + ' ' +
				that._fileInfo.size
			);
		});
	},

	_uploadFile: function(start) {
		if (start === 0) this._loaded = 0;
		var that = this;
		var nextSlice = start + this._sliceSize;
		var blob = this._fileInfo.slice(start, nextSlice);
		this._fileReader.onloadend = function(e) {
			if (e.target.readyState !== FileReader.DONE) {
				return;
			}
			that.socket.send(e.target.result); // 資料傳送給 server
			that._loaded += e.loaded; // 累計傳送大小
			if (that._loaded < that._fileInfo.size)
				that._uploadFile(nextSlice);
		};
		this._fileReader.readAsArrayBuffer(blob);
	},

	_addMessage: function(msg) {
		var view = $('#message-area');
		var text = view.html() + msg;
		view.html(text);
		view.scrollTop(view[0].scrollHeight);
	},

	onSocketMessage: function(e) {
		var textMsg;
		if (typeof e.data === 'string')
		{
			textMsg = e.data;
		}
		else
		{
			textMsg = '';
		}

		switch (textMsg)
		{
		case 'readyToReceiveFile':	//  Server 已準備接收檔案
			$('#filename').attr('disabled', true);
			$('#upload').attr('disabled', true);
			$('#console').show();
			this._uploadFile(0);
			break;
		case 'uploadFileInfoError': // 上傳檔案資訊有誤
			vex.dialog.alert({unsafeMessage: _('The upload file command is wrong, the syntax is as follows:') + '<br>uploadFile <file name> <file size>'});
			break;
		case 'uploadFileReciveOK': // 檔案接收完畢
			this._addMessage('<p class="text-info h4 fw-bold">' + _('Start the software upgrade...') + '</p>');
			this.socket.send('upgradePackage'); // 通知正式升級
			break;
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
			if (textMsg.startsWith('upgradeInfo:')) {
				this._addMessage(textMsg.substr(12));
			} else if (textMsg.startsWith('upgradeMsg:')) {
				this._addMessage('<p class="text-info h4 fw-bold">' + _(textMsg.substr(11)) + '<p>');
			} else if (textMsg.startsWith('receivedSize:')) {
				var totalBytes = textMsg.substr(13);
				var percent = Math.floor((totalBytes / this._fileInfo.size) * 100); // 計算傳送比例
				$('#progressbar').css('width', percent +'%')
					.attr('aria-valuenow', percent)
					.text(_('Transmission') + ' ' + percent + ' %');
			} else {
				console.log('未知訊息 : ' + textMsg);
			}
			break;
		}
	},

	onSocketClose: function() {
		this.base.call(this);
	}
});

Admin.SoftwareUpgrade = function(host)
{
	return new AdminSocketSoftwareUpgrade(host);
};

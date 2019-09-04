/* -*- js-indent-level: 8 -*- */
/*
	Software upgrade in the admin console.
*/
/* global AdminSocketBase Admin $ vex */
var AdminSocketSoftwareUpgrade = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_fileInfo : null, // 欲傳送的檔案資訊
	_fileReader : new FileReader(), // 檔案存取物件
	_sliceSize : 1024000, // 每次傳送的大小
	_loaded : 0, // 已經傳輸的 bytes

	onSocketOpen: function() {
		var that = this
		// Base class' onSocketOpen handles authentication
		this.base.call(this);

		$('#filename').change(function () {
			var fname = $(this).val().substr(12);
			$('#filename-disp').val(fname);
			$('#upload').attr('disabled', fname === '' ? true : false);
		});
		$('#upload').click(function () {
			that._fileInfo = $('#filename')[0].files[0];
			var fileObj = {name: that._fileInfo.name.toLowerCase(), size:that._fileInfo.size};
			that.socket.send('uploadUpgradeFile ' + JSON.stringify(fileObj));
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
		}
		this._fileReader.readAsArrayBuffer(blob);
	},

	_addMessage: function(msg) {
		var view = $('#message-area');
		var text = view.html() + msg + '\n';
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
			$('#progress').show();
			this._uploadFile(0);
			break;
		case 'upgradeFileInfoError': // 上傳檔案資訊有誤
			vex.dialog.alert('上傳檔案資訊有誤，請檢查');
			break;
		case 'upgradeFileReciveOK': // 檔案接收完畢
			$('#work-area').show();
			this._addMessage('解壓縮升級檔案...');
			this.socket.send('uncompressPackage'); // 通知解壓檔案
			break;
		case 'uncompressPackageOK': // 檔案解壓完畢
			this._addMessage('<b style="color:green">檔案解壓成功</b>');
			this._addMessage('測試是否能升級...');
			this.socket.send('upgradePackageTest'); // 通知升級測試
			break;
		case 'uncompressPackageFail': // 檔案解壓失敗
			this._addMessage('<b style="color:red">檔案解壓失敗</b>');
			vex.dialog.alert('檔案解壓失敗，請檢查檔案是否正確');
			this.socket.send('clearUpgradeFiles'); // 清除升級暫存檔案
			break;
		case 'upgradePackageTestOK': // 升級測試成功
			this._addMessage('<b style="color:green">升級測試成功</b>');
			this._addMessage('<b style="color:yellow">開始升級作業，請稍候...</b>');
			this.socket.send('upgradePackage'); // 通知正式升級
			break;
		case 'upgradePackageTestFail': // 升級測試失敗
			this._addMessage('<b style="color:red">升級測試失敗</b>');
			vex.dialog.alert('升級測試失敗，請檢查檔案是否正確');
			this.socket.send('clearUpgradeFiles'); // 清除升級暫存檔案
			break;
		case 'upgradeSuccess': // 軟體升級成功
			this._addMessage('<b style="color:green; font-size:24px">軟體升級成功</b>');
			this.socket.send('clearUpgradeFiles'); // 清除升級暫存檔案
			vex.dialog.alert('<p style="font-size:24px;color:green;">軟體升級成功！<br>您可能需要重啟服務</p>');
			break;
		case 'upgradeFail': // 軟體升級失敗
			this._addMessage('<b style="color:red">軟體升級失敗</b>');
			this.socket.send('clearUpgradeFiles'); // 清除升級暫存檔案
			break;
		case 'clearUpgradeFilesOK': // 清除升級暫存檔案成功
			// 無關緊要
			break;
		case 'clearUpgradeFilesFail': // 清除升級暫存檔案失敗
			// 無關緊要
			break;
		default:
			if (textMsg.startsWith('upgradeInfo:')) {
				this._addMessage(textMsg.substr(12));
			} else if (textMsg.startsWith('receivedSize:')) {
				var totalBytes = textMsg.substr(13);
				var percent = Math.floor((totalBytes / this._fileInfo.size) * 100); // 計算傳送比例
				$('#progressbar').css('width', percent +'%')
								.attr('aria-valuenow', percent)
								.text('已完成 ' + percent + ' %');
			} else {
				console.log('未知訊息 : ' + textMsg);
			}
			break;
		}
	},

	onSocketClose: function()
	{
	}
});

Admin.SoftwareUpgrade = function(host)
{
	return new AdminSocketSoftwareUpgrade(host);
};

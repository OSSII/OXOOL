/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the config settings in Admin console
*/
/* global $ AdminSocketBase Admin _ bootstrap */
var AdminSocketSSLCertManager = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_l10n: [
		_('Enable SSL'), // 啟用 SSL
		_('Connection via proxy'), // 使用 https 代理
		_('Certificate file path'), // 數位憑證檔案位置
		_('Upload cert file.'), // 上傳數位憑證檔案
		_('Private key file path'), // 私鑰檔案位置
		_('Upload private file.'), // 上傳私鑰檔案
		_('CA file path'), // CA 憑證檔案位置
		_('Upload CA file.'), // 上傳 CA 憑證檔案
		_('new'), // 新的
		_('Cipher list'), // 加密演算法清單
		_('The private key is password protected, please enter the password'), // 私鑰有密碼保護，請輸入密碼
		_('Update SSL configuration'), // 更新 SSL 配置
	],

	_file: null, // 準備上傳的檔案資訊
	_type: '', // 準備上傳的檔案類別(cert:數位憑證, key:私鑰, ca:CA 憑證)
	_privateKeyPassword: '', // 私鑰密碼

	// 上傳檔案
	_uploadFile: function() {
		var reader = new FileReader();
		reader.onloadend = function(e) {
			if (e.target.readyState !== FileReader.DONE) {
				return;
			}
			this.socket.send(e.target.result);
		}.bind(this);
		var blob = this._file.slice(0, this._file.size);
		reader.readAsArrayBuffer(blob);
		$('#uploadFile').val(''); // 清除上傳檔案內容
	},

	setConfig: function (settings) {
		// 如果有上傳過 SSL 檔案，此時下令替換
		this.socket.send('replaceNewSSLFiles');
		if (this._privateKeyPassword !== '') {
			// 有收到 Server 通知的加密密碼
			this.socket.send('setSSLSecurePassword ' + this._privateKeyPassword);
			// 清除密碼
			this._privateKeyPassword = '';
		}
		// 更新 SSL 設定
		this.socket.send('setConfig ' + encodeURI(settings));
	},

	saveConfig: function() {
		var json = {};

		document.querySelectorAll('#mainform input, select, textarea, .host-list').forEach(function(item) {

			if (item.type === undefined) {
				// 主機或IP列表
				if (item.classList.contains('host-list')) {
					json[item.id] = [];
					for (var i = 0 ; i < item.childNodes.length ; i++) {
						json[item.id].push(this._getHostItem(item.childNodes[i]).getData());
					}
				} else {
					console.log('未知的設定 element:', item);
				}
			} else {
				switch (item.type)
				{
				case 'checkbox':
					json[item.id] = (item.checked ? 'true' : 'false');
					break;
				default:
					json[item.id] = item.value;
					break;
				}
			}

		}.bind(this));

		this.setConfig(JSON.stringify(json)); // 更新
	},

	/**
	 * Web socket 連線成功
	 */
	onSocketOpen: function() {
		// 呼叫 base class 進行認證
		this.base.call(this);

		// 移除殘留的 SSL 檔案
		this.socket.send('removeResidualSSLFiles');

		// 要求命令格式為 :
		// getConfig <id1> [id2] [id3] ...
		var cmd = 'getConfig';
		var elements = document.querySelectorAll('#mainform input, select, textarea, .host-list ,.form-text');
		elements.forEach(function(item) {
			if (item.id !== undefined) {
				cmd += ' ' + item.id;
			} else {
				console.log('沒有指定 id', item);
			}
		});
		// 向 Server 要求這些 id 代表的資料
		this.socket.send(cmd);

		// 數位憑證有異動，表示有檔案被選取了
		$('#uploadFile').change(function(e) {
			// 各類憑證檔案不可能大於 10240 bytes
			if (e.target.files[0].size > 10240) {
				this.alert({
					message: _('File size is too large.'),
					type: 'danger'
				});
				return;
			}
			this._file = e.target.files[0];
			this._type = e.target.getAttribute('data-type');
			this.socket.send('uploadFile ' + encodeURI(this._file.name) + ' ' + this._file.size);
		}.bind(this));

		// 上傳數位憑證點擊行為
		$('#uploadCertFile').click(function() {
			var uploadFileEl = document.getElementById('uploadFile');
			// 設定屬性
			uploadFileEl.setAttribute('data-type', 'cert');
			// 模擬 input type=file 點擊，跳出檔案選取視窗
			uploadFileEl.click();
		}).attr('title', _('Upload cert file.'));

		// 上傳私鑰點擊行為
		$('#uploadKeyFile').click(function() {
			var uploadFileEl = document.getElementById('uploadFile');
			// 設定屬性
			uploadFileEl.setAttribute('data-type', 'key');
			// 模擬 input type=file 點擊，跳出檔案選取視窗
			uploadFileEl.click();
		}).attr('title', _('Upload private file.'));

		// 上傳 CA 憑證點擊行為
		$('#uploadCAFile').click(function() {
			var uploadFileEl = document.getElementById('uploadFile');
			// 設定屬性
			uploadFileEl.setAttribute('data-type', 'ca');
			// 模擬 input type=file 點擊，跳出檔案選取視窗
			uploadFileEl.click();
		}).attr('title', _('Upload CA file.'));

		// 更新設定按鈕
		$('#saveConfig').click(function() {
			this.saveConfig();
		}.bind(this));

		this._passwordDialog = new bootstrap.Modal(document.getElementById('passwordDialog'));
		// 確認密碼按鈕
		$('#ensurePassword').click(function() {
			if ($('#requestpassword').val().trim() !== '') {
				this._passwordDialog.hide();
				this.socket.send('ensureSSLPasswordConfirm ' + encodeURI($('#requestpassword').val()));
			}
		}.bind(this));

		// 取消密碼確認，會令 Server 移除原來上傳的檔案
		$('#cancelPassword').click(function() {
			this._passwordDialog.hide();
			this.socket.send('cancelSSLPasswordConfirm');
		}.bind(this));
	},

	/**
	 * Web socket 收到 server 資料
	 * @param {object} e
	 */
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

		if (textMsg.startsWith('settings')) {
			var json = JSON.parse(textMsg.substring(textMsg.indexOf('{')));
			for (var key in json)
			{
				// null : 表示 xml 中找不到對應的 key
				if (json[key] === null) {
					console.debug('"' + key + '\" : xml 中，無此 key 請檢查！');
					continue;
				}

				var input = document.getElementById(key);
				if (input)
				{
					switch (input.type)
					{
					case 'color':
					case 'text':
					case 'textarea':
					case 'number':
					case 'hidden':
						input.value = json[key];
						break;
					case 'radio':
					case 'checkbox':
						input.checked = json[key];
						break;
					case 'select-one':	// 下拉選項(單選)
						for (var i = 0 ; i < input.length ; i++)
						{
							if (input.options[i].value == json[key])
							{
								input.selectedIndex = i;
								break;
							}
						}
						break;
					default:
						// 輸入說明
						if (input.classList.contains('form-text')) {
							input.innerText = json[key];
						// 主機列表
						} else if (input.classList.contains('host-list')) {
							this._makeHostList(key, json[key]);
						} else {
							console.log('未知的 input type -> ' + input.type);
							if (input.value !== undefined) {
								input.value = json[key];
							}
						}
						break;
					}
				}
			}
		}
		else if (textMsg == 'setConfigOk')	// 設定更新成功
		{
			$('#certFileUpdated').addClass('d-none'); // 隱藏已更新
			$('#keyFileUpdated').addClass('d-none'); // 隱藏已更新
			$('#caFileUpdated').addClass('d-none'); // 隱藏已更新
			this.alert({
				message: _('These settings will take effect after restarting the service.')
			});
		}
		else if (textMsg == 'setConfigNothing')
		{
			this.alert({
				message: _('Please check if there is any problem with the set data.'),
				type: 'warning'
			});
		} else if (textMsg === 'readyToReceiveFile') { // Server 已準備接收檔案
			this._uploadFile(); // 上傳檔案
		} else if (textMsg === 'uploadFileReciveOK') { // Server 通知檔案接收完畢
			this.socket.send('checkSSLFile ' + this._type); // 檢查 SSL 相關檔案
		} else if (textMsg === 'checkSSLFileValid') { // Server 通知SSL檔案有效
			switch (this._type) {
			case 'cert': // 數位憑證
				$('#certFileUpdated').removeClass('d-none'); // 顯示已更新
				break;
			case 'key': // 私鑰
				$('#keyFileUpdated').removeClass('d-none'); // 顯示已更新
				break;
			case 'ca': // CA
				$('#caFileUpdated').removeClass('d-none'); // 顯示已更新
				break;
			}
			this._file = null;
			this._type = '';
		} else if (textMsg === 'checkSSLFileInvalid') { // Server 通知SSL檔案無效
			switch (this._type) {
			case 'cert': // 數位憑證
				$('#certFileUpdated').addClass('d-none'); // 取消已更新
				break;
			case 'key': // 私鑰
				$('#keyFileUpdated').addClass('d-none'); // 取消已更新
				break;
			case 'ca': // CA
				$('#caFileUpdated').addClass('d-none'); // 取消已更新
				break;
			}
			this._file = null;
			this._type = '';
			this.alert({
				message: _('Invalid SSL file uploaded.'),
				type: 'danger'
			});
		} else if (textMsg === 'checkSSLFileRequestPassword') { // Server 通知SSL檔案需要密碼
			$('#passwordtitle').text(_('Private key password'));
			$('#requestpassword').val(''); // 清除前次輸入
			this._passwordDialog.show(); // 顯示 dialog
		} else if (textMsg === 'checkSSLFilePasswordIncorrect') { // Server 通知SSL密碼不正確
			$('#passwordtitle').text(_('The password is incorrect'));
			$('#requestpassword').val(''); // 清除前次輸入
			this._passwordDialog.show(); // 顯示 dialog
		} else if (textMsg.startsWith('PrivateKeyPassword:')) { // Server 通知有效的私鑰密碼(已加密)
			// 記住 Server 送來的加密密碼
			this._privateKeyPassword = textMsg.substring('PrivateKeyPassword:'.length).trim();
		} else if (textMsg === 'checkSSLFileNoPassword') { // Server 通知無密碼
			this._privateKeyPassword = '';
		}

		$('#saveConfig').attr('disabled', false);
	},

	/**
	 * Web socket 關閉
	 */
	onSocketClose: function()
	{
		// 呼叫 base class 以確認是否 server 關閉
		this.base.call(this);
	},

	/**
	 * 顯示訊息
	 * @param {string} message
	 * @param {string} type - success, danger, warning
	 */
	alert: function(msgObj) {
		if (msgObj.type === undefined)
			msgObj.type = 'success';

		var alertPlaceholder = document.getElementById('alertPlaceholder');
		alertPlaceholder.innerHTML =
			'<div class="alert alert-' + msgObj.type + ' alert-dismissible fade show" role="alert">'
			+ '<span>' + msgObj.message + '</span>'
			+ '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>'
			+ '</div>';
	},
});

Admin.SSLCertManager = function(host)
{
	return new AdminSocketSSLCertManager(host);
};

/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the config settings in Admin console
*/
/* global $ AdminSocketBase Admin _ bootstrap */
var AdminSocketConfigSettings = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_l10n: [
		_('millisecond'), // 毫秒
		_('seconds'), // 秒
		_('bytes'), // 位元組
		_('K Bytes'), // K 位元組
		_('M Bytes'), // M 位元組
		_('General settings'), // 一般設定
		_('Server name'), // 主機名稱
		_('Port'), // 埠號
		_('Custom UI file name'), // 自訂 UI 檔名


		_('Document editing settings'), // 文件編輯設定
		_('Available threads per document'), // 每個文件可用的執行緒
		_('Enable file conversion'), // 啟用轉檔功能
		_('File conversion priority (1-19)'), // 轉檔優先權(1-19)
		_('Document signing URL'), // 文件加簽位址
		_('Tracked changes show comments'), // 顯示追蹤修訂註解
		_('Unload document when idle'), // 閒置多久卸載文件
		_('How long is it idle to auto save (if modified)'), // 閒置多久自動存檔(如果修改過)
		_('Auto save time (if modified)'), // 自動存檔時間(如果修改過)
		_('When leaving the editor, it is forced to save even if it has not been modified'), // 離開編輯時，即使未修改也強制存檔
		_('Virtual memory available for each document'), // 每個文件可用的虛擬記憶體
		_('Maximum stack size available for each document procress'), // 每個文件程序可用的堆疊大小
		_('File size that can be written by each document procress'), // 每個文件程序可寫入的檔案大小
		_('The number of files that can be opened by each document procress'), // 每個文件程序可開啟的檔案數量
		_('Load file time limit'), // 載入文件時間限制
		_('File conversion time limit'), // 轉檔時間限制
		_('Cleanup mechanism(after enabling, the following settings will be effective)'), // 清理機制（啟用後，以下設定才會有作用）
		_('Interval time'), // 間隔時間
		_('Survival time before bad files are cleaned up'), // 不良文件清理前的存活時間
		_('Idle time before becoming a bad document'), // 成為不良文件前的閒置時間
		_('Memory usage before becoming a bad document'), // 成為不良文件前的記憶體用量
		_('CPU usage before becoming a bad document'), // 成為不良文件前的 CPU 使用率

		_('Document view settings'), // 文件檢視設定
		_('Browser dimming time'), // 瀏覽器調暗的時間
		_('Stop editing the dimming time'), // 停止編輯調暗的時間

		_('Log settings'), // 日誌設定
		_('Color'), // 彩色
		_('Enable client console output'), // 啟用客戶端的 console 輸出
		_('Output messages from LOKit'), // 輸出來自 LOKit 的訊息
		_('Usage notes'), // 使用說明
		_('Log level'), // 紀錄層級
		_('None'), // 無
		_('Fatal'), // 致命
		_('Critical'), // 嚴重
		_('Error'), // 錯誤
		_('Warning'), // 警告
		_('Notice'), // 通知
		_('Information'), // 訊息
		_('Debug'), // 除錯
		_('Trace'), // 追蹤
		_('Write to file (after enabling, the following settings will be effective)'), // 寫入檔案（啟用後，以下設定才會有作用）
		_('Full path and file name'), // 完整路徑和檔名
		_('Backup cycle'), // 備份週期
		_('Every day'), // 每天
		_('Weekly'), // 每週
		_('10 Days'), // 10 天
		_('Monthly'), // 每個月
		_('The identifying name of the backup log'), // 備份日誌的識別名稱
		_('Log file name + date and time'), // 日誌檔名+日期時間
		_('Log file name + serial number'), // 日誌檔名+流水號
		_('Compress backup log files'), // 壓縮備份日誌
		_('Log file retention period'), // 日誌檔保留期限
		_('1 Week'), // 一週
		_('1 Month'), // 一個月
		_('Number of log files retained'), // 日誌檔保留數量
		_('Organize log files when the server starts'), // 伺服器啟動時整理日誌檔
		_('Write files directly without buffering'), // 直接寫入檔案，不緩衝

		_('Network settings'), // 網路設定
		_('Protocol'), // 協定
		_('IPv4'), // IPv4
		_('IPv6'), // IPv6
		_('IPv4 and IPv6'), // IPv4 和 IPv6
		_('Listen address'), // 連線位址
		_('Any addresses'), // 任何位址
		_('Only this host(loopback)'), // 只有本機(loopback)
		_('Connection timeout seconds'), // 連線逾時秒數
		_('Prefix path'), // 前綴路徑
		_('Proxy prefix'), // 前綴代理
		_('Allow embedded in iframe hosts'), // 允許嵌入 iframe 的主機
		_('Allow HTTP POST hosts'), // 允許 HTTP POST 的來源

		_('SSL settings'), // SSL 設定
		_('Enable SSL'), // 啟用 SSL
		_('Connection via proxy'), // 使用 https 代理
		_('Certificate file path'), // 數位憑證檔案位置
		_('Private key file path'), // 私鑰檔案位置
		_('CA file path'), // CA 憑證檔案位置
		_('Cipher list'), // 加密演算法清單

		_('Backend storage settings'), // 檔案儲存設定
		_('Host file system'), // 主機檔案系統
		_('Allow WOPI storage'), // 允許來自 WOPI 主機
		_('Max file size'), // 最大文件大小
		_('Pass cookie'), // 傳遞 cookie
		_('Allow WebDAV storage'), // 允許 WebDAV

		_('Watermark settings'), // 浮水印設定
		_('Enable watermark'), // 啟用浮水印
		_('Opacity'), // 不透明度
		_('Angle'), // 角度
		_('Text'), // 文字
		_('Font'), // 字型名稱
		_('Color'), // 顏色

		_('Update system configuration'), // 更新系統配置

		_('Source'), // 來源
		_('Description'), // 說明
		_('Must specify allow or deny'), // 必須指明允許或拒絕
		_('Source must be entered'), // 來源必須輸入

	],

	setConfig: function (settings) {
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

		// 設定輸入來源和說明欄位的 placeholder
		$('#host-value').attr('placeholder', _('Source'));
		$('#host-desc').attr('placeholder', _('Description'));

		// 要求命令格式為 :
		// getConfig <id1> [id2] [id3] ...
		var cmd = 'getConfig';
		var elements = document.querySelectorAll('#mainform input, select, textarea, .host-list ,.form-text')
		elements.forEach(function(item) {
			if (item.id !== undefined) {
				cmd += ' ' + item.id;
			} else {
				console.log('沒有指定 id', item);
			}
		});
		// 向 Server 要求這些 id 代表的資料
		this.socket.send(cmd);

		// 更新設定按鈕
		$('#saveConfig').click(function() {
			this.saveConfig();
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
					console.debug('"' + key + '\" : xml 中，無此 key 請檢查！')
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
			this.showToast({
				title: _('Settings updated successfully'),
				message: _('These settings will take effect after restarting the service.')
			});
		}
		else if (textMsg == 'setConfigNothing')
		{
			this.showToast({
				title: _('Setting update failed'),
				message: _('Please check if there is any problem with the set data.'),
				alert: true
			});
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
	 * 顯示吐司
	 * @param {object} object
	 */
	showToast: function(object) {
		var messageBox = document.getElementById('messageBox');
		document.getElementById('messageTitle').innerHTML = object.title;
		document.getElementById('messageBody').innerHTML = object.message;

		messageBox.classList.remove('bg-success', 'bg-warning');
		if (object.alert === true) {
			messageBox.classList.add('bg-warning');
		} else {
			messageBox.classList.add('bg-success');
		}

		$('#messageBox').toast({
			animation: true, // 使用動畫
			autohide: true, // 自動隱藏
			delay: 10000, // 10 秒
		}).toast('show');
	},

	/**
	 * 把來源資訊放到 key 所在的 html 容器內
	 * @param {string} key - elemeny id.
	 * @param {array} aHosts - 含有主機資料的物件陣列，物件成員:{value:'來源', 'desc': '描述'[, allow:boolean]}
	 */
	_makeHostList: function(key, aHosts) {
		var container = document.getElementById(key);
		if (container === null) {
			console.log('_makeHostList() 找不到 element id 為 ' + key + ' 的容器');
			return;
		}
		// 如果容器沒有 list-group class 的話，加進去
		if (!container.classList.contains('list-group')) {
			container.classList.add('list-group');
		}
		container.innerHTML = ''; // 清空所有內容
		container.innerText = ''; // 清空所有內容

		aHosts.forEach(function(item) {
			container.appendChild(this._createListItem(item));
		}.bind(this));

		// 製作新增來源按鈕
		var button = document.createElement('button');
		button.className = 'btn btn-primary btn-sm mt-2';
		button.innerHTML = '<i class="bi bi-plus me-2"></i>' + _('Add source');
		button.type = 'button';
		button.onclick = function() {
			this._addSource(container);
		}.bind(this);
		container.parentElement.appendChild(button);
	},

	/**
	 * 建立一條主機資料的 list-item dom element(含主機資料 dom 和下拉選單 dom)
	 *
	 * @param {object} item - {desc:'描述', value:'來源資料'[, allow: boolean(allow/deny)]}
	 * @returns dom element
	 */
	_createListItem: function(item) {
		var listItem = document.createElement('div');
		listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';

		listItem.appendChild(this._createHostData(item));
		listItem.appendChild(this._createHostDropdownMenu());

		return listItem;
	},

	/**
	 * 建立主機資料的 dom element
	 * @param {object} item - 同 _createListItem;
	 * @returns dom element
	 */
	_createHostData: function(item) {
		var dataContainer = document.createElement('div'); // 容器
		dataContainer.className = 'host-data';

		var hostData = document.createElement('div');
		dataContainer.append(hostData);
		var hostAllow = this._createAllowDenyBadge(item.allow);
		if (hostAllow) {
			hostData.appendChild(hostAllow);
		}
		var hostValue = document.createElement('span');
		hostValue.className = 'host-value';
		hostValue.innerText = item.value;
		hostData.appendChild(hostValue);

		var descText = document.createElement('div');
		descText.className = 'form-text mt-0 host-desc';
		descText.innerText = item.desc;
		dataContainer.appendChild(descText);

		return dataContainer;
	},

	/**
	 *
	 * @param {boolean} allow - 依據 true 或 false 傳回內容是允許連線或拒絕連線的標籤
	 * @returns span element
	 */
	_createAllowDenyBadge: function(allow) {
		var badge = document.createElement('span');
		badge.className = 'badge rounded-pill me-2 host-allow';
		if (allow === true) {
			badge.classList.add('bg-success');
			badge.setAttribute('allow', true); // 設定 attrib allow="true"
			badge.innerText = _('Allow connect');
		} else if (allow === false) {
			badge.classList.add('bg-danger');
			badge.setAttribute('allow', false); // 設定 attrib allow="false"
			badge.innerText = _('Deny connect');
		} else {
			badge = null
		}
		return badge;
	},

	_createHostDropdownMenu: function() {
		var dropdown = document.createElement('div');
		dropdown.className = 'dropdown dropstart';

		var button = document.createElement('button');
		button.className = 'btn btn-secondary btn-sm dropdown-toggle';
		button.type = 'button';
		button.setAttribute('data-bs-toggle', 'dropdown');
		dropdown.appendChild(button);

		var ul = document.createElement('ul');
		ul.className = 'dropdown-menu';
		ul.style.minWidth = '1rem';
		dropdown.appendChild(ul);

		var editButton = document.createElement('button');
		editButton.className = 'dropdown-item';
		editButton.type = 'button';
		editButton.innerHTML = '<i class="bi bi-pencil me-1"></i>' + _('Edit');
		editButton.onclick = function() {
			this._getHostItem(dropdown.parentNode).edit();
		}.bind(this);
		ul.appendChild(editButton);

		var deleteButton = document.createElement('button');
		deleteButton.className = 'dropdown-item';
		deleteButton.type = 'button';
		deleteButton.innerHTML = '<i class="bi bi-trash me-1"></i>' + _('Delete');
		deleteButton.onclick = function() {
			this._getHostItem(dropdown.parentNode).remove();
		}.bind(this);
		ul.appendChild(deleteButton);

		return dropdown;
	},

	/**
	 * 解析 listItemElement 轉成 json 資料
	 * @param {dom element} listItemElement - 含有主機列表項目的 dom element
	 * @returns object 操作 host-list item 的 class
	 */
	_getHostItem: function(listItemElement) {
		var that = this;
		if (!listItemElement.classList.contains('list-group-item')) {
			return null;
		}

		return {
			_self: listItemElement, // 自己
			/**
			 * 從頁面取得 host 資料
			 */
			getData: function() {
				var data = {};
				var hostData = this._self.childNodes[0].querySelectorAll('.host-value, .host-desc, .host-allow');
				hostData.forEach(function(element) {
					if (element.classList.contains('host-value')) {
						data.value = element.innerText;
					} else if (element.classList.contains('host-desc')) {
						data.desc = element.innerText;
					} else if (element.classList.contains('host-allow')) {
						data.allow = element.getAttribute('allow') === 'true';
					}
				});
				return data;
			},
			/**
			 * 更新自己資料(頁面會更動)
			 * @param {object} data
			 */
			setData: function(data) {
				var hostData = this._self.childNodes[0].querySelectorAll('.host-value, .host-desc, .host-allow');
				hostData.forEach(function(element) {
					if (element.classList.contains('host-value')) {
						element.innerText = data.value;
					} else if (element.classList.contains('host-desc')) {
						element.innerText = data.desc;
					} else if (element.classList.contains('host-allow')) {
						element.setAttribute('allow', data.allow);
						if (data.allow) {
							element.classList.remove('bg-danger');
							element.classList.add('bg-success');
							element.innerText = _('Allow connect');
						} else {
							element.classList.remove('bg-success');
							element.classList.add('bg-danger');
							element.innerText = _('Deny connect');
						}
					}
				});
			},
			/**
			 * 編輯自己的資料，會呼叫編輯 Dialog
			 */
			edit: function() {
				// 開啟編輯視窗
				that._executeEditForm({
					title: _('Edit source'), // dialog title
					data: this.getData(),
					OK: function(newData) {
						this.setData(newData);
					}.bind(this)
				});
			},
			/**
			 * 把自己從頁面移除
			 */
			remove: function() {
				// 開啟編輯視窗
				that._executeEditForm({
					title: '<span class="text-danger">' + _('Delete source') + '</span>', // dialog title
					readOnly: true, // 唯讀，不能編輯
					data: this.getData(),
					OK: function(/*newData*/) {
						this._self.remove();
					}.bind(this)
				});
			}
		};
	},

	_addSource: function(container) {
		var that = this;
		if (container) {
			var emptyData = {value: '', desc: ''};
			// 如果該類 host 是有 allow property 就把 allow 加入到 emptyData
			if (container.classList.contains('allow-property')) {
				emptyData.allow = null; // 表示未定
			}

			// 開啟編輯視窗
			this._executeEditForm({
				title: _('Add source'), // dialog title
				data: emptyData, // 空資料
				OK: function(data) {
					container.appendChild(that._createListItem(data));
				}
			});
		}
	},

	/**
	 *
	 * @param {*} data
	 * @param {function} callback - 按下確定後回呼的 function
	 */
	_executeEditForm: function(obj) {
		var editDialog = new bootstrap.Modal(document.getElementById('editSourceDialog'));
		var editForm = document.getElementById('editForm'); // form element
		var allowRadio = document.getElementById('hasAllow'); // 連線選擇區
		var hostAllow = document.getElementById('host-allow'); // 允許連線 radio button
		var hostDeny = document.getElementById('host-deny'); // 拒絕連線 radio button
		var sourceField = document.getElementById('sourceField'); // 來源輸入區
		var hostValue = document.getElementById('host-value'); // 來源輸入欄位
		var hostDesc = document.getElementById('host-desc'); // 說明輸入欄位
		//var cancelButton = document.getElementById('editFormCancel'); // 取消按鈕
		var OKButton = document.getElementById('editFormOK'); // 確定按鈕

		editForm.className = 'needs-validation'; // 需要輸入檢查
		document.getElementById('hostEditTitle').innerHTML = obj.title; // Dialog title

		hostValue.value = obj.data.value;
		hostDesc.value = obj.data.desc;

		// 不勾選任何連線
		hostAllow.checked = false;
		hostDeny.checked = false;
		// 未定義 allow 就不顯示勾選連線選擇區
		if (obj.data.allow === undefined) {
			allowRadio.style.display = 'none';
			sourceField.className = 'col-md-12';
			hostAllow.required = false;
			hostDeny.required = false;
		} else {
			allowRadio.style.display = 'initial';
			sourceField.className = 'col-md-8';
			hostAllow.required = true;
			hostDeny.required = true;
			if (obj.data.allow === true) {
				hostAllow.checked = true;
			} else if (obj.data.allow === false) {
				hostDeny.checked = true;
			}
		}

		if (obj.readOnly === true) {
			hostAllow.disabled = true;
			hostDeny.disabled = true;
			hostValue.readOnly = true;
			hostDesc.readOnly = true;
		} else {
			hostAllow.disabled = false;
			hostDeny.disabled = false;
			hostValue.readOnly = false;
			hostDesc.readOnly = false;
		}

		// 按下確定按鈕
		OKButton.onclick = function(e) {
			// 檢查資料
			if (obj.readOnly === true || editForm.checkValidity()) {
				var data = {
					value: document.getElementById('host-value').value.trim(),
					desc: document.getElementById('host-desc').value.trim()
				};

				if (obj.data.allow !== undefined) {
					var allow = document.querySelectorAll('[name="allow-deny"]:checked');
					if (allow.length === 1) {
						data.allow = (allow[0].value === 'allow');
					}
				}

				editDialog.hide(); // 關閉 dialog
				// 有指定 OK callback 把 data 傳過去
				if (typeof obj.OK === 'function') {
					obj.OK(data);
				}
			} else {
				e.preventDefault();
				e.stopPropagation();
			}
			// 顯示檢查結果
			editForm.classList.add('was-validated');
		};

		editDialog.show(); // 顯示 Dialog
	}
});

Admin.ConfigSettings = function(host)
{
	return new AdminSocketConfigSettings(host);
};

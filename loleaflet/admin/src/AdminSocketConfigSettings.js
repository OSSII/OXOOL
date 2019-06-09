/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the config settings in Admin console
*/
/* global $ vex AdminSocketBase Admin */
function editHost(obj)
{
	var input = [];

	input.push('連線來源：<input type="text" name="source" value="' + obj.source + '" required />');
	if (obj.hasAllow)
	{
		input.push('<input type="radio" name="allow_deny" value="allow" ' + (obj.allow ? 'checked' : '') + '> 接受連線' +
				'&nbsp;&nbsp;&nbsp;&nbsp;<input type="radio" name="allow_deny" value="deny" ' + (obj.allow ? '' : 'checked') + '> 拒絕連線');
	}

	vex.dialog.open({
		message: (obj.isNew ? '新增連線來源' : '編輯連線來源'),
		input: input.join(''),
		buttons: [
			$.extend({}, vex.dialog.buttons.YES, { text: '確定' }),
			$.extend({}, vex.dialog.buttons.NO, { text: '離開' })
		],
		callback: function (data)
		{
			if (data)
			{
				// 新增來源
				if (obj.isNew)
				{
					newHost(obj.key, data.source, (obj.hasAllow ? (data.allow_deny == 'allow'): ''), obj.containerId);
				}
				else // 修改來源
				{
					obj.item.text(data.source);
					if (obj.hasAllow)
					{
						obj.item.allowDeny.removeClass();
						if ((data.allow_deny == 'allow'))
						{
							obj.item.attr('allow', true);
							obj.item.allowDeny.text('接受連線')
							obj.item.allowDeny.addClass('badge alert-success');
						}
						else
						{
							obj.item.attr('allow', false);
							obj.item.allowDeny.text('拒絕連線')
							obj.item.allowDeny.addClass('badge alert-warning');
						}
					}
				}
			}
		}
	})
}

// 新增來源
// 
function addItem(key, containerId, hasAllow)
{
	var obj = {isNew: true,
				key: key,
				containerId: containerId,
				source: '',
				hasAllow: hasAllow};

	if (hasAllow) // 需要有接受/拒絕連線選項
	{
		obj.allow = true;	// 預設為接受連線
	}
	editHost(obj);
}

// 編輯來源
function editItem(key, containerId, item)
{
	var obj = {isNew: false,
				key: key,
				containerId: containerId,
				source: item.text(),
				item: item};

	if (typeof item.attr('allow') != 'undefined')
	{
		obj.hasAllow = true;
		obj.allow = (item.attr('allow') == 'true');
	}
	else
	{
		obj.hasAllow = false;
	}
	editHost(obj);
}

function removeItem(groupItem, item)
{
	vex.dialog.confirm({
		message: '刪除 -> ' + item.text(),
		buttons: [
			$.extend({}, vex.dialog.buttons.YES, { text: '確定' }),
			$.extend({}, vex.dialog.buttons.NO, { text: '離開' })
		],
		callback: function(value) {
			if (value) {
				groupItem.remove();
			}
		}
	});
}

function newHost(key, value, isAllow, containerId)
{
	// 來源資訊條目
	var $listGroupItem = $(document.createElement('a'))
				.addClass('list-group-item');
	var $newHost = $(document.createElement('label'))
				.addClass(key + '[]')
				.text(value);
				
	// 下拉選單
	var $menu = $(document.createElement('div'))
				.addClass('dropdown pull-right');
	var $menuBtn = $(document.createElement('button'))
				.addClass('btn btn-xs btn-default dropdown-toggle')
				.attr('type', 'button').attr('data-toggle', 'dropdown')
				.attr('aria-haspopup', true).attr('aria-expanded', false)
				.append('&nbsp;<span class="caret"></span>&nbsp;');
				//.click(function () {alert($newHost.attr('allow'))});
	var $dropdown = $(document.createElement('ul'))
				.addClass('dropdown-menu');
	var $editItem = $(document.createElement('li'))
				.append('<a>編輯</a>')
				.click(function () {editItem(key, containerId, $newHost)});
	var $removeItem = $(document.createElement('li'))
				.append('<a>移除</a>')
				.click(function () {removeItem($listGroupItem, $newHost)});
	$dropdown.append($editItem).append($removeItem);
	$menu.append($menuBtn).append($dropdown);
	$listGroupItem.append($newHost).append($menu);

	if (typeof isAllow == 'boolean')
	{
		var $allow = $(document.createElement('span'))
					.addClass('badge ' + (isAllow ? 'alert-success' : 'alert-warning'))
					.text(isAllow ? '接受連線' : '拒絕連線');
		$newHost.attr('allow', isAllow);
		$newHost.allowDeny = $allow;
		$listGroupItem.append($allow);
	}
	$('#' + containerId).append($listGroupItem);
}

function addHosts(key, hosts, containerId)
{
	for (var j = 0 ; j < hosts.length ; j++)
	{
		newHost(key, hosts[j].value, hosts[j].allow, containerId);
	}
}

var AdminSocketConfigSettings = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	setConfig: function (settings) {
		this.socket.send('setConfig ' + settings);
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		var form = $('#mainform input, select, textarea');
		var cmd = 'getConfig';
		for (var i= 0 ; i < form.length ; i++)
		{
			cmd += ' ' + form[i].id;
		}
		this.socket.send(cmd);
	},

	onSocketMessage: function(e) {
		//console.log(e.data);
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
				if (json[key] === null) continue; // null : 表示 xml 中找不到對應的 key

				if (key == 'net.post_allow.host' ||
					key == 'storage.wopi.host' ||
					key == 'storage.webdav.host')
				{
					var hosts = json[key];

					if (hosts.length > 0)
					{
						switch (key)
						{
						case 'net.post_allow.host':
							addHosts(key, hosts, 'post_allow_hostlist');
							$('#post_allow_hostAdd').click(function() {addItem(key, 'post_allow_hostlist', false);});
							break;
						case 'storage.wopi.host':
							addHosts(key, hosts, 'wopi_hostlist');
							$('#wopi_hostAdd').click(function() {addItem(key, 'wopi_hostlist', true);});
							break;
						case 'storage.webdav.host':
							addHosts(key, hosts, 'webdav_hostlist');
							$('#webdav_hostAdd').click(function() {addItem(key, 'webdav_hostlist', true);});
							break;
						}
					}
					continue;
				}

				var input = document.getElementById(key);
				if (input)
				{
					switch (input.type)
					{
					case 'text':
					case 'textarea':
					case 'number':
					case 'hidden':
						input.value = json[key];
						break;
					case 'checkbox':
					case 'radio':
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
						input.value = json[key];
						//console.log('未知的 input type -> ' + input.type);
						//console.log(input);
						break;
					}
				}
			}
		}
		else if (textMsg == 'setConfigOk')	// 設定更新成功
		{
			vex.dialog.alert('<p>設定更新成功</p><p>這些設定，會在下次啟動服務後生效</p>');
		}
		else if (textMsg == 'setConfigNothing')
		{
			vex.dialog.alert('設定未更新！');
		}
		$('#saveConfig').attr('disabled', false);
	},

	onSocketClose: function()
	{

	}
});

Admin.ConfigSettings = function(host)
{
	return new AdminSocketConfigSettings(host);
};

/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the permission settings in Admin console
*/
/* global editMode $ vex AdminSocketBase Admin */
function addNewEntry(key, containerId)
{
	var input = [];
	input.push('功能名稱：<input type="text" class="form-control" name="value" value="" required />');
	input.push('<input type="checkbox" id="_edit" name="edit" value="true" checked><label for="_edit"> Edit </label>');
	input.push('&nbsp;&nbsp;&nbsp;&nbsp;<input type="checkbox" id="_view" name="view" value="true"><label for="_view"> View </label>');
	input.push('&nbsp;&nbsp;&nbsp;&nbsp;<input type="checkbox" id="_readonly" name="readonly" value="true"><label for="_readonly"> Readonly </label>');
	input.push('<br>說明：<input type="text" class="form-control" name="desc" value="">');
	vex.dialog.open({
		message: ('新增選單項目'),
		input: input.join(''),
		buttons: [
			$.extend({}, vex.dialog.buttons.YES, { text: '確定' }),
			$.extend({}, vex.dialog.buttons.NO, { text: '離開' })
		],
		callback: function (data)
		{
			if (data)
			{
				var rows = $(document.getElementById(containerId).getElementsByTagName('tr'));
				var idx = rows.length;
				var item = {};
				item.value = data.value;
				item.desc = data.desc;
				item.edit = (typeof data.edit === 'undefined' ? false : true);
				item.view = (typeof data.view === 'undefined' ? false : true);
				item.readonly = (typeof data.readonly === 'undefined' ? false : true);
				var $row = newRow(key, idx, item);
				$('#' + containerId).append($row);
			}
		}
	});
}

function newRow(key, idx, item)
{
	var $idPrefix = key + '[' + idx + ']';
	var $idValue = $idPrefix + '.value';
	var $idEdit = $idPrefix + '.edit';
	var $editChk = (item.edit ? 'checked' : '');
	var $idView = $idPrefix + '.view';
	var $viewChk = (item.view ? 'checked' : '');
	var $idReadonly = $idPrefix + '.readonly';
	var $readonlyChk = (item.readonly ? 'checked' : '');
	var $idDesc = $idPrefix + '.desc';
	var $canEdit = (editMode ? '' : 'readonly');
	var $tr = $(document.createElement('tr')).attr('id', $idPrefix);
	var $value = $(document.createElement('td'))
		.append('<input type="text" class="form-control" id="'+ $idValue +'" value="' + item.value + '"' + $canEdit + '>');
	var $edit = $(document.createElement('td')).addClass('material-switch')
		.append('<input type="checkbox" class="form-control" id="'+ $idEdit +'" ' + $editChk+ '>' +
				'<label for="'+ $idEdit +'" class="label-success"></label>');
	var $view = $(document.createElement('td')).addClass('material-switch')
		.append('<input type="checkbox" class="form-control" id="'+ $idView +'" ' + $viewChk+ '>' + 
				'<label for="'+ $idView +'" class="label-success"></label>');
	var $readonly = $(document.createElement('td')).addClass('material-switch')
		.append('<input type="checkbox" class="form-control" id="'+ $idReadonly +'" ' + $readonlyChk+ '>' + 
				'<label for="'+ $idReadonly +'" class="label-success"></label>');
	var $desc = $(document.createElement('td'))
		.append('<input type="text" class="form-control" id="'+ $idDesc +'" value="' + item.desc + '">');
	
	$tr.append($value).append($edit);
	if (key != 'toolbar.showfor')
	{
		$tr.append($view).append($readonly);
	}
	$tr.append($desc);

	return $tr;
}

function addShowforTable(key, showfor, containerId)
{
	var body = $('#' + containerId);
	if (!body) return;

	for (var j = 0 ; j < showfor.length ; j++)
	{
		var $row = newRow(key, j, showfor[j]);
		body.append($row);
	}
}

var AdminSocketPermissionSettings = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	setPermission: function(settings)
	{
		this.socket.send('setPermission ' + settings);
		console.log(settings);
	},

	getArray: function(key, containerId)
	{
		var rows = $(document.getElementById(containerId).getElementsByTagName('tr'));
		if (!rows) return null;

		var i;
		var arr = [];
		for (i=0 ; i < rows.length ; i++)
		{
			var rowId = rows[i].id;
			var item  = {
				value : document.getElementById(rowId + '.value').value,
				edit : document.getElementById(rowId + '.edit').checked,
				desc :document.getElementById(rowId + '.desc').value
			}
			if (key != 'toolbar.showfor')
			{
				item.view = document.getElementById(rowId + '.view').checked;
				item.readonly = document.getElementById(rowId + '.readonly').checked;
			}
			arr.push(item);
		}
		return arr;
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		var form = $('#mainform input, select, textarea');
		var cmd = 'getPermission';
		for (var i= 0 ; i < form.length ; i++)
		{
			cmd += ' ' + form[i].id;
		}
		this.socket.send(cmd);
	},

	onSocketMessage: function(e) {
		var textMsg;
		console.log(e.data);
		if (typeof e.data === 'string')
		{
			textMsg = e.data;
		}
		else
		{
			textMsg = '';
		}

		if (textMsg.startsWith('settings'))
		{
			var json = JSON.parse(textMsg.substring(textMsg.indexOf('{')));
			for (var key in json)
			{
				if (json[key] === null) continue; // null : 表示 xml 中找不到對應的 key

				if (key == 'text.showfor' || // 文字文件選單
					key == 'spreadsheet.showfor' || // 試算表文件選單
					key == 'presentation.showfor' || // // 簡報文件選單
					key == 'toolbar.showfor') // 工具列
				{
					var showfor= json[key];
					switch (key)
					{
					case 'text.showfor':
						addShowforTable(key, showfor, 'text_showfor_list');
						$('#text_showfor_add').click(function () {addNewEntry('text.showfor', 'text_showfor_list')});
						break;
					case 'spreadsheet.showfor':
						addShowforTable(key, showfor, 'spreadsheet_showfor_list');
						$('#spreadsheet_showfor_add').click(function () {addNewEntry('spreadsheet.showfor', 'spreadsheet_showfor_list')});
						break;
					case 'presentation.showfor':
						addShowforTable(key, showfor, 'presentation_showfor_list');
						$('#presentation_showfor_add').click(function () {addNewEntry('presentation.showfor', 'presentation_showfor_list')});
						break;
					case 'toolbar.showfor':
						addShowforTable(key, showfor, 'toolbar_showfor_list');
						$('#toolbar_showfor_add').click(function () {addNewEntry('toolbar.showfor', 'toolbar_showfor_list')});
						break;
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
		else if (textMsg == 'setPermissionOk')	// 設定更新成功
		{
			vex.dialog.alert('<p>界面設定更新成功</p>');
		}
		else if (textMsg == 'setPermissionNothing')
		{
			vex.dialog.alert('界面設定未更新！');
		}
		$('#saveConfig').attr('disabled', false);
	},

	onSocketClose: function()
	{

	}
});

Admin.PermissionSettings = function(host)
{
	return new AdminSocketPermissionSettings(host);
};

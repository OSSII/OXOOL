/* -*- js-indent-level: 8 -*- */
/* global $ AdminSocketBase Admin */
var AdminSocketLicense = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},


	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		this.socket.send('get_license_info');

		//初始化畫面的按鈕事件
		$('#get_signature').click(function()
			{
			window.licenseSocket.socket.send('get_signature');
		});
		$('#send_authorize').click(function()
			{
			var authorizeFile = $('input[id=authorize_file]')[0].files[0];
			var reader = new FileReader();
			reader.onload = function(e)
				{
				var command = 'send_authorize ';
				command = command + btoa(e.target.result);
				window.licenseSocket.socket.send(command);
			};
			reader.readAsBinaryString(authorizeFile);
		});
	},

	onSocketMessage: function(e) {
		var textMsg;
		if (typeof e.data === 'string') {
			textMsg = e.data;
		}
		else {
			textMsg = '';
		}

		if (textMsg.startsWith('get_license_info ')) {
			var licenseData = textMsg.split('get_license_info')[1];
			if (licenseData == 'false') {
				$('#product_info_list').append('<p>產品未啟動</p>');
				return;
			}

			licenseData = JSON.parse(licenseData);
			$('#product_info_list').append('<li>授權編號：' + licenseData['custno'].replace(' ', '') + '</li>');
			$('#product_info_list').append('<li>授權對象：' + licenseData['custname'] +'</li>');
			$('#product_info_list').append('<li>有效期限：' + licenseData['expiredate'] +' </li>');
			for (var key in licenseData['productlist']) {
				var rootItem = document.createElement('li');
				rootItem.textContent = key;
				var secondroot = document.createElement('ul');
				for (var dkey in licenseData['productlist'][key]) {
					var infoItem = document.createElement('li');
					infoItem.textContent = dkey + ':' + licenseData['productlist'][key][dkey];
					secondroot.appendChild(infoItem);
				}
				rootItem.append(secondroot);
				$('#product_info_list').append(rootItem);
			}

		}
		else if (textMsg.startsWith('get_signature '))
		{
			var fileName = 'signature';
			var a = document.createElement('a');
			document.body.appendChild(a);
			a.style = 'display: none';

			var data = textMsg.split(' ')[1];
			data = window.atob(data);
			var byteNumbers = new Array(data.length);
			for (var idx = 0; idx < data.length; idx ++) {
				byteNumbers[idx] = data.charCodeAt(idx);
			}
			var mimetype = {type: 'application/octet-binary'};
			var byteArray = new window.Uint8Array(byteNumbers);
			var blob = new Blob([byteArray], mimetype);
			a.href = window.URL.createObjectURL(blob);
			a.download = fileName;
			a.click();
			window.URL.revokeObjectURL(a.href);
		}
		else if (textMsg.startsWith('authorize_result '))
		{
			var result = JSON.parse(textMsg.split(' ')[1]);
			if (result)
				window.alert('授權成功');
			else
				window.alert('授權失敗');
		}
	},

	onSocketClose: function()
	{
		console.log('Close AdminSocketLicense');
	}
});

Admin.License = function(host)
{
	return new AdminSocketLicense(host);
};

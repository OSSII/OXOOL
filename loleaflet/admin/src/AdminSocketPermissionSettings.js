/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the permission settings in Admin console
*/
/* global $ AdminSocketBase Admin */
var AdminSocketPermissionSettings = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
		var form = $('#mainform input, select, textarea');
		console.log(form);
		var cmd = 'getPermission';
		for (var i= 0 ; i < form.length ; i++)
		{
			cmd += ' ' + form[i].id;
		}
		console.log(cmd);
		this.socket.send(cmd);
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
		console.log(textMsg);
	},

	onSocketClose: function()
	{

	}
});

Admin.PermissionSettings = function(host)
{
	return new AdminSocketPermissionSettings(host);
};

/* -*- js-indent-level: 8 -*- */
/*
	View logs in the admin console.
*/
/* global AdminSocketBase Admin */
var AdminSocketViewLog = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
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

Admin.VideLog = function(host)
{
	return new AdminSocketViewLog(host);
};

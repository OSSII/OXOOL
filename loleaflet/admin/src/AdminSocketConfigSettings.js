/* -*- js-indent-level: 8 -*- */
/*
	Socket to be intialized on opening the history page in Admin console
*/
/* global AdminSocketBase Admin */
var AdminSocketConfigSettings = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);
	},

	onSocketMessage: function(e) {
		console.log(e.data);
	},

	onSocketClose: function() {

	}
});

Admin.ConfigSettings = function(host) {
	return new AdminSocketConfigSettings(host);
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.DownloadAs
 * 下載為
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
L.dialog.DownloadAs = {
	// init 只會在載入的第一次執行
	init: function(map) {
		this._map = map;
	},

	// 每次都會從這裡開始
	run: function(params) {
		var args = params.args;
		if (args === undefined)
			return;

		var fileName = this._map.getDocName();
		this._map.downloadAs(fileName + '.' + args.ext, args.ext);
	},
};

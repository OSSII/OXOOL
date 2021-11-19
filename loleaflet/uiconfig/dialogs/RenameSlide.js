/* -*- js-indent-level: 8 -*- */
/**
 * L.dialog.RenameSlide
 * Calc: 更改投影片名稱
 *
 * @author: Firefly <firefly@ossii.com.tw>
 */
/* global _ _UNO */
L.dialog.RenameSlide = {
	initialize: function() {
		// Do nothing.
	},

	run: function(/*parameter*/) {
		var map = this._map;
		var partsInfo = map._docLayer._partsInfo;
		var currPart = map.getCurrentPartNumber();
		var slideName = partsInfo[currPart].name;
		L.dialog.prompt({
			title: _UNO('.uno:RenameSlide', 'presentation', true),
			icon: 'question',
			message: _('Name'),
			default: slideName,
			callback: function(data) {
				// 有輸入資料
				if (data !== null) {
					var error = false;
					data = data.trim(); // 去掉頭尾空白
					if (data === '') {
						error = true;
					} else {
						// 檢查名稱是否重複
						for (var i = 0 ; i < partsInfo.length ; i++) {
							// 有重複就結束
							if (i !== currPart && partsInfo[i].name === data) {
								error = true;
								break;
							}
						}
					}
					// 錯誤提示
					if (error) {
						L.dialog.alert({
							icon: 'error',
							message: _('The slide name must not be empty or a duplicate of an existing name.')
						});
					} else {
						map.renamePage(data);
					}
				}
			}
		});
	},
}

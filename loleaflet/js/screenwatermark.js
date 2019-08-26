/* -*- js-indent-level: 8 -*- */
/*
 * LibreOffice Online toolbar
 */
/* global $ L screenWatermark*/
(function(global) {

	var map;
	var openDate = new Date().toLocaleString();
	var innerBoxes = ['username', 'date', 'ip'];
	/*var infoBoxes = {
		username: '',
		date: new Date().toLocaleString(),
		ip: ''};*/
	var boxes = {
		topLeft : null,
		topRight: null,
		middleCenter: null,
		bottomLeft: null,
		bottomRight: null
	};

	function getBoxText(name) {
		var viewId = map._docLayer._viewId;
		if (viewId === undefined) {
			return 'screen watermark';
		}

		var viewInfo = map._viewInfo[viewId];
		var retString = 'unknow tag name : ' + name;
		switch (name) {
		case 'username':
			retString = viewInfo.username;
			break;
		case 'date':
			retString = openDate;
			break;
		case 'ip':
			retString = 'IP : ' + (viewInfo.userextrainfo.ip !== undefined ? viewInfo.userextrainfo.ip : 'UNKNOW');
			break;
		}

		return retString;
	}

	// 建立新的浮水印方塊
	function createBox(id) {
		var div = L.DomUtil.create('div', '');
		$(div).attr('id', id)
			.css('position', 'absolute')
			.css('pointer-events', 'none')
			.css('background', 'rgba(0,0,0,0)')
			.css('color', 'rgba(200,200,200,0.5)')
			.css('padding', 0)
			.css('margin', 0)
			.css('z-index', 10000)

		for (var i = 0 ; i < innerBoxes.length ; i++)
		{
			var item = L.DomUtil.create('div', '', div);
			$(item).attr('id', id + '_' + innerBoxes[i])
				.css('width', '100%')
				.css('height', '33%')
				.css('text-align', 'center')
				.css('padding', 0)
				.css('margin', 0)
				.css('pointer-events', 'none')
				.css('font-size', 'inherit')
				.css('white-space', 'nowrap')
				.html('');
		}
		return div;
	}

	function setupWatermark() {
		var width = $(map._container).width();
		var height = $(map._container).height();
		var boxW = Math.floor(width / 3); // 每個浮水印佔 1/3 寬度
		var boxH = Math.floor(height / 3);	// 每個浮水印佔 1/3 高度
		var lineHeight = Math.floor(boxH / 3);
		var fontSize = Math.floor(lineHeight / 2);
		var top, left;

		for (var key in boxes) {
			if (!boxes[key]) {
				boxes[key] = createBox('watermark_' + key);
				$(map._container).append(boxes[key]);
			}
			switch (key) {
			case 'topLeft':
				top = 0;
				left = 0;
				break;
			case 'topRight':
				top = 0;
				left = width - boxW;
				break;
			case 'middleCenter':
				top = boxH;
				left = boxW;
				break;
			case 'bottomLeft':
				top = height - boxH;
				left = 0;
				break;
			case 'bottomRight':
				top = height - boxH;
				left = width - boxW;
				break;
			default:
				console.log('unknow watermark id : ' + key);
				break;
			}
			$(boxes[key])
				.css('top', top)
				.css('left', left)
				.css('width', boxW)
				.css('height', boxH)
				.css('font-size', fontSize + 'px')
				.css('line-height', lineHeight  + 'px');
		}
	}

	function onDocLayerInit() {
		setupWatermark();
	}

	function setupScreenWatermark(e) {
		if (screenWatermark != 'true') return;
		map = e;
		map.on('doclayerinit', onDocLayerInit);
		map.on('resize', setupWatermark);
		map.on('addview', function(info) {
			var myId = map._docLayer._viewId;
			// 只顯示自己的資料
			if (info.viewId === myId)
			{
				for (var key in boxes) {
					var boxId = 'watermark_' + key;
					for (var i = 0 ; i < innerBoxes.length ; i++) {
						var lineId = boxId + '_' + innerBoxes[i];
						$('#' + lineId).html(getBoxText(innerBoxes[i]));
					}
				}
			}
		});
	}

	global.setupScreenWatermark = setupScreenWatermark;

}(window));

/* -*- js-indent-level: 8 -*- */
/*
 * L.dialog.Action
 * 依據 id，執行指定的小程式
 *
 * Author: Firefly <firefly@ossii.com.tw>
 */
/* global L _ vex revHistoryEnabled */
L.dialog.InsertImage = {
	$dialog: $(L.DomUtil.create('div', '', document.body)).uniqueId(),
	// init 只會在載入的第一次執行
	init: function (map) {
		this._map = map;

		this.$dialog.html(`
			<br>
			<input type="file" title="Choose a image" name="filename" class="hidden">
			<br>
			<br>
			<label>${_('Compress Image(not support SVG)')}: <input type="checkbox" name="compress" checked></label>
			`);


		this.$dialog.dialog({
			title: _('Insert Local Image'),
			closeText: _('Close'),
			position: { my: 'center', at: 'center', of: window },
			minWidth: 450,
			autoOpen: false, // 不自動顯示對話框
			modal: true,	// 獨占模式
			resizable: false, // 不能縮放視窗
			draggable: true, // 可以拖放視窗
			closeOnEscape: true, // 按 esc 視同關閉視窗
			open: function (/*event, ui*/) {
				// 預設選取第一個 button
			},
			buttons: [
				{
					text: _('OK'),
					click: function () {
						var compressRatio = 1, // 圖片壓縮比例
							imgNewWidth = 400, // 圖片新寬度
							img = new Image(),
							canvas = document.createElement('canvas'),
							context = canvas.getContext('2d'),
							fileReader, dataUrl;

						var file = $(this).find("input[type=file]")[0].files[0];
						if (!file) {
							$(this).dialog('close');
							return;
						}
						fileReader = new FileReader();
						fileReader.onload = getFileInfo;
						fileReader.readAsDataURL(file);
						var compressCheck = $(this).find("input[type=checkbox]")[0].checked;
						if (!compressCheck || file.type === 'image/svg+xml') {
							var reader = new FileReader();
							reader.readAsDataURL(file);
							reader.onloadend = function () {
								var base64data = reader.result.split(',')[1];
								map._socket.sendMessage(`insertpicture data=${base64data}`);
							}
							$(this).dialog('close');
							$(this).find("input[type=file]")[0].value='';
							return;
						}
						function getFileInfo(evt) {
							dataUrl = evt.target.result,
								img.src = dataUrl;
						}

						// 圖片載入後
						img.onload = function () {
							var width = this.width, // 圖片原始寬度
								height = this.height, // 圖片原始高度
								imgNewHeight = imgNewWidth * height / width;// 圖片新高度

							// 使用 canvas 調整圖片寬高
							canvas.width = imgNewWidth;
							canvas.height = imgNewHeight;
							context.clearRect(0, 0, imgNewWidth, imgNewHeight);

							// 調整圖片尺寸
							context.drawImage(img, 0, 0, imgNewWidth, imgNewHeight);

							// canvas 轉換為 blob 格式、上傳
							canvas.toBlob(function (blob) {
								var reader = new FileReader();
								reader.readAsDataURL(blob);
								reader.onloadend = function () {
									var base64data = reader.result.split(',')[1];
									map._socket.sendMessage(`insertpicture data=${base64data}`);
								}
							}, 'image/jpeg', compressRatio);
						}
						$(this).dialog('close');
						$(this).find("input[type=file]")[0].value='';
					}
				},
				{
					text: _('Cancel'),
					click: function () {
						$(this).dialog('close');
					}
				}
			]
		});
	},

	// 每次都會從這裡開始
	run: function () {
		this.$dialog.dialog('open');
	},
};
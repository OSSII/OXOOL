/*
 * Copyright the Collabora Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
declare var L: any;
declare var app: any;

namespace oxool {

export class ContentControlSection extends CanvasSectionObject {

	map: any;

	public onInitialize(): void {
		this.sectionProperties.polyAttri = {
			stroke: true,
			fill: false,
			pointerEvents: 'none',
			color: 'black',
			weight: 1,
		};

		this.sectionProperties.dropdownButton = L.marker(new L.LatLng(0, 0), {
			icon: L.divIcon({
				className: 'writer-drop-down-marker',
				iconSize: null
			}),
			interactive: true
		});

		this.onClickDropdown = this.onClickDropdown.bind(this);
		this.sectionProperties.dropdownButton.addEventListener('click', this.onClickDropdown, false);
		this.map.on('dropdownmarkertapped', this.onClickDropdown, this);
		this.map.on('darkmodechanged', this.changeBorderStyle, this);

		var container = L.DomUtil.createWithId('div', 'datepicker');
		container.style.zIndex = '12';
		container.style.position = 'absolute';
		document.getElementById('document-container').appendChild(container);
		this.sectionProperties.datePicker = false;
		this.sectionProperties.picturePicker = false;
	}

	constructor() {
		super({
			processingOrder: L.CSections.ContentControl.processingOrder,
			drawingOrder: L.CSections.ContentControl.drawingOrder,
			zIndex: L.CSections.ContentControl.zIndex,
			name: L.CSections.ContentControl.name,
			interactable: false,
			sectionProperties: {},
			position: [0, 0],
			size: [],
			expand: '',
			anchor: [],
		});

		this.myTopLeft = [0, 0];
		this.documentObject = true;
		this.map = L.Map.THIS;
		this.sectionProperties.json = null;
		this.sectionProperties.datePicker = null;
		this.sectionProperties.picturePicker = null;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public drawContentControl(json: any) {
		this.sectionProperties.json = json;
		this.sectionProperties.datePicker = false;
		this.sectionProperties.picturePicker = false;
		if (this.sectionProperties.dropdownButton)
			this.map.removeLayer(this.sectionProperties.dropdownButton);

		if (json.date) {
			this.sectionProperties.datePicker = true;
			$.datepicker.setDefaults($.datepicker.regional[(<any>window).langParamLocale.language]);
			$('#datepicker').datepicker({
				onSelect: function (date: any, datepicker: any) {
					if (date != '') {
						app.socket.sendMessage('contentcontrolevent type=date selected=' + date);
					}
				}
			});
			$('#datepicker').hide();
		} else {
			this.sectionProperties.datePicker = false;
			$('#datepicker').datepicker('destroy');
		}

		if (json.action === 'show')	{
			this.drawPolygon();
		} else if (json.action === 'hide') {
			if (this.sectionProperties.frame)
				this.sectionProperties.frame.setPointSet(new CPointSet());
		} else if (json.action === 'change-picture') {
			this.sectionProperties.picturePicker = true;
			if (!this.map.wopi.EnableInsertRemoteImage)
				L.DomUtil.get('insertgraphic').click();
			else
				this.map.fire('postMessage', {msgId: 'UI_InsertGraphic'});
		}

		this.setPositionAndSize();
		app.sectionContainer.requestReDraw();
	}

	private setPositionAndSize (): void {
		if (!this.sectionProperties.json || !this.sectionProperties.json.rectangles)
			return;

		var rectangles: Array<number>[] = this.getRectangles(this.sectionProperties.json.rectangles);

		var xMin: number = Infinity, yMin: number = Infinity, xMax: number = 0, yMax: number = 0;
		for (var i = 0; i < rectangles.length; i++) {
			if (rectangles[i][0] < xMin)
				xMin = rectangles[i][0];

			if (rectangles[i][1] < yMin)
				yMin = rectangles[i][1];

			if (rectangles[i][0] + rectangles[i][2] > xMax)
				xMax = rectangles[i][0] + rectangles[i][2];

			if (rectangles[i][1] + rectangles[i][3] > yMax)
				yMax = rectangles[i][1] + rectangles[i][3];
		}
		// Rectangles are in twips. Convert them to core pixels.
		var ratio: number = (app.tile.size.pixels[0] / app.tile.size.twips[0]);
		xMin = Math.round(xMin * ratio);
		yMin = Math.round(yMin * ratio);
		xMax = Math.round(xMax * ratio);
		yMax = Math.round(yMax * ratio);

		this.setPosition(xMin, yMin); // This function is added by section container.
		this.size = [xMax - xMin, yMax - yMin];
		if (this.size[0] < 5)
			this.size[0] = 5;
	}

	public onResize (): void {
		this.setPositionAndSize();
	}

	public drawPolygon(): void {
		var rectArray = oxool.Bounds.parseArray(this.sectionProperties.json.rectangles);
		var rectangles = rectArray.map(function (rect: oxool.Bounds) {
			return rect.getPointArray();
		});

		var docLayer = this.map._docLayer;
		this.sectionProperties.pointSet = CPolyUtil.rectanglesToPointSet(rectangles,
			function (twipsPoint) {
				var corePxPt = docLayer._twipsToCorePixels(twipsPoint);
				corePxPt.round();
				return corePxPt;
			});

		if (!this.sectionProperties.frame) {
			this.sectionProperties.frame = new CPolygon(this.sectionProperties.pointSet, this.sectionProperties.polyAttri);
			this.changeBorderStyle();
			this.map._docLayer._canvasOverlay.initPath(this.sectionProperties.frame);
		}
		this.sectionProperties.frame.setPointSet(this.sectionProperties.pointSet);
	}

	public onDraw(): void {
		if (!this.sectionProperties.json)
			return;

		var text:string = this.sectionProperties.json.alias;
		if (text) {
			var rectangles: Array<number>[] = this.getRectangles(this.sectionProperties.json.rectangles);
			var ratio: number = (app.tile.size.pixels[0] / app.tile.size.twips[0]);
			var x: number = rectangles[rectangles.length-1][0] * ratio;
			var y: number = rectangles[rectangles.length-1][1] * ratio;

			// fixed height for alias tag
			var h: number = 20;
			var startX: number = x - this.position[0] + 5;
			var startY: number = y - this.position[1];
			var padding: number = 10;
			var fontStyle = getComputedStyle(document.body).getPropertyValue('--docs-font').split(',')[0].replace(/'/g, '');
			var fontSize = getComputedStyle(document.body).getPropertyValue('--default-font-size');
			var font = fontSize + ' ' + fontStyle;
			var textWidth: number = L.Util.getTextWidth(text, font) + padding;

			// draw rectangle with backgroundcolor
			this.context.beginPath();
			this.context.fillStyle = '#E6FFFF';
			this.context.font = font;
			this.context.fillRect(startX, startY - h, textWidth, h);

			// add text to the rectangle
			this.context.textAlign = 'center';
			this.context.textBaseline = 'middle';
			this.context.fillStyle = '#026296';
			this.context.fillText(text, startX + textWidth / 2, startY - h / 2);

			// draw borders around the rectangle
			this.context.strokeStyle = '#026296';
			this.context.lineWidth = app.dpiScale;
			this.context.strokeRect(startX - 0.5, startY - h - 0.5, textWidth, h);

		}
		if (this.sectionProperties.json.items || this.sectionProperties.datePicker) {
			this.addDropDownBtn();
		}
	}

	public onNewDocumentTopLeft (): void {
		this.setPositionAndSize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	private callback(objectType: any , eventType: any, object: any, data: any, builder: any): void {
		var fireEvent: string = 'jsdialog';
		if ((<any>window).mode.isMobile()) {
			fireEvent = 'mobilewizard';
		}
		var closeDropdownJson = {
			'jsontype': 'dialog',
			'type': 'modalpopup',
			'action': 'close',
			'id': builder.windowId,
		};

		if (eventType === 'close') {
			this.map.fire(fireEvent, {data: closeDropdownJson, callback: undefined});
		} else if (eventType === 'select') {
			app.socket.sendMessage('contentcontrolevent type=drop-down selected='+ data);
			this.map.fire(fireEvent, {data: closeDropdownJson, callback: undefined});
		}
	}

	private addDropDownBtn(): void {
		var matches = this.sectionProperties.json.rectangles.match(/\d+/g);

		//consider first rectangle to position dropdownbutton
		var rectangle = [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];

		var topLeftTwips = new oxool.Point(rectangle[0], rectangle[1]);
		var offset = new oxool.Point(rectangle[2], rectangle[3]);
		var bottomRightTwips = topLeftTwips.add(offset);
		var buttonAreaTwips = [topLeftTwips, bottomRightTwips];

		var frameArea = new oxool.Bounds(
			this.map._docLayer._twipsToPixels(topLeftTwips),
			this.map._docLayer._twipsToPixels(bottomRightTwips));

		var size = frameArea.getSize();
		var origin = this.map.getPixelOrigin();
		var panePos = this.map._getMapPanePos();
		this.sectionProperties.framePos = new oxool.Point(Math.round(frameArea.min.x + panePos.x - origin.x), Math.round(frameArea.min.y + panePos.y - origin.y));
		this.sectionProperties.frameWidth = Math.round(size.x);
		this.sectionProperties.frameHeight = Math.round(size.y);

		var icon =  L.divIcon({
			className: 'writer-drop-down-marker',
			iconSize: [this.sectionProperties.frameHeight, this.sectionProperties.frameHeight],
			iconAnchor: [0, 0]
		});

		this.sectionProperties.dropdownButton.setIcon(icon);

		// Then convert to unit which can be used on the layer.
		var buttonAreaLatLng = new L.LatLngBounds(
			this.map._docLayer._twipsToLatLng(buttonAreaTwips[0], this.map.getZoom()),
			this.map._docLayer._twipsToLatLng(buttonAreaTwips[1], this.map.getZoom()));

		var pos = buttonAreaLatLng.getNorthEast();
		this.sectionProperties.dropdownButton.setLatLng(pos);
		this.map.addLayer(this.sectionProperties.dropdownButton);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	private openDropdownJson(): any {
		if (!this.sectionProperties.json.items)
			return;
		var json: any = {
			'children': [
				{
					'id': 'container-dropdown',
					'type': 'container',
					'text': '',
					'enabled': true,
					'children': [
						{
							'id': 'contentControlList',
							'type': 'treelistbox',
							'text': '',
							'enabled': true,
							'singleclickactivate': true,
						}
					],
					'vertical': true
				}
			],
			'jsontype': 'dialog',
			'type': 'modalpopup',
			'cancellable': true,
			'popupParent': '_POPOVER_',
			'clickToClose': '_POPOVER_',
			'id': 'contentControlModalpopup'
		};

		var entries = [];
		var items = this.sectionProperties.json.items;

		//add entries
		for (var i in items) {
			var entry = {
				'text' : items[i],
				'columns': [
					{
						'text': items[i]
					}
				],
				'row': i.toString()
			};
			entries.push(entry);
		}
		json.children[0].children[0].entries = entries;

		//add position
		json.posx = this.sectionProperties.framePos.x + this.sectionProperties.frameWidth;
		json.posy = this.sectionProperties.framePos.y + this.sectionProperties.frameHeight;

		return json;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public onClickDropdown(event: any): void {
		if (this.sectionProperties.datePicker) {
			this.showDatePicker();
		} else if (this.sectionProperties.json.items) {
			var fireEvent: string = 'jsdialog';
			if ((<any>window).mode.isMobile()) {
				fireEvent = 'mobilewizard';
			}
			this.map.fire(fireEvent, {data: this.openDropdownJson(), callback: this.callback});
		}

		L.DomEvent.stopPropagation(event);
	}

	private showDatePicker(): void {
		if ($('#datepicker').is(':visible')) {
			$('#datepicker').hide();
		} else {
			var datePicker = document.getElementById('datepicker');
			datePicker.style.left = this.sectionProperties.framePos.x + this.sectionProperties.frameWidth + 'px';
			datePicker.style.top = this.sectionProperties.framePos.y + this.sectionProperties.frameHeight + 'px';
			$('#datepicker').show();
		}
	}

	private getRectangles(rect: string): Array<number>[] {
		var rectangles: Array<number>[] = [];
		//convert string to number coordinates
		var matches = rect.match(/\d+/g);
		if (matches !== null) {
			for (var i: number = 0; i < matches.length; i += 4) {
				rectangles.push([parseInt(matches[i]), parseInt(matches[i + 1]), parseInt(matches[i + 2]), parseInt(matches[i + 3])]);
			}
		}
		return rectangles;
	}

	private changeBorderStyle(): void {
		var borderColor = this.map.uiManager.getDarkModeState() ? 'white' : 'black';
		this.sectionProperties.frame.color = borderColor;
	}
}

}

app.definitions.ContentControlSection = oxool.ContentControlSection;


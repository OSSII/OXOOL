/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.PartsPreview
 */

/* global $ */
L.Control.PartsPreview = L.Control.extend({
	options: {
		autoUpdate: true
	},

	onAdd: function (map) {
		this._previewInitialized = false;
		this._previewTiles = [];
		this._partsPreviewCont = L.DomUtil.get('slide-sorter');
		this._scrollY = 0;

		map.on('updateparts', this._updateDisabled, this);
		map.on('updatepart', this._updatePart, this);
		map.on('tilepreview', this._updatePreview, this);
		map.on('insertpage', this._insertPreview, this);
		map.on('deletepage', this._deletePreview, this);
	},

	_updateDisabled: function (e) {
		var docType = e.docType;
		if (docType === 'presentation' || docType === 'drawing') {
			var parts = e.parts;
			var selectedPart = e.selectedPart;

			if (!this._previewInitialized)
			{
				// make room for the preview
				var docContainer = this._map.options.documentContainer;
				L.DomUtil.addClass(docContainer, 'parts-preview-document');
				setTimeout(L.bind(function () {
					this._map.invalidateSize();
					$('.scroll-container').mCustomScrollbar('update');
				}, this), 500);
				var previewContBB = this._partsPreviewCont.getBoundingClientRect();
				this._previewContTop = previewContBB.top;
				var bottomBound = previewContBB.bottom + previewContBB.height / 2;
				for (var i = 0; i < parts; i++) {
					this._previewTiles.push(this._createPreview(i, e.partNames[i], bottomBound));
				}
				L.DomUtil.addClass(this._previewTiles[selectedPart], 'preview-img-selected');
				this._previewInitialized = true;
			}
			else
			{
				if (e.partNames !== undefined) {
					this._syncPreviews(e);
				}

				// change the border style of the selected preview.
				for (var j = 0; j < parts; j++) {
					L.DomUtil.removeClass(this._previewTiles[j], 'preview-img-selected');
				}
				L.DomUtil.addClass(this._previewTiles[selectedPart], 'preview-img-selected');
			}
		}
	},

	_createPreview: function (i, hashCode, bottomBound) {
		var frame = L.DomUtil.create('div', 'preview-frame', this._partsPreviewCont);
		var infoWrapper = L.DomUtil.create('div', 'preview-info-wrapper', frame);
		L.DomUtil.create('div', 'preview-helper', infoWrapper); //infoWrapper.childNodes[0]
		L.DomUtil.create('div', '', infoWrapper); // infoWrapper.childNodes[1] (是否有動畫)
		L.DomUtil.create('div', '', infoWrapper); // infoWrapper.childNodes[2] (是否有投影片轉場)

		var imgClassName = 'preview-img';
		var img = L.DomUtil.create('img', imgClassName, frame);
		img.hash = hashCode;
		img.src = L.Icon.Default.imagePath + '/preview_placeholder.png';
		img.fetched = false;
		L.DomEvent
			.on(img, 'click', L.DomEvent.stopPropagation)
			.on(img, 'click', L.DomEvent.stop)
			.on(img, 'click', this._setPart, this)
			.on(img, 'click', this._map.focus, this._map);

		var topBound = this._previewContTop;
		var previewFrameTop = 0;
		var previewFrameBottom = 0;
		if (i > 0) {
			if (!bottomBound) {
				var previewContBB = this._partsPreviewCont.getBoundingClientRect();
				bottomBound = this._previewContTop + previewContBB.height + previewContBB.height / 2;
			}
			previewFrameTop = this._previewContTop + this._previewFrameMargin + i * (this._previewFrameHeight + this._previewFrameMargin);
			previewFrameTop -= this._scrollY;
			previewFrameBottom = previewFrameTop + this._previewFrameHeight;
			L.DomUtil.setStyle(img, 'height', this._previewImgHeight + 'px');
			L.DomUtil.setStyle(infoWrapper, 'height', this._previewImgHeight + 'px');
		}

		var imgSize;
		if (i === 0 || (previewFrameTop >= topBound && previewFrameTop <= bottomBound)
			|| (previewFrameBottom >= topBound && previewFrameBottom <= bottomBound)) {
			imgSize = this._map.getPreview(i, i, 180, 180, {autoUpdate: this.options.autoUpdate});
			img.fetched = true;
			L.DomUtil.setStyle(img, 'height', '');
			L.DomUtil.setStyle(infoWrapper, 'height', imgSize.height + 'px');
		}

		if (i === 0) {
			var previewImgBorder = Math.round(parseFloat(L.DomUtil.getStyle(img, 'border-top-width')));
			var previewImgMinWidth = Math.round(parseFloat(L.DomUtil.getStyle(img, 'min-width')));
			var imgHeight = imgSize.height;
			if (imgSize.width < previewImgMinWidth)
				imgHeight = Math.round(imgHeight * previewImgMinWidth / imgSize.width);
			var previewFrameBB = frame.getBoundingClientRect();
			this._previewFrameMargin = previewFrameBB.top - this._previewContTop;
			this._previewImgHeight = imgHeight;
			this._previewFrameHeight = imgHeight + 2 * previewImgBorder;
		}

		return img;
	},

	_setPart: function (e) {
		var part = $('#slide-sorter .mCSB_container .preview-frame').index(e.target.parentNode);
		if (part !== null) {
			this._map.setPart(parseInt(part));
		}
	},

	_updatePart: function (e) {
		if (e.docType === 'presentation' && e.part >= 0) {
			this._map.getPreview(e.part, e.part, 180, 180, {autoUpdate: this.options.autoUpdate});
		}
	},

	_syncPreviews: function (e) {
		var it = 0;
		var parts = e.parts;
		if (parts !== this._previewTiles.length) {
			if (Math.abs(parts - this._previewTiles.length) === 1) {
				if (parts > this._previewTiles.length) {
					for (it = 0; it < parts; it++) {
						if (it === this._previewTiles.length) {
							this._insertPreview({selectedPart: it - 1, hashCode: e.partNames[it]});
							break;
						}
						if (this._previewTiles[it].hash !== e.partNames[it]) {
							this._insertPreview({selectedPart: it, hashCode: e.partNames[it]});
							break;
						}
					}
				}
				else {
					for (it = 0; it < this._previewTiles.length; it++) {
						if (it === e.partNames.length ||
						    this._previewTiles[it].hash !== e.partNames[it]) {
							this._deletePreview({selectedPart: it});
							break;
						}
					}
				}
			}
			else {
				// sync all, should never happen
				while (this._previewTiles.length < e.partNames.length) {
					this._insertPreview({selectedPart: this._previewTiles.length - 1,
							     hashCode: e.partNames[this._previewTiles.length]});
				}

				while (this._previewTiles.length > e.partNames.length) {
					this._deletePreview({selectedPart: this._previewTiles.length - 1});
				}

				for (it = 0; it < e.partNames.length; it++) {
					this._previewTiles[it].hash = e.partNames[it];
					this._previewTiles[it].src = L.Icon.Default.imagePath + '/preview_placeholder.png';
					this._previewTiles[it].fetched = false;
				}
				this._onScrollEnd();
			}
		}
		else {
			// update hash code when user click insert slide.
			for (it = 0; it < parts; it++) {
				var img = this._previewTiles[it];
				var hash = e.partNames[it];
				var infoWrapper = img.parentNode.childNodes[0];
				var helper = infoWrapper.childNodes[0];
				var animation = infoWrapper.childNodes[1];
				var transition = infoWrapper.childNodes[2];
				helper.innerText = it + 1;
				// 更新 hashCode
				img.hash = hash;

				var pInfo = this._map.getPartProperty(it);
				if (pInfo !== undefined) {
					img.title = pInfo.name;
					// 是否隱藏
					if (pInfo.visible === '0') {
						L.DomUtil.addClass(img, 'preview-img-blur');
					} else {
						L.DomUtil.removeClass(img, 'preview-img-blur');
					}

					// 是否有動畫
					if (pInfo.hasAnimationNode !== '0') {
						L.DomUtil.addClass(animation, 'preview-animation');
					} else {
						L.DomUtil.removeClass(animation, 'preview-animation');
					}

					// 是否有轉場
					if (pInfo.transitionType !== '0') {
						L.DomUtil.addClass(transition, 'preview-transition');
					} else {
						L.DomUtil.removeClass(transition, 'preview-transition');
					}
				}
			}
		}
	},

	_updatePreview: function (e) {
		if (this._map.getDocType() === 'presentation' || this._map.getDocType() === 'drawing') {
			// the scrollbar has to be re-initialized here else it doesn't work
			// probably a bug from the scrollbar
			var control = this;
			this._previewTiles[e.id].onload = function () {
				$('#slide-sorter').mCustomScrollbar({
					axis: 'y',
					theme: 'dark-thick',
					scrollInertia: 0,
					alwaysShowScrollbar: 1,
					callbacks:{
						whileScrolling: function() {
							control._onScroll(this);
						}
					}
				});
			};
			this._previewTiles[e.id].src = e.tile;
		}
	},

	_updatePreviewIds: function () {
		$('#slide-sorter').mCustomScrollbar('update');
	},

	_insertPreview: function (e) {
		if (this._map.getDocType() === 'presentation') {
			var newIndex = e.selectedPart + 1;
			var newPreview = this._createPreview(newIndex, (e.hashCode === undefined ? null : e.hashCode));

			// insert newPreview to newIndex position
			this._previewTiles.splice(newIndex, 0, newPreview);

			var selectedFrame = this._previewTiles[e.selectedPart].parentNode;
			var newFrame = newPreview.parentNode;

			// insert after selectedFrame
			selectedFrame.parentNode.insertBefore(newFrame, selectedFrame.nextSibling);
			this._updatePreviewIds();
		}
	},

	_deletePreview: function (e) {
		if (this._map.getDocType() === 'presentation') {
			var selectedFrame = this._previewTiles[e.selectedPart].parentNode;
			L.DomUtil.remove(selectedFrame);

			this._previewTiles.splice(e.selectedPart, 1);
			this._updatePreviewIds();
		}
	},

	_onScroll: function (e) {
		var scrollOffset = 0;
		if (e) {
			var prevScrollY = this._scrollY;
			this._scrollY = -e.mcs.top;
			scrollOffset = this._scrollY - prevScrollY;
		}

		var previewContBB = this._partsPreviewCont.getBoundingClientRect();
		var extra =  previewContBB.height;
		var topBound = this._previewContTop - (scrollOffset < 0 ? extra : previewContBB.height / 2);
		var bottomBound = this._previewContTop + previewContBB.height + (scrollOffset > 0 ? extra : previewContBB.height / 2);
		for (var i = 0; i < this._previewTiles.length; ++i) {
			var img = this._previewTiles[i];
			if (img && img.parentNode && !img.fetched) {
				var previewFrameBB = img.parentNode.getBoundingClientRect();
				if ((previewFrameBB.top >= topBound && previewFrameBB.top <= bottomBound)
				|| (previewFrameBB.bottom >= topBound && previewFrameBB.bottom <= bottomBound)) {
					this._map.getPreview(i, i, 180, 180, {autoUpdate: this.options.autoUpdate});
					img.fetched = true;
				}
			}
		}
	}
});

L.control.partsPreview = function (options) {
	return new L.Control.PartsPreview(options);
};

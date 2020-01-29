/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.Tabs is used to switch sheets in Calc
 */

/* global $ _ _UNO */
L.Control.Tabs = L.Control.extend({
	onAdd: function(map) {
		map.on('updatepermission', this._onUpdatePermission, this);
		this._initialized = false;
	},

	_onUpdatePermission: function(e) {
		if (this._map.getDocType() !== 'spreadsheet') {
			return;
		}

		if (!this._initialized) {
			this._initialize();
		}

		if (window.mode.isMobile() == true) {
			if (e.perm === 'edit') {
				$('.spreadsheet-tabs-container')
					.removeClass('mobile-view')
					.addClass('mobile-edit');
			} else {
				$('.spreadsheet-tabs-container')
					.addClass('mobile-view')
					.addClass('mobile-edit');
			}
		}
	},

	_initialize: function () {
		this._initialized = true;
		this._tabsInitialized = false;
		this._spreadsheetTabs = {};
		this._tabForContextMenu = 0;
		var map = this._map;
		var docContainer = map.options.documentContainer;
		this._tabsCont = L.DomUtil.create('div', 'spreadsheet-tabs-container', docContainer.parentElement);
		L.DomEvent.on(this._tabsCont, 'touchstart',
			function (e) {
				if (e && e.touches.length > 1) {
					L.DomEvent.preventDefault(e);
				}
			},
			this);

		map.on('updateparts', this._updateDisabled, this);

		if (this._map._permission !== 'edit')
			return;

		L.installContextMenu({
			selector: '.spreadsheet-tab',
			className: 'loleaflet-font',
			autoHide: true,
			callback: (function(key) {
				if (key === 'InsertColumnsAfter') {
					map.insertPage(this._tabForContextMenu);
				}
				if (key === 'InsertColumnsBefore') {
					map.insertPage(this._tabForContextMenu + 1);
				}
			}).bind(this),
			items: {
				'InsertColumnsAfter': {
					name: _('Insert sheet before this'),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'InsertColumnsBefore': {
					name: _('Insert sheet after this'),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'DuplicatePage': {
					name: _UNO('.uno:Move', 'spreadsheet', true),
					callback: (function() {
						map.fire('executeDialog', {dialog: 'MoveTable'});
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'DeleteTable': {name: _UNO('.uno:Remove', 'spreadsheet', true),
						callback: (function(/*key, options*/) {
							map.fire('executeDialog', {dialog: 'RemoveTable'});
						}).bind(this),
						icon: (function(opt, $itemElement, itemKey, item) {
							return this._map.contextMenuIcon($itemElement, itemKey, item);
						}).bind(this)
				 },
				'DBTableRename': {name: _UNO('.uno:RenameTable', 'spreadsheet', true),
							callback: (function(/*key, options*/) {
								map.fire('executeDialog', {dialog: 'RenameTable'});
							}).bind(this),
							icon: (function(opt, $itemElement, itemKey, item) {
								return this._map.contextMenuIcon($itemElement, itemKey, item);
							}).bind(this)
				} ,
				'sep01': '----',
				'Hide': {
					name: _UNO('.uno:Hide', 'spreadsheet', true),
					callback: (function() {
						map.hidePage();
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'Show': {
					name: _UNO('.uno:Show', 'spreadsheet', true),
					callback: (function() {
						map.fire('executeDialog', {dialog: 'ShowTable'});
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				},
				'sep02': '----',
				'ToggleSheetGrid': {
					name: _UNO('.uno:ToggleSheetGrid', 'spreadsheet', true),
					callback: (function() {
						map.sendUnoCommand('.uno:ToggleSheetGrid');
					}).bind(this),
					icon: (function(opt, $itemElement, itemKey, item) {
						return this._map.contextMenuIcon($itemElement, itemKey, item);
					}).bind(this)
				}
			},
			zIndex: 1000
		});
	},

	_updateDisabled: function (e) {
		var parts = e.parts;
		var selectedPart = e.selectedPart;
		var docType = e.docType;
		if (docType === 'text') {
			return;
		}
		if (docType === 'spreadsheet') {
			if (!this._tabsInitialized) {
				// make room for the preview
				var docContainer = this._map.options.documentContainer;
				L.DomUtil.addClass(docContainer, 'spreadsheet-document');
				setTimeout(L.bind(function () {
					this._map.invalidateSize();
					$('.scroll-container').mCustomScrollbar('update');
					$('.scroll-container').mCustomScrollbar('scrollTo', [0, 0]);
				}, this), 100);
				this._tabsInitialized = true;
			}
			if ('partNames' in e) {
				while (this._tabsCont.firstChild) {
					this._tabsCont.removeChild(this._tabsCont.firstChild);
				}
				var ssTabScroll = L.DomUtil.create('div', 'spreadsheet-tab-scroll', this._tabsCont);
				ssTabScroll.id = 'spreadsheet-tab-scroll';

				for (var i = 0; i < parts; i++) {
					if (e.hiddenParts.indexOf(i) !== -1)
						continue;
					var id = 'spreadsheet-tab' + i;
					var tab = L.DomUtil.create('button', 'spreadsheet-tab', ssTabScroll);
					L.DomEvent.enableLongTap(tab, 15, 1000);
					
					L.DomEvent.on(tab, 'contextmenu', function(j) {
						return function() {
							this._tabForContextMenu = j;
							$('#spreadsheet-tab' + j).contextMenu();
						}
					}(i).bind(this));
					
					tab.textContent = e.partNames[i];
					tab.id = id;

					L.DomEvent
						.on(tab, 'click', L.DomEvent.stopPropagation)
						.on(tab, 'click', L.DomEvent.stop)
						.on(tab, 'mousedown', this._setPart, this)
						.on(tab, 'mousedown', this._map.focus, this._map);
					this._spreadsheetTabs[id] = tab;
				}
			}
			for (var key in this._spreadsheetTabs) {
				var part =  parseInt(key.match(/\d+/g)[0]);
				L.DomUtil.removeClass(this._spreadsheetTabs[key], 'spreadsheet-tab-selected');
				if (part === selectedPart) {
					L.DomUtil.addClass(this._spreadsheetTabs[key], 'spreadsheet-tab-selected');
				}
			}
		}
	},

	_setPart: function (e) {
		var part =  e.target.id.match(/\d+/g)[0];
		if (part !== null) {
			this._map.setPart(parseInt(part), /*external:*/ false, /*calledFromSetPartHandler:*/ true);
		}
	}
});

L.control.tabs = function (options) {
	return new L.Control.Tabs(options);
};

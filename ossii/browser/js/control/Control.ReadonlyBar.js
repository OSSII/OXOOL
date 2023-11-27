/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.ReadonlyBar
 */

/* global L $ _ _UNO */
L.Control.ReadonlyBar = L.Control.extend({
	_bar: null,
	_docName: null,
	_docType: null,

	onAdd: function(map) {
		this._map = map;
		this._docType = map.getDocType();
		this._docName = map.getFileName();
		// 隱藏導覽列，導覽列的 class 為 main-nav
		this.mainNav = document.getElementsByClassName('main-nav')[0];
		this.mainNav.style.display = 'none'; // 隱藏導覽列
		this._initLayout(); // 初始化工具列
	},

	onRemove: function() {
		L.DomUtil.remove(this._bar); // 移除工具列的 dom element
		this.mainNav.style.display = 'flex'; // 顯示導覽列
		delete this.builder;
	},

	_initLayout: function() {
		// 建立工具列的 dom element
		this._bar = L.DomUtil.createWithId('div', 'oxool-readonlybar');
		this._bar.style.display = 'none'; // 隱藏工具列

		// 插在導覽列之後
		this.mainNav.parentNode.insertBefore(this._bar, this.mainNav.nextSibling);

		// 一、依據檔案類別建立圖示
		var iconClass = 'document-logo';
		switch (this._docType) {
		case 'text':
			iconClass += ' writer-icon-img';
			break;
		case 'spreadsheet':
			iconClass += ' calc-icon-img';
			break;
		case 'presentation':
			iconClass += ' impress-icon-img';
			break;
		case 'drawing':
			iconClass += ' draw-icon-img';
			break;
		}

		this._shortcutsBar = L.DomUtil.create('div', 'document-shortcuts-bar', this._bar);

		// 二、建立檔名顯示區
		var documentNameHeader = L.DomUtil.create('div', 'document-name-header', this._bar);
		documentNameHeader.title = this._docName;
		L.DomUtil.create('div', iconClass, documentNameHeader);
		var documentName = L.DomUtil.create('div', 'document-name', documentNameHeader);
		documentName.textContent = this._docName;

		// 三、建立關閉按鈕(如果有的話)
		if (L.Params.closeButtonEnabled) {
			var closeButton = L.DomUtil.create('div', 'closebuttonimage', this._bar);
			closeButton.title = _('Close document');
			// 點擊關閉按鈕時，關閉文件
			L.DomEvent.on(closeButton, 'click', function() {
				this._map.closeDocument();
			}, this);
		}

		this.builder = new L.control.notebookbarBuilder({
			mobileWizard: this,
			map: this._map,
			cssClass: 'notebookbar',
			noLabelsForUnoButtons: true,
			callback: this._callbackHandler
		});

		console.debug('haha this.builder', this.builder);
		// 新增 _toolitemHandlers 的 downloadas handler
		this.builder._toolitemHandlers['downloadas'] = this._downloadAsControl;

		this.createShortcutsBar(); // 建立工具列
		this._bar.style.display = 'flex'; // 顯示工具列
	},

	_callbackHandler: function(objectType, eventType, object, data, builder) {
		if (builder.map.uiManager.isUIBlocked())
			return;

		if (builder.wizard.setCurrentScrollPosition)
			builder.wizard.setCurrentScrollPosition();

		if (objectType == 'toolbutton' && eventType == 'click' && data.indexOf('.uno:') >= 0) {
			builder.map.executeAllowedCommand(data);
		}
	},

	_downloadAsControl: function(parentContainer, data, builder) {
		var options = {hasDropdownArrow: true};
		var control = builder._unoToolButton(parentContainer, data, builder, options);

		$(control.container).unbind('click.toolbutton');
		var formats = builder.map.getExportFormats();
		var menuItems = {};
		formats.forEach(function(item) {
			var id = 'downloadas-' + item.format;
			menuItems[id] = {
				icon: 'res:' + id,
				name: item.label
			};
		});
		L.installContextMenu({
			selector: '#downloadasmenu',
			className: 'oxool-font',
			trigger: 'left',
			items: menuItems,
			callback: function(key/* , options */) {
				builder.map.executeAllowedCommand(key);
			}
		});
		builder._preventDocumentLosingFocusOnClick(control.container);
	},

	getShortcutsBarData: function() {
		var wopi = this._map['wopi'];
		var shortcutsBarData = [
			{
				'id': 'shortcutstoolbox',
				'type': 'toolbox',
				'children': []
			}
		];
		var shortcutsBar = shortcutsBarData[0].children;

		// 如果是投影片，且未禁止匯出的話，顯示投影相關按鈕
		if (this._map.getDocType() === 'presentation' && wopi.HideExportOption !== true) {
			// 從第一張開始投影
			shortcutsBar.push({
				'type': 'customtoolitem',
				'command': '.uno:Presentation',
				'text': _UNO('.uno:Presentation', this._docType)
			});
			// 從目前頁面開始投影
			shortcutsBar.push({
				'type': 'customtoolitem',
				'command': '.uno:PresentationCurrentSlide',
				'text': _UNO('.uno:PresentationCurrentSlide', this._docType)
			});
		}

		// 沒有禁止下載
		if (wopi.HideExportOption !== true) {
			shortcutsBar.push({
				'id': 'downloadasmenu',
				'type': 'toolitem',
				'command': 'downloadas',
				'text': _('Download as'),
				'accessibility': { focusBack: true,	combination: 'A', de: 'M' },
			});
		}

		// 沒有禁止印表
		if (wopi.HidePrintOption !== true) {
			shortcutsBar.push({
				'type': 'customtoolitem',
				'command': '.uno:Print',
				'text': _UNO('.uno:Print', this._docType),
			});
		}

		// 有「關於」對話框
		shortcutsBar.push({
			'type': 'customtoolitem',
			'command': 'about',
			'text': _('About'),
			'accessibility': { focusBack: false, combination: 'W', de: null }
		});

		return shortcutsBarData;
	},

	createShortcutsBar: function() {
		var shortcutsBarData = this.getShortcutsBarData();
		this.builder.build(this._shortcutsBar, shortcutsBarData, false, true);
	},

});

L.control.readonlyBar = function (options) {
	return new L.Control.ReadonlyBar(options);
};

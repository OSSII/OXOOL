/* -*- js-indent-level: 8 -*- */
/*
 * Copyright the OxOffice Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/*
 * L.Map.Icon handle Icon Service
 */

/* global L Set */

L.Map.mergeOptions({
	Icon: true
});

L.Map.Icon = L.Handler.extend({

	/**
	 * Initialize
	 * @param {L.Map} map - map object
	 */
	initialize: function (map) {
		this._map = map;

		// 取代 L.LOUtil.setImage() 的功能
		if (L.LOUtil.setImage) {
			this._savedSetImage = L.bind(L.LOUtil.setImage, L.LOUtil);
			L.LOUtil.setImage = L.bind(this._setImage, this);
		}

		this._loadIconResource(); // load icon resource
	},

	/**
	 * On add hooks
	 */
	addHooks: function () {

	},

	/**
	 * On remove hooks
	 */
	removeHooks: function () {

	},

	/**
	 * Get specified icon URL
	 *
	 * @param {string} icon - uno command or icon path or online icon
	 * @param {string} size - icon size, default is '',
	 *						  '/m' - medium(24x24 px)
	 *						  '/l' - large(32x32 px)
	 * @returns {string} - icon URL
	 * @example 1. getURL('.uno:Save') - get uno command icon URL
	 * 			2. getURL('.uno:SaveAs', '/l') - get uno command icon URL with large size
	 * 			3. getURL('res/writer128') - get specified with path
	 * 			4. getURL('downloadas-pdf') - get download as PDF icon URL, use alias
	 * 			5. getURL('@fold.svg') - get online icon URL
	 *
	 * @note: if icon is not uno command, size is not necessary
	 *
	 */
	getURL: function (icon, size) {
		if (!icon) {
			console.error('Not specify icon name');
			return L.LOUtil.emptyImageUrl;
		}

		// 如果 size 不是 '' 或 '/m' 或 '/l'，則設為 ''
		if (size !== '' && size !== '/m' && size !== '/l') {
			size = '';
		}

		// 如果有的話，找出替代的 icon
		if (this._iconAlias[icon]) {
			icon = this._iconAlias[icon];
		}

		var isDark = this._map.uiManager.getDarkModeState(); // 是否為深色模式
		var prefixURL = this._resourceURI + 'icon:' + (isDark ? 'dark/' : 'light/'); // icon 的 URL 前綴
		var theme = this._theme[isDark ? 'dark' : 'light']; // 使用的 theme
		// check theme is loaded
		var themeLoaded = theme.format !== '';
		// icon 的副檔名，如果 theme 沒有載入，不使用副檔名(Resource service 會自動判別)
		var iconExtension = themeLoaded ? '.' + theme.format : '';

		var iconPath = '';
		// 如果是 uno 指令
		if (icon.startsWith('.uno:')) {
			// 去掉 .uno: 或 dialog: 前綴
			var cmdName = icon.substring(icon.indexOf(':') + 1).toLowerCase();
			var sizePrefix = 'cmd/';
			if (size === '') {
				sizePrefix += 'sc_';
			} else if (size === '/m') {
				sizePrefix += 'lc_';
			} else {
				sizePrefix += '32/';
			}

			iconPath = sizePrefix + cmdName + iconExtension;
		} else if (icon.startsWith('@')) { // 如果是 online icon
			iconPath = icon.substring(1);
			// 檢查 icon 是否有帶副檔名 .svg 或 .png
			if (!iconPath.endsWith('.svg') && !iconPath.endsWith('.png')) {
				iconPath += '.svg'; // 預設是 svg
			}
			// theme 尚未載入，或已經在 onlineFiles 中
			if (!themeLoaded || theme.onlineFiles.has(iconPath)) {
				return prefixURL + icon;
			}
			else // 直接傳回空白圖示
				return L.Util.emptyImageUrl;

		} else {
			size = ''; // 除了 uno 指令外，其他的 icon 都不區分 size
			iconPath = icon + iconExtension;
		}

		// 如果 theme 沒有載入，或是 icon 已經存在，或是 icon 已經在 links 中
		// 直接傳回 URL
		var iconURL = prefixURL + icon + size;
		if (!themeLoaded || theme.files.has(iconPath) || theme.links[iconPath]) {
			return iconURL;
		}

		// TODO: 確實找不到 icon 的話，是否改用 online browser/dist/images/ 之下的圖示？
		/*
		{
			// Fall back to images/lc_*.svg or images/dark/lc_*.svg
			iconURL = 'images/' + (isDark ? 'dark/' : '') + 'lc_' + icon + '.svg';
			return iconURL;
		} */

		return L.Util.emptyImageUrl;
	},

	/**
	 * 製作 hotkey 字串的 DOM
	 * @param {string} hotkey - 如 Ctrl+C 之類的字串，各按鍵之間用 '+' 號區隔
	 * @returns html element
	 */
	createHotkey: function (hotkey) {
		// 避免連續兩個 '++'，所以先把 '++' 換成 '+PLUS'
		var myHotkey = L.Util.replaceCtrlAltInMac(hotkey.replace('++', '+PLUS'));
		var hotkeyItem = L.DomUtil.create('span', 'hotkey');
		var keys = myHotkey.split('+');
		for (var k = 0; k < keys.length; k++) {
			var kbd = L.DomUtil.create('i', 'keyboard', hotkeyItem);
			kbd.textContent = (keys[k] === 'PLUS' ? '+' : keys[k]);
			if (k !== keys.length - 1) {
				var plus = L.DomUtil.create('span', '', hotkeyItem);
				plus.textContent = '+';
			}
		}
		return hotkeyItem;
	},

	contextMenu: function (opt, $itemElement, itemKey, item) {
		if (opt.$node) {
			// 設定 icon
			var icon = L.DomUtil.create('i', 'context-menu-image-icon');
			// 如果有 _savedIcon 的話，以 _savedIcon 為主，否則以 itemKey 為主
			// NOTE: _savedIcon 是 L.installContextMenu() 產生的，
			// 非透過 L.installContextMenu() 無法指定
			var iconURL = this.getURL(item._savedIcon ? item._savedIcon : itemKey);
			// 設定 icon 的背景圖片
			icon.style.backgroundImage = 'url(\'' + iconURL + '\')';
			$itemElement.prepend(icon);

			// 如果是桌面環境，檢查該項目是否有快捷鍵
			if (window.mode.isDesktop()) {
				var hotkey = this._map.getCommandHotkey(itemKey);
				if (hotkey) {
					var keys = hotkey.split('+');
					var paddingRight = (hotkey.length * 5) + (keys.length * 5) + 32;
					$itemElement.attr('style', 'padding-right:' + paddingRight + 'px !important');
					$itemElement.append(this.createHotkey(hotkey));
				}
			}

			// 沒有指定 checktype
			if (item.checktype === undefined) {
				var state = this._map.stateChangeHandler.getState(itemKey);
				if (state.checked()) {
					$itemElement.addClass('context-menu-icon');
				} else {
					$itemElement.removeClass('context-menu-icon');
				}
			} else if (item.checked) { // 設定勾選
				$itemElement.addClass('context-menu-icon');
			} else { // 未勾選
				$itemElement.removeClass('context-menu-icon');
			}

			// 如果是 debug 模式，把 id 放進 title
			if (window.protocolDebug === true) {
				$itemElement.prop('title', itemKey);
			}
		}

		return 'context-menu-icon-updated';
	},

	// Private variables here ----------------------------------------------------

	_resourceURI: window.serviceRoot + '/oxool/resource/', // Resource URI

	_savedSetImage: null, // save the original setImage function

	_theme: {
		light: {
			format: '',
			files: new Set(),
			onlineFiles: new Set(),
			links: {},
		},
		dark: {
			format: '',
			files: new Set(),
			onlineFiles: new Set(),
			links: {},
		},
	},

	// icon 別名
	_iconAlias: {
		// downloadas-* 的圖示
		'downloadas-pdf': '.uno:ExportDirectToPDF', // 下載爲 PDF
		// writer
		'downloadas-html': '.uno:NewHtmlDoc', // 下載爲 HTML
		'downloadas-odt': 'res/odt_16_8', // 下載爲 ODT
		'downloadas-doc': 'res/sx03162', // 下載爲 DOC
		'downloadas-docx': 'res/sx03163', // 下載爲 DOCX
		'downloadas-epub': '.uno:ExportDirectToEPUB', // 下載爲 EPUB
		// calc
		'downloadas-ods': 'res/ods_16_8', // 下載爲 ODS
		'downloadas-xls': 'res/sx03126', // 下載爲 XLS
		'downloadas-xlsx': 'res/sx03127', // 下載爲 XLSX
		// impress
		'downloadas-odp': 'res/odp_16_8', // 下載爲 ODP
		'downloadas-odg': 'res/odg_16_8', // 下載爲 ODG
		'downloadas-ppt': 'res/sx03123', // 下載爲 PPT
		'downloadas-pptx': 'res/sx03130', // 下載爲 PPTX

		// 通用的圖示
		'renamedocument': '@lc_renamedocument', // 重新命名(online 內建)
		'rev-history': '@lc_rev-history', // 檢視修訂紀錄(online 內建)

		'toggledarktheme': '@lc_toggledarktheme', // 切換深色主題(online 內建)

		'keyboard-shortcuts': '@lc_keyboardshortcuts', // 鍵盤快捷鍵(online 內建)
		'report-an-issue': '@lc_reportissue', // 回報問題(online 內建)
		'about': '@lc_about', // 關於(online 內建)

		// Impress 版面配置(menubar & conetxt menu)
		'.uno:AssignLayout?WhatLayout:long=20': 'sd/res/layout_empty', // 空白投影片
		'.uno:AssignLayout?WhatLayout:long=19': 'sd/res/layout_head01', // 只有題名
		'.uno:AssignLayout?WhatLayout:long=0': 'sd/res/layout_head03', // 題名投影片
		'.uno:AssignLayout?WhatLayout:long=1': 'sd/res/layout_head02', // 題名、內容區塊
		'.uno:AssignLayout?WhatLayout:long=32': 'sd/res/layout_textonly', // 文字置中
		'.uno:AssignLayout?WhatLayout:long=3': 'sd/res/layout_head02a', // 題名和2個內容區塊
		'.uno:AssignLayout?WhatLayout:long=12': 'sd/res/layout_head03c', // 題名、內容區塊和2個內容區塊
		'.uno:AssignLayout?WhatLayout:long=15': 'sd/res/layout_head03b', // 題名、2個內容區塊和內容區塊
		'.uno:AssignLayout?WhatLayout:long=14': 'sd/res/layout_head02b', // 題名、內容區塊在內容區塊之上
		'.uno:AssignLayout?WhatLayout:long=16': 'sd/res/layout_head03a', // 題名、2個內容區塊在內容區塊之上
		'.uno:AssignLayout?WhatLayout:long=18': 'sd/res/layout_head04', // 題名、4個內容區塊
		'.uno:AssignLayout?WhatLayout:long=34': 'sd/res/layout_head06', // 題名、6個內容區塊
		'.uno:AssignLayout?WhatLayout:long=28': 'sd/res/layout_vertical01', // 垂直題名、垂直文字
		'.uno:AssignLayout?WhatLayout:long=27': 'sd/res/layout_vertical02', // 垂直題名、文字、圖表
		'.uno:AssignLayout?WhatLayout:long=29': 'sd/res/layout_head02', // 題名、垂直文字
		'.uno:AssignLayout?WhatLayout:long=30': 'sd/res/layout_head02a', // 題名、垂直文字、美術圖形
	},

	// private methods here --------------------------------------------------------

	/**
	 * Load icon resource
	 */
	_loadIconResource: function () {
		if (this._resourceURI) {
			// load light theme icons
			fetch(this._resourceURI + 'icon:light/structure()')
			.then(function (response) {
				return response.json();
			}).then(function (json) {
				// change json.files from array to Set
				json.files = new Set(json.files);
				json.onlineFiles = new Set(json.onlineFiles);
				this._theme.light = json;
			}.bind(this))
			.catch(function (error) {
				console.error('Request failed(light)', error);
			});

			// load dark theme icons
			fetch(this._resourceURI + 'icon:dark/structure()')
			.then(function (response) {
				return response.json();
			}).then(function (json) {
				// change json.files from array to Set
				json.files = new Set(json.files);
				json.onlineFiles = new Set(json.onlineFiles);
				this._theme.dark = json;
			}.bind(this))
			.catch(function (error) {
				console.error('Request failed(dark icons)', error);
			});
		}
	},

	_setImage: function (img, name, map) {

		{ /* TODO: 實作替代 setImage() 的功能 */ }

		if (this._savedSetImage) {
			this._savedSetImage(img, name, map);
		}
	},
});

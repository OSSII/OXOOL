/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * @file color-scheme-switcher.js
 * @brief Color scheme switcher for the HTML5 UI
 * @license MIT
 * @version 1.0
 * @date 2023-8-23
 * @auther Firefly <firefly@ossii.com.tw>
 * @dependencies
 * - l10n.js
 * - global.js
 * - Bootstrap 5.3
 *
 * @note 請先載入 l10n.js 和 global.js
 */

/* global _ getURLParam */

(() => {
	'use strict';

	// 所有配色方案的圖示和文字
	const ColorSchemes = {
		auto: { // 跟隨系統配色方案
			icon: 'bi-circle-half', // 顯示的圖示，參考 https://icons.getbootstrap.com/
			text: _('Follow system settings') // 顯示的文字
		},
		light: { // 淺色模式
			icon: 'bi-sun-fill',
			text: _('Light mode')
		},
		dark: { // 暗色模式
			icon: 'bi-moon-stars-fill',
			text: _('Dark mode')
		}
	};

	/**
	 * 取得系統的配色方案。
	 * @function getSystemColorScheme
	 * @returns {string} - The system color scheme.
	 */
	const getSystemColorScheme = () => {
		// 系統支援查詢配色方案
		if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
			// 查詢系統配色方案
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		} else {
			return 'light'; // 預設為亮色模式
		}
	};

	/**
	 * 取得偏好的配色方案。優先順序：URL 參數 > localStorage > 系統設定
	 * @function getPreferredTheme
	 * @returns {string} - 偏好的 theme.只會是 auto, dark, light 其中之一
	 */
	const getPreferredColorScheme = () => {
		// 先從 URL 參數判斷，例如：?theme=dark，或 ?theme=light 或 ?theme=auto
		let theme = getURLParam('theme');

		// 參數不是有效的配色方案，就讀取 localStorage 的 theme
		if (!ColorSchemes[theme]) {
			theme = localStorage.getItem('theme');
		}

		// 最終如果 theme 不是有效的配色方案，就是 auto
		return ColorSchemes[theme] ? theme : 'auto';
	};

	/**
	 * 設定網頁預設配色方案。
	 * @function setPreferredColorScheme
	 * @param {string} theme - The preferred theme.
	 */
	const setPreferredColorScheme = (theme) => {
		// 如果 theme 不是有效的配色方案，就輸出錯誤訊息，並設定 theme 為 auto
		if (!ColorSchemes[theme]) {
			console.warn(`Invalid theme: ${theme}, set to auto.`);
			theme = 'auto';
		}

		// 把 theme 存到 localStorage
		localStorage.setItem('theme', theme);

		// 設定 HTML 的 data-bs-theme 屬性，這會讓 Bootstrap 5 根據配色方案套用對應的樣式
		document.documentElement.setAttribute('data-bs-theme',
			theme === 'auto' ? getSystemColorScheme() : theme);
	};

	//計算頁面中，最大的 z-index 值
	const getMaxZIndex = () => {
		let maxZIndex = 0;
		document.querySelectorAll('*').forEach((el) => {
			const zIndex = parseFloat(window.getComputedStyle(el).zIndex);
			if (zIndex > maxZIndex) {
				maxZIndex = zIndex;
			}
		});
		return maxZIndex;
	};

	const initializeColorSchemeSwitcher = () => {
		// 找出第一個屬性有 color-scheme-switcher 的元素，因為整頁只需要一個配色方案按鈕群組
		const colorSchemeSwitcher = document.querySelector('[color-scheme-switcher]');

		// TODO: 如果沒有配色方案按鈕群組，就就動態建立一個
		if (!colorSchemeSwitcher) {
			return;
		}

		// 檢查 position 屬性，如果是固定屬性(fixed, sticky, absolute)
		// 就加上最頂層 z-index，讓配色方案按鈕群組顯示在最上層
		const position = window.getComputedStyle(colorSchemeSwitcher).position;
		if (['fixed', 'sticky', 'absolute'].includes(position)) {
			colorSchemeSwitcher.style.zIndex = getMaxZIndex();
		}

		// 替這個元素加上這些 class
		colorSchemeSwitcher.classList.add('bi', 'bi-circle-half', 'dropdown-toggle');
		// 設定這個元素的屬性
		colorSchemeSwitcher.setAttribute('data-bs-toggle', 'dropdown');
		colorSchemeSwitcher.setAttribute('aria-expanded', 'false');
		// 設定這個元素的文字爲空字串
		colorSchemeSwitcher.textContent = ' ';

		// 建立 ul 元素，用來放配色方案按鈕
		const ulEl = document.createElement('ul');
		ulEl.className = 'dropdown-menu dropdown-menu-end text-small shadow';
		// 在 ul 元素中加入配色方案按鈕
		Object.keys(ColorSchemes).forEach((theme) => {
			const colorScheme = ColorSchemes[theme];
			const liEl = document.createElement('li');

			// 按鈕
			const btnEl = document.createElement('button');
			btnEl.setAttribute('type', 'button');
			btnEl.className = 'dropdown-item';
			btnEl.setAttribute('data-bs-theme-value', theme);
			// 圖示
			const iconEl = document.createElement('i');
			iconEl.className = 'bi ' + colorScheme.icon + ' me-2 opacity-50';
			btnEl.appendChild(iconEl);
			// 文字
			const textEl = document.createTextNode(_(colorScheme.text));
			btnEl.appendChild(textEl);

			liEl.appendChild(btnEl);

			ulEl.appendChild(liEl);
		});

		// 把 ulEl 插入到 colorSchemeSwitcher 的後面
		colorSchemeSwitcher.after(ulEl);

		// 顯示已選擇的配色方案
		showActiveColorScheme(getPreferredColorScheme());
	};

	/**
	 * 在群組中顯示被選取的配色方案按鈕，並依據配色方案，變更群組按鈕的圖示
	 *
	 * @function showActiveColorScheme
	 * @param {string} theme - The active theme.
	 * @returns {void}
	 */
	const showActiveColorScheme = (theme) => {
		// 找出所有所有 data-bs-theme-value 屬性的元素
		document.querySelectorAll('[data-bs-theme-value]').forEach((el) => {
			const isActive = el.getAttribute('data-bs-theme-value') === theme;
			// 切換 active 樣式
			el.classList.toggle('active', isActive);
			el.setAttribute('aria-pressed', isActive);
		});

		// 找出配色方案按鈕群組
		const colorSchemeSwitcher = document.querySelector('[color-scheme-switcher]');
		// 找出配色方案對應的圖示
		const colorScheme = ColorSchemes[theme];

		// 如果沒有配色方案按鈕群組，或沒有配色方案圖示，就不執行
		if (!colorSchemeSwitcher || !colorScheme) {
			return;
		}

		// 找出 colorSchemeSwitcher class 中有 'bi-' 開頭的式樣，並移除
		colorSchemeSwitcher.className = colorSchemeSwitcher.className.replace(/\s?bi-\S+/g, '');
		// 加上配色方案對應的圖示
		colorSchemeSwitcher.classList.add(colorScheme.icon);
		// 設定配色方案對應的文字
		const colorSchemeDescript = `${_('Current color scheme')}: ${_(colorScheme.text)}`;
		colorSchemeSwitcher.setAttribute('title', colorSchemeDescript);
		colorSchemeSwitcher.setAttribute('aria-label', colorSchemeDescript);
	};


	// 監控系統配色方案的變化
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (/* e */) => {
		// 如果偏好的配色方案是 auto，才需要根據系統配色方案變化而變化
		const theme = getPreferredColorScheme();
		if (theme === 'auto') {
			setPreferredColorScheme(theme);
		}
	});

	// 設定網頁預設配色方案
	const preferredColorScheme = getPreferredColorScheme();
	setPreferredColorScheme(preferredColorScheme);

	// DOM 全部載入後，處理配色方案按鈕
	document.addEventListener('DOMContentLoaded', () => {
		// 初始化配色方案按鈕群組
		initializeColorSchemeSwitcher();

		// 替所有有 data-bs-theme-value 的 element 加上 click 事件
		document.querySelectorAll('[data-bs-theme-value]').forEach((toggle) => {
			toggle.addEventListener('click', () => {
				// 讀取 data-bs-theme-value 的值，並設定為網頁配色方案
				const theme = toggle.getAttribute('data-bs-theme-value');
				setPreferredColorScheme(theme);
				showActiveColorScheme(theme, true);
			});
		});
	});

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */
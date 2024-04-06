/* -*- js-indent-level: 8; fill-column: 100 -*- */
/**
 * @file global.js
 * @brief window functions and variables.
 * @license MIT
 * @version 1.0.0
 * @date 2023.08.07
 * @details
 * window functions and variables.
 */
/* global _ getURLParam */

(() => {
	'use strict';

	/**
	 * 取得 URL 參數的值。
	 * @function getURLParam
	 * @param {string} name - The name of the URL parameter.
	 * @returns {string} - The value of the URL parameter.
	 */
	window.getURLParam = (name) => {
		let url = new URL(window.location.href);
		return url.searchParams.get(name);
	};

	/**
	 * Translates a string using the `_` function.
	 * @function _
	 * @param {string} string - The string to be translated.
	 * @returns {string} - The translated string.
	 */
	window._ = (string) => string.toLocaleString();

	// eslint-disable-next-line no-unused-vars
	const l10n = [
		_('Account'), // 帳號
		_('Password'), // 密碼
		_('Sign in'), // 登入
		_('OSS Integral Institute Co., Ltd.'), // 晟鑫科技股份有限公司
	];

	/**
	 * 取得偏好的語言。優先順序：URL 參數 > 瀏覽器設定
	 * @function getPreferredLanguage
	 * @returns {string} - The preferred language.
	 */
	const getPreferredLanguage = () => {
		let lang = getURLParam('lang');

		// 如果沒有 URL 參數，就讀取 localStorage 的 lang
		if (!lang) {
			lang = localStorage.getItem('lang');
		}

		// 最終沒有 lang，就設為 auto
		return !lang ? 'auto' : lang;
	};

	const setPreferredLanguage = (lang) => {
		localStorage.setItem('lang', lang); // 把 lang 存到 localStorage
		// 如果 lang 是 auto，就取得瀏覽器的語言
		if (lang === 'auto') {
			lang = navigator.language;
		}
		document.documentElement.setAttribute('lang', lang); // 設定 HTML 的 lang 屬性
		String.locale = lang; // 設定 String 的 locale(這會載入該語言的 json 檔)
		String.toLocaleString('./localizations.json');
	};

	// 監控瀏覽器語言的變化
	window.addEventListener('languagechange', () => {
		// 如果偏好的語言是 auto，才需要根據瀏覽器語言變化而變化
		const lang = getPreferredLanguage();
		if (lang === 'auto') {
			localStorage.setItem('lang', lang); // 把 lang 存到 localStorage
			// 重新載入網頁
			window.location.reload();
		}
	});

	// 設定網頁預設語言
	setPreferredLanguage(getPreferredLanguage());

	/**
	 * 找出所有 input 元素，且 type 為 password 且屬性 visibility-toggle，且 class 中有 form-control
	 * 並加上切換密碼顯示或隱藏的功能
	 * @function passwordVisibilityToggle
	 * @returns {void}
	 */
	const passwordVisibilityToggle = () => {
		// 找出所有 input 元素，且 type 為 password 且屬性 visibility-toggle，且 class 中有 form-control
		document.querySelectorAll('input[type="password"][visibility-toggle].form-control').forEach((el) => {
			const setToggle = (toggleEl, passwordEl, clicked = false) => {
				// 如果是點擊事件，就把 type 換成 text 或 password
				if (clicked) {
					passwordEl.setAttribute('type', passwordEl.getAttribute('type') === 'password' ? 'text' : 'password');
				}
				const type = passwordEl.getAttribute('type');
				const desc = type === 'password' ? _('Show password') : _('Hide password');
				toggleEl.setAttribute('title', desc);
				toggleEl.setAttribute('aria-label', desc);
				// 如果 type 是 password，把 toggle 的 class 中的 bi-eye 換成 bi-eye-slash，否則就是 bi-eye
				toggleEl.className = toggleEl.className.replace(/bi-eye(-slash)?/, type === 'password' ? 'bi-eye-slash' : 'bi-eye');
			};
			// 取得元素的父元素
			const parentEl = el.parentElement;
			// 新增一個元素，用來切換密碼顯示或隱藏
			const toggleEl = document.createElement('span');
			toggleEl.className = 'opacity-50 bi bi-eye-slash';
			toggleEl.style.cursor = 'pointer';
			// 如果父元素的 class 有 form-floating
			if (parentEl.classList.contains('form-floating')) {
				// 新增 position-absolute 的 class
				toggleEl.classList.add('position-absolute');
				toggleEl.style.top = '0';
				toggleEl.style.right = '0';
				toggleEl.style.padding = '1rem 0.75rem';
				setToggle(toggleEl, el);
				// 加到父元素的最後面
				parentEl.appendChild(toggleEl);
			} else {
				// 如果父元素的 class 沒有 input-group
				if (!parentEl.classList.contains('input-group')) {
					// 新增一個有 input-group 的 div 元素
					const divEl = document.createElement('div');
					divEl.className = 'input-group';
					// 把 el 抽出來，加到 divEl 裡面
					parentEl.insertBefore(divEl, el);
					divEl.appendChild(el);
				}
				// 用來切換密碼顯示或隱藏的元素，加上 input-group-text 的 class
				toggleEl.classList.add('input-group-text');
				setToggle(toggleEl, el);
				// 把 toggleEl 插入到 el 的後面
				el.after(toggleEl);
			}

			// 如果 toggleEl 有父元素，表示可以切換密碼顯示或隱藏
			if (toggleEl.parentElement) {
				// 點擊元素時，依據密碼欄位的 type 屬性值切換
				toggleEl.addEventListener('click', (e) => {
					e.preventDefault();
					setToggle(toggleEl, el, true);
				});
			} else {
				// 刪除元素
				toggleEl.remove();
			}
		});
	};

	// 需要翻譯的 attributes
	const attributes = ['_', 'alt', 'title', 'placeholder', 'aria-label', 'aria-placeholder'];
	// attributes 的 querySelectorAll 字串
	const queryAttributes = attributes.map((attr) => '[' + attr + ']').join(',');

	/**
	 * Translates the attributes of an element or an element with a specific ID.
	 * @namespace translate
	 * @memberof window
	 * @example
	 * // 翻譯 element
	 * translate.element(document.querySelector('#id'));
	 * // 翻譯 ID 為 id 的 element
	 * translate.elementById('id');
	 */
	window.translate = {
		/**
		 * Translates the attributes of an element.
		 * @memberof window.translate
		 * @function element
		 * @param {Element} el - The element to be translated.
		 */
		element: function(el) {
			// 把有需要翻譯的 attribs 的 element 的 attribs 翻譯
			attributes.forEach((attr) => {
				if (el.hasAttribute(attr)) {
					let origText = el.getAttribute(attr); // 該 attrib 的原始值
					// 若 attrib 是 '_'，需要檢測是否有原始值，若沒有就翻譯 textContent
					if (attr === '_') {
						// 有原始值，新的 textContent 為原始值翻譯後的值，否則翻譯 textConten
						el.textContent = origText ? _(origText) : _(el.textContent);
					} else if (origText) { // 若 attrib 有原始值，就翻譯
						el.setAttribute(attr, _(origText));
					} else { // 若 attrib 沒有原始值，顯示錯誤訊息
						console.error('Attribute "' + attr + '" of element "' + el.nodeName + '" has no value.');
					}
				}
			});
		},

		elementById: function(id) {
			let element = document.getElementById(id);
			if (element) {
				this.element(element);
			} else {
				console.error('elementById: Element with ID "' + id + '" not found.');
			}
		},

		/**
		 *
		 * @function elementContainer
		 * @param {Element} container - 準備翻譯的 element 的 container
		 * @memberof window.translate
		 */
		container: function(container) {
			// 判斷 container 是不是 element
			if (!(container instanceof Element)) {
				console.error('Element not found.', container);
				return;
			}
			container.querySelectorAll(queryAttributes).forEach((el) => this.element(el));
		},

		/**
		 * Translates the attributes of an element with a specific ID.
		 * @function
		 * @param {string} id - The ID of the element to be translated.
		 */
		containerById: function(id) {
			let element = document.getElementById(id);
			if (element) {
				this.container(element);
			} else {
				console.error('Element with ID "' + id + '" not found.');
			}
		},

		/**
		 * Translates the attributes of the entire page.
		 * @function
		 */
		page: function() {
			this.container(document.head);
			this.container(document.body);
		}
	};

	/**
	 *
	 * @param {object} object - The object to be translated.
	 * @param {string} object.url - The URL to which to send the request.
	 * @param {string} object.method - The HTTP method to use for the request (e.g. "GET", "POST", "PUT"). default: "GET"
	 * @param {boolean} object.async - An optional boolean parameter, defaulting to true, indicating whether or not to perform the operation asynchronously. If this value is false, the send() method does not return until the response is received. If true, notification of a completed transaction is provided using event listeners. This must be true if the multipart attribute is true, or an exception will be thrown. If this value is false, the responseType property of the request object is ignored.
	 * @param {boolean} object.cache - An optional boolean property, defaulting to true, indicating whether the browser should cache the requested pages. If set to false, the browser is forced to contact the server for the document, and the server is not told that the document can be cached.
	 * @param {function} object.beforeSend - 開始傳送前的回呼函式，預設是空函式
	 * @param {function} object.progress - 進度回呼函式，預設是空函式
	 * @param {function} object.success - 成功回呼函式，預設是空函式
	 * @param {function} object.error - 錯誤回呼函式，預設是空函式
	 * @param {function} object.complete - 完成回呼函式，預設是空函式
	 * @param {object} object.data - 要傳送的資料，預設是 null
	 * @param {string} object.contentType - 設定 Content-Type，預設是 application/json
	 * @param {string} object.dataType - 設定 dataType，若有指定，轉成小寫
	 * @param {string} object.username - The optional user name to use for authentication purposes; by default, this is an empty string.
	 * @param {string} object.password - The optional password to use for authentication purposes; by default, this is an empty string.
	 * @returns {void}
	 * @example
	 * // GET
	 * ajax({
	 *    url: 'https://example.com/api',
	 *   success: (data) => {
	 * 	 console.log(data);
	 *  }
	 * });
	 */
	window.ajax = (object) => {
		let url = object.url === undefined ? '' : object.url;
		const method = object.method === undefined ? 'GET' : object.method; // 預設是 GET
		const async = object.async === undefined ? true : object.async; // 預設是 true
		const cache = object.cache === undefined ? true : object.cache; // 預設是 true
		const beforeSend = object.beforeSend === undefined ? () => {} : object.beforeSend; // 開始傳送前的回呼函式，預設是空函式
		const progress = object.progress === undefined ? () => {} : object.progress; // 進度回呼函式，預設是空函式
		const success = object.success === undefined ? () => {} : object.success; // 成功回呼函式，預設是空函式
		const error = object.error === undefined ? () => {} : object.error; // 錯誤回呼函式，預設是空函式
		const complete = object.complete === undefined ? () => {} : object.complete; // 完成回呼函式，預設是空函式
		const data = object.data === undefined ? null : object.data; // 預設是 null
		const contentType = object.contentType === undefined ? null : object.contentType; // 預設是 application/json
		//  設定 dataType，若有指定，轉成小寫
		const dataType = object.dataType === undefined ? '' : object.dataType.toLowerCase();

		// 產生一個 XMLHttpRequest 物件
		let xhr = new XMLHttpRequest();

		// 監控 progress
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) {
				progress(e.loaded, e.total);
			}
		});

		// 設定 responseType
		if (dataType === 'json' || dataType === 'document' || dataType === 'blob' || dataType === 'arraybuffer') {
			xhr.responseType = dataType;
		}

		// 設定 Content-Type
		if (contentType) {
			xhr.setRequestHeader('Content-Type', contentType);
		}

		// 設定 no cache
		if (!cache) {
			xhr.setRequestHeader('Cache-Control', 'no-cache');
			// 加上時間戳記
			url += (url.indexOf('?') === -1 ? '?' : '&') + Date.now();
		}

		// 設定 method, url, async
		xhr.open(method, url, async, object.username, object.password);

		// 設定 beforeSend
		beforeSend(xhr);

		// 設定回呼函式
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					switch (xhr.responseType) {
						case 'document':
							success(xhr.responseXML);
							break;
						case 'json':
						case 'blob':
						case 'arraybuffer':
							success(xhr.response);
							break;
						default:
							if (dataType === 'json') {
								try {
									success(JSON.parse(xhr.responseText));
								} catch (e) {
									console.error('Failed to parse JSON:', e);
								}
							} else {
								success(xhr.responseText);
							}
					}
				} else {
					error(xhr.status, xhr.responseText);
				}
				complete(xhr, xhr.status);
			}
		};
		// 設定錯誤回呼函式
		xhr.onerror = () => {
			error(-1);
			complete(-1);
		};

		// 傳送資料
		xhr.send(data);
	};

	// DOM 全部載入後執行
	document.addEventListener('DOMContentLoaded', () => {
		// 優先翻譯整頁
		window.translate.page();
		// 設定含有屬性 data-target="visibilitytoggle" 的輸入欄位，增加可以切換密碼顯示的功能
		passwordVisibilityToggle();
	});

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */
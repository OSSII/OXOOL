/* -*- js-indent-level: 8; fill-column: 100 -*- */
/*
 * Copyright the OxOffice Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global L _ bootstrap */

/**
 * @function L.Toast
 * @description Show toast
 *
 * @param {object|string} options - options of toast, if string, it is content of toast
 * @param {string} options.title - title of toast. if not set, no title
 * @param {string} options.content - content of toast
 * @param {number} options.delay - delay of toast, default is 5000ms
 * @param {string} options.type - type of toast('primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'), default is 'primary'
 */
L.Toast = function (options) {
	// options can be string or object
	var title = null;
	var message = null;
	var delay = 5000;
	var textBgColor = 'text-bg-primary';
	if (typeof options === 'string') {
		message = options;
	} else {
		title = options.title !== undefined ? options.title : null;
		message = options.content !== undefined ? options.content : null;
		delay = options.delay !== undefined ? options.delay : 5000;
		textBgColor = options.type !== undefined ? 'text-bg-' + options.type : 'text-bg-primary';
	}

	// least required message to create a toast
	if (message === null) {
		console.error('Message is required to create a toast.');
		return;
	}

	// 檢查是否存在 toast 容器，若不存在則建立一個
	var toastContainer = document.getElementById('OxOOL-Toast-Container');
	if (!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'OxOOL-Toast-Container';
		toastContainer.classList.add('toast-container', 'position-fixed', 'bottom-0', 'start-50', 'translate-middle-x', 'p-3');
		toastContainer.style.position = 'fixed';
		document.body.appendChild(toastContainer);
	}

	// 建立 toast 元素
	var toast = document.createElement('div');
	toast.classList.add('toast', 'align-items-center', 'border-0', textBgColor);
	toast.setAttribute('role', 'alert');
	toast.setAttribute('aria-live', 'assertive');
	toast.setAttribute('aria-atomic', 'true');

	// create tost content
	var toastContent = document.createElement('div');
	toastContent.classList.add('toast-body');
	toastContent.innerText = message;

	// create close button
	var toastClose = document.createElement('button');
	toastClose.type = 'button';
	toastClose.classList.add('btn-close');
	toastClose.setAttribute('data-bs-dismiss', 'toast');
	toastClose.setAttribute('aria-label', 'Close');

	if (title !== null) {
		var toastHeader = document.createElement('div');
		toastHeader.classList.add('toast-header');
		var toastHeaderTitle = document.createElement('strong');
		toastHeaderTitle.classList.add('me-auto');
		toastHeaderTitle.innerText = title;
		toastHeader.appendChild(toastHeaderTitle);
		toastHeader.appendChild(toastClose);
		toast.appendChild(toastHeader);
		toast.appendChild(toastContent);
	} else {
		var toastFlex = document.createElement('div');
		toastFlex.classList.add('d-flex');
		toastFlex.appendChild(toastContent);
		toastClose.classList.add('me-2', 'm-auto');
		toastFlex.appendChild(toastClose);
		toast.appendChild(toastFlex);
	}

	// 將 toast 元素加入到 toast 容器中
	toastContainer.appendChild(toast);

	// 初始化並顯示 toast
	var bootstrapToast = new bootstrap.Toast(toast, {
		animation: true,
		autohide: delay > 0,
		delay: delay
	});

	bootstrapToast.show();

	//
	toast.addEventListener('hidden.bs.toast', function () {
		this.remove();
	});
};

L.Toast.success = function (message, delay) {
    var options = {
        content: message,
        type: 'success',
        delay: delay === undefined ? 0 : delay
    };
    L.Toast(options);
};

L.Toast.error = function (message, delay) {
    var options = {
        content: message,
        type: 'danger',
        delay: delay === undefined ? 0 : delay
    };
    L.Toast(options);
};

L.Toast.warning = function (message, delay) {
    var options = {
        content: message,
        type: 'warning',
        delay: delay === undefined ? 0 : delay
    };
    L.Toast(options);
};

L.Toast.info = function (message, delay) {
    var options = {
        content: message,
        type: 'info',
        delay: delay === undefined ? 0 : delay
    };
    L.Toast(options);
};

L.Toast.message = function (message, delay) {
    var options = {
        content: message,
        type: 'secondary',
        delay: delay === undefined ? 0 : delay
    };
    L.Toast(options);
};

/* vim: set ts=8 sts=8 sw=8 tw=100: */

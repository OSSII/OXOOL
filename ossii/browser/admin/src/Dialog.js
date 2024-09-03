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

/* global L _ bootstrap Form */

/**
 * @class L.dialog
 *
 * @classdesc
 *
 * @param {Object} options
 * @param {context} options.bind - bind context of button action
 * @param {string} options.size - size of dialog('small', 'default', 'large', 'extra') if not set, default is 'default'
 * @param {boolean} options.backdrop - backdrop of dialog. if not set, default is true
 * @param {boolean} options.focus - focus on dialog when shown. if not set, default is true
 * @param {boolean} options.keyboard - Closes the dialog when escape key is pressed. if not set, default is true
 * @param {String} options.title - title of dialog. if not set, no title
 * @param {String|HTMLElement} options.content - content of dialog
 * @param {Object} options.form - form of dialog
 * @param {Array} options.buttons - buttons of dialog. if not set, no buttons
 * @param {String} options.buttons.text - text of button
 * @param {Boolean} options.buttons.primary - primary button or not
 * @param {Function} options.buttons.action - action of button
 * @param {Function} options.onShow - action on show
 * @param {Function} options.onHide - action on hide
 */

L.dialog = L.Class.extend({
	options: {
	},

	initialize: function (options) {
		switch (options.size) {
			case 'small':
				options.size = 'modal-sm';
				break;
			case 'large':
				options.size = 'modal-lg';
				break;
			case 'extra':
				options.size = 'modal-xl';
				break;
			default:
				options.size = '';
				break;
		}

		options.backdrop = options.backdrop === false ? 'static' : true;
		options.focus = options.focus === false ? false : true;
		options.keyboard = options.keyboard === false ? false : true;

		L.setOptions(this, options);

		L.Util.stamp(this); // generate a unique id, id name is _leaflet_id

		this._createDialog();
	},

	show: function () {
		this._modal.show();
	},

	hide: function () {
		this._modal.hide();
	},

	destroy: function () {
		this._dialog.remove();
	},

	getBody: function () {
		return this._dialog.querySelector('.modal-body');
	},

	getFooter: function () {
		return this._dialog.querySelector('.modal-footer');
	},

	_dialog: null, // dialog element

	_createDialog: function () {
		var dialog = document.createElement('div'); // modal
		dialog.classList.add('modal', 'fade');
		dialog.setAttribute('tabindex', '-1');
		dialog.id = 'OxOOL-Dialog-' + this._leaflet_id;

		var dialogContent = document.createElement('div'); // modal-dialog
		dialogContent.classList.add('modal-dialog', 'modal-dialog-centered', 'modal-dialog-scrollable');
		if (this.options.size !== '') {
			dialogContent.classList.add(this.options.size); // dialog size
		}

		dialog.appendChild(dialogContent);

		var dialogContentInner = document.createElement('div'); // modal-content
		dialogContentInner.classList.add('modal-content');
		dialogContent.appendChild(dialogContentInner);

		// if title is set, add title element and close button
		if (this.options.title !== undefined) {
			var dialogHeader = document.createElement('div'); // modal-header
			dialogHeader.classList.add('modal-header');
			dialogContentInner.appendChild(dialogHeader);

			var dialogHeaderTitle = document.createElement('h5'); // modal-title
			dialogHeaderTitle.classList.add('modal-title');
			dialogHeader.appendChild(dialogHeaderTitle);
			dialogHeaderTitle.innerHTML = this.options.title;

			var dialogHeaderClose = document.createElement('button'); // modal-close
			dialogHeaderClose.classList.add('btn-close');
			dialogHeaderClose.setAttribute('data-bs-dismiss', 'modal');
			dialogHeaderClose.setAttribute('aria-label', 'Close');
			dialogHeader.appendChild(dialogHeaderClose);
		}


		var dialogBody = document.createElement('div'); // modal-body
		dialogBody.classList.add('modal-body');
		dialogContentInner.appendChild(dialogBody);

		if (this.options.content) {
			if (typeof this.options.content === 'string') {
				dialogBody.innerHTML = this.options.content;
			} else if (typeof this.options.content === 'object') {
				// randering content element
			}
		} else if (typeof this.options.form === 'object') {
			// randering form
			this._createForm(dialogBody, this.options.form);
		}

		if (L.Util.isArray(this.options.buttons)) {
			var dialogFooter = document.createElement('div'); // modal-footer
			dialogFooter.classList.add('modal-footer');
			dialogContentInner.appendChild(dialogFooter);

			// add buttons to footer
			this.options.buttons.forEach(function (button) {
				var dialogFooterButton = document.createElement('button'); // modal-button
				dialogFooterButton.classList.add('btn', 'btn-sm',
					'btn-' + (button.primary === true ? 'primary' : 'secondary'));
				dialogFooterButton.innerHTML = button.text;
				dialogFooter.appendChild(dialogFooterButton);

				dialogFooterButton.addEventListener('click', function () {
					if (typeof button.onClick === 'function') {
						if (this.options.bind) {
							button.onClick.bind(this.options.bind)();
						} else {
							button.onClick();
						}
					}
					this._modal.hide(); // !!!IMPORTANT: must hide dialog after click button
				}.bind(this));

			}.bind(this));
		}

		this._modal = new bootstrap.Modal(dialog, {
			backdrop: this.options.backdrop,
			focus: this.options.focus,
			keyboard: this.options.keyboard,
		});

		// When the dialog is hidden, destroy it.
		dialog.addEventListener('hidden.bs.modal', function () {
			this.remove(); // remove dialog
		});

		this._dialog = dialog;

		return this._dialog;
	},

	_createForm: function (container, form) {
		var formEl = Form.create(form);
		formEl.classList.add('row', 'g-3');
		container.appendChild(formEl);
	},
});

L.Dialog = function (options) {
	return new L.dialog(options);
};

/**
 * @function L.Dialog.alert
 * @description Show alert dialog
 *
 * @param {object | string} options - options of dialog, if string, it is content of dialog
 * @param {string} options.size - size of dialog('small', 'default', 'large', 'extra') if not set, default is 'default'
 * @param {string} options.title - title of dialog. if not set, no title
 * @param {string} options.content - content of dialog
 */
L.Dialog.alert = function (options) {
	var alertOptions = {
		backdrop: false,
		keyboard: false,
		focus: false,
		buttons: [{
			text: _('OK'),
			primary: true,
		}],
	};

	// options can be string or object

	if (typeof options === 'string') {
		alertOptions.content = options; // set content
	} else {
		alertOptions.size = options.size;
		alertOptions.title = options.title;
		alertOptions.content = options.content;
	}

	var dialog = new L.dialog(alertOptions);

	if (alertOptions.title === undefined) {
		// set border-top to 0
		dialog.getFooter().style.borderTop = '0'; // remove border-top, no border-top line
	}

	dialog.show();
};

/**
 * @function L.Dialog.confirm
 * @description Show confirm dialog
 * @param {object} options - options of dialog
 * @param {string} options.size - size of dialog('small', 'default', 'large', 'extra') if not set, default is 'default'
 * @param {string} options.title - title of dialog. if not set, no title
 * @param {string} options.content - content of dialog
 * @param {function} options.callback - callback function when click button
 * @param {object} options.bind - bind context of callback function
 */

L.Dialog.confirm = function (options) {
	var confirmOptions = {
		size: options.size,
		title: options.title,
		content: options.content,
		buttons: [{
			text: _('Cancel'),
			onClick: function () {
				if (options.callback) {
					if (options.bind) {
						options.callback.bind(options.bind)(false);
					} else {
						options.callback(false);
					}
				}
			}
		},
		{
			text: _('OK'),
			primary: true,
			onClick: function () {
				if (options.callback) {
					if (options.bind) {
						options.callback.bind(options.bind)(true);
					} else {
						options.callback(true);
					}
				}
			}
		}],
	};

	var dialog = new L.dialog(confirmOptions);

	if (confirmOptions.title === undefined) {
		// set border-top to 0
		dialog.getFooter().style.borderTop = '0'; // remove border-top, no border-top line
	}

	dialog.show();
};

/**
 * @function L.Dialog.prompt
 * @description Show prompt dialog
 *
 * @param {object} options - options of dialog
 * @param {string} options.size - size of dialog('small', 'default', 'large', 'extra') if not set, default is 'default'
 * @param {string} options.title - title of dialog. if not set, no title
 * @param {string} options.content - content of dialog
 * @param {string} options.label - label of input
 * @param {string} options.value - value of input
 * @param {string} options.description - description of input
 * @param {function} options.callback - callback function when click button
 * @param {object} options.bind - bind context of callback function
 */
L.Dialog.prompt = function (options) {
	var promptOptions = {
		size: options.size,
		title: options.title,
		content: options.content,
		buttons: [{
			text: _('Cancel'),
			onClick: function () {
				if (options.callback) {
					if (options.bind) {
						options.callback.bind(options.bind)(null);
					} else {
						options.callback(null);
					}
				}
			}
		},
		{
			text: _('OK'),
			primary: true,
			onClick: function () {
				var value = dialog.getBody().querySelector('input').value;
				if (options.callback) {
					if (options.bind) {
						options.callback.bind(options.bind)(value);
					} else {
						options.callback(value);
					}
				}
			}
		}],
	};

	var dialog = new L.dialog(promptOptions);

	var dialogBody = dialog.getBody();
	if (options.label !== undefined) {
		var label = document.createElement('label');
		label.classList.add('form-label');
		label.innerHTML = options.label;
		dialogBody.appendChild(label);
	}

	var input = document.createElement('input');
	input.classList.add('form-control');
	input.type = 'text';
	input.value = options.value ? options.value : '';
	dialogBody.appendChild(input);

	if (options.description !== undefined) {
		var description = document.createElement('div');
		description.classList.add('form-text');
		description.innerHTML = options.description;
		dialogBody.appendChild(description);
	}

	if (promptOptions.title === undefined) {
		// set border-top to 0
		dialog.getFooter().style.borderTop = '0'; // remove border-top, no border-top line
	}

	dialog.show();
};

/* vim: set ts=8 sts=8 sw=8 tw=100: */

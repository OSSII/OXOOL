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
/*
 * L.Form class is helper class for creating form elements.
 */
/* global Base Set */
var Form = Base.extend({
	constructor: null

}, { // class interface
    create: function (form) {
        var formEl = document.createElement('form');
        if (form.id !== undefined) {
            formEl.id = form.id;
        }
        if (form.name !== undefined) {
            formEl.name = form.name;
        }
        if (form.action !== undefined) {
            formEl.action = form.action;
        }
        if (form.method !== undefined) {
            formEl.method = form.method;
        }
        if (form.enctype !== undefined) {
            formEl.enctype = form.enctype;
        }
        if (form.target !== undefined) {
            formEl.target = form.target;
        }
        if (form.novalidate === true) {
            formEl.noValidate = true;
        }

        return formEl;
    },

	_inputTypes: {
		'text': {
			classes: ['form-control'],
		},
		'hidden': {
			classes: ['form-control'],
		},
		'search': {
			classes: ['form-control'],
		},
		'url': {
			classes: ['form-control'],
		},
		'tel': {
			classes: ['form-control'],
		},
		'email': {
			classes: ['form-control'],
		},
		'password:': {
			classes: ['form-control'],
		},
		'date': {
			classes: ['form-control'],
		},
		'month': {
			classes: ['form-control'],
		},
		'week': {
			classes: ['form-control'],
		},
		'time': {
			classes: ['form-control'],
		},
		'datetime-local': {
			classes: ['form-control'],
		},
		'number': {
			classes: ['form-control'],
		},
		'range': {
			classes: ['form-control'],
		},
		'color': {
			classes: ['form-control'],
		},
		'checkbox': {
			classes: ['form-check-input'],
		},
		'radio': {
			classes: ['form-check-input'],
		},
		'file': {
			classes: ['form-control'],
		},
		'image': {
			classes: ['form-control'],
		},
		'button': {
			classes: ['btn'],
		},
		'reset': {
			classes: ['btn'],
		},
		'submit': {
			classes: ['btn'],
		},
		'select': {
			classes: ['form-select'],
		},
		'textarea': {
			classes: ['form-control'],
		},
	},

    /**
	 * Create input element.
	 *
	 * @param {Object} item - Item object
	 * @param {string} item.type - Input type
	 * @param {string} item.id - Input id
	 * @param {string} item.name - Input name, if not set, use id as name
	 * @param {string} item.value - Input value
	 * @param {boolean} item.disabled - Input disabled
	 * @param {boolean} item.readonly - Input readonly
	 * @param {string} item.placeholder - Input placeholder
	 * @param {boolean} item.required - Input required
	 * @param {string} item.min - Input min
	 * @param {string} item.max - Input max
	 * @param {string} item.step - Input step
	 * @param {Array} item.options - Input options for select
	 * @param {boolean} item.checked - Input checked
	 * @param {string} item.list - Input list
	 * @param {string} item.pattern - Input pattern
	 * @param {Object || Array} item.attributes - Input attributes
	 *
	 * @param {string || Object || Array} additionalClasses - Additional classes
	 *
	 * @returns {HTMLElement} - Input element
	 */
    createInput: function (item, additionalClasses) {
		// check input type
		var inputType = this._inputTypes[item.type];
		if (inputType === undefined) {
			console.error('Input type is not supported: ' + item.type);
			return null;
		}

        var specialTypes = new Set(['select', 'textarea']);
		var inputEl = null;
		// create input element
		if (!specialTypes.has(item.type)) {
			inputEl = document.createElement('input');
			inputEl.setAttribute('type', item.type);
		} else {
			inputEl = document.createElement(item.type);
		}

		// set options for select
		if (item.type === 'select' && Array.isArray(item.options)) {
			// option 可以是 optgroup 或 option，所以要判斷
			item.options.forEach(function (option) {
				var optionEl = null;
				if (option.options !== undefined) {
					optionEl = document.createElement('optgroup');
					optionEl.label = option.label;
					option.options.forEach(function (opt) {
						var optEl = document.createElement('option');
						optEl.value = opt.value;
						optEl.innerHTML = opt.text ? opt.text : opt.value;
						optionEl.appendChild(optEl);
					});
				} else {
					optionEl = document.createElement('option');
					optionEl.value = option.value;
					optionEl.innerHTML = option.text ? option.text : option.value;
				}
				inputEl.appendChild(optionEl);
			});
		}

		// set classes
		inputType.classes.forEach(function (className) {
			inputEl.classList.add(className);
		});

		if (typeof additionalClasses === 'string') {
			var classesArray = additionalClasses.split(' ');
			classesArray.forEach(function (className) {
				inputEl.classList.add(className);
			});
		} else if (typeof additionalClasses === 'object') {
			for (var key in additionalClasses) {
				inputEl.classList.add(additionalClasses[key]);
			}
		} else if (Array.isArray(additionalClasses)) {
			additionalClasses.forEach(function (className) {
				inputEl.classList.add(className);
			});
		}

		if (item.id !== undefined) {
			inputEl.id = item.id; // set id
		}

		if (item.name !== undefined) {
			inputEl.name = item.name; // set name
		} else if (item.id !== undefined) {
			inputEl.name = item.id; // set name as id
		}

		// set value
		if (item.type !== 'image' && item.value !== undefined) {
			inputEl.value = item.value;
		}

		// set disabled attribute
		if (item.disabled === true) {
			inputEl.disabled = true;
		}

		// set readonly attribute
		var readonlyTypesExcept = new Set(['hidden', 'range', 'color', 'checkbox', 'radio', 'button']);
		if (item.readonly === true && !readonlyTypesExcept.has(item.type)) {
			inputEl.readOnly = true;
		}

		// set placeholder attribute
		var placeholderTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);
		if (item.placeholder !== undefined && placeholderTypes.has(item.type)) {
			inputEl.placeholder = item.placeholder;
		}

		// set required attribute
		var requiredTypesExcept = new Set(['hidden', 'range', 'color', 'button']);
		if (item.required === true && !requiredTypesExcept.has(item.type)) {
			inputEl.required = true;
		}

		// set min, max, step
		var numberTypes = new Set(['date', 'month', 'week', 'time', 'datetime-local', 'number', 'range']);
		if (numberTypes.has(item.type)) {
			if (item.min !== undefined) {
				inputEl.min = item.min;
			}
			if (item.max !== undefined) {
				inputEl.max = item.max;
			}
			if (item.step !== undefined) {
				inputEl.step = item.step;
			}
		}

		// set checked
		var checkTypes = new Set(['checkbox', 'radio']);
		if (checkTypes.has(item.type) && item.checked === true) {
			inputEl.checked = true;
		}

		// set list attribute.
		// please refer to https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist
		var listTypesExcept = new Set(['hidden', 'password', 'checkbox', 'radio', 'button']);
		if (!listTypesExcept.has(item.type) && item.list !== undefined) {
			inputEl.setAttribute('list', item.list);
		}

		// set pattern attribute
		var patternTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password']);
		if (item.pattern !== undefined && patternTypes.has(item.type)) {
			inputEl.pattern = item.pattern;
		}

		// set other attributes
		if (typeof item.attributes === 'object') {
			for (var key in item.attributes) {
				inputEl.setAttribute(key, item.attributes[key]);
			}
		} else if (Array.isArray(item.attributes)) {
			item.attributes.forEach(function (attr) {
				inputEl.setAttribute(attr.name, attr.value);
			});
		}

		// set role="switch" for switch type
		if (item.type === 'checkbox' && item.switch === true) {
			inputEl.setAttribute('role', 'switch');
		}

		// TODO: if item.type is password and set item.visible-toggle, add toggle button


		return inputEl;
    },
});

/* vim: set ts=8 sts=8 sw=8 tw=100: */

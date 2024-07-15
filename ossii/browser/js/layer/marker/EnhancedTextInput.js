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
/* global app _ */

L.EnhancedTextInput = L.Layer.extend({
	initialize: function (options) {
		L.setOptions(this, options);

		// Flag to denote the composing state, derived from
		// compositionstart/compositionend events; unused
		this._isComposing = false;

		/**
		 * In the composing state, Chrome will trigger the following sequence of events
		 * when the user clicks on the document area:
		 *
		 * 1. compositionend event
		 * 2. input event twice:
		 *    2.1 inputTypt = 'deleteContentBackward'
		 *    2.2 inputType = 'insertText' (and event.data is the same as compositionend.data)
		 * 3. textArea.blur event
		 *
		 * As a result, the same data will be entered twice.
		 * The solution is to record the timestamp of the most recent compositionend.
		 * Every time the input event is triggered, the time difference between the two times is checked.
		 * If it is too close, it means that this phenomenon is very likely to occur.
		 *
		 * At this time, the most recent input event is ignored.
		 */
		this._compositionendTimestamp = 0;
		// The time difference between the end of the composition and the input event.
		this._compositionendTimeDiff = 5; // 5ms

		// If the last focus intended to accept user input.
		// Signifies whether the keyboard is meant to be visible.
		this._setAcceptInput(false);

		this._isDebugOn = false;

		this._initLayout();

		// Under-caret orange marker.
		this._cursorHandler = L.marker(new L.LatLng(0, 0), {
			icon: L.divIcon({
				className: 'leaflet-cursor-handler',
				iconSize: null
			}),
			draggable: true
		}).on('dragend', this._onCursorHandlerDragEnd, this);
	},

	hasAccessibilitySupport: function () {
		return false;
	},

	onAdd: function () {
		if (this._container) {
			this.getPane().appendChild(this._container);
			this.update();
		}

		this._map.on('updatepermission', this._onPermission, this);
		this._map.on('commandresult', this._onCommandResult, this);
		L.DomEvent.on(this._textArea, 'focus blur', this._onFocusBlur, this);

		// Do not wait for a 'focus' event to attach events if the
		// textarea/contenteditable is already focused (due to the autofocus
		// HTML attribute, the browser focusing it on DOM creation, or whatever)
		if (document.activeElement === this._textArea) {
			this._onFocusBlur({ type: 'focus' });
		}

		if (window.ThisIsTheiOSApp) {
			var that = this;
			window.MagicToGetHWKeyboardWorking = function () {
				var that2 = that;
				window.MagicKeyDownHandler = function (e) {
					that2._onKeyDown(e);
				};
				window.MagicKeyUpHandler = function (e) {
					that2._onKeyUp(e);
				};
			};
			window.postMobileMessage('FOCUSIFHWKBD');
		}

		L.DomEvent.on(this._map.getContainer(), 'mousedown touchstart', this._abortComposition, this);
	},

	onRemove: function () {
		window.MagicToGetHWKeyboardWorking = null;
		window.MagicKeyDownHandler = null;
		window.MagicKeyUpHandler = null;

		if (this._container) {
			this.getPane().removeChild(this._container);
		}

		this._map.off('updatepermission', this._onPermission, this);
		this._map.off('commandresult', this._onCommandResult, this);
		L.DomEvent.off(this._textArea, 'focus blur', this._onFocusBlur, this);
		L.DomEvent.off(this._map.getContainer(), 'mousedown touchstart', this._abortComposition, this);

		this._map.removeLayer(this._cursorHandler);
	},

	disable: function () {
		this._textArea.setAttribute('disabled', true);
	},

	enable: function () {
		this._textArea.removeAttribute('disabled');
	},

	_onPermission: function (e) {
		if (e.perm === 'edit') {
			this._textArea.removeAttribute('disabled');
		} else {
			this._textArea.setAttribute('disabled', true);
		}
	},

	_onCommandResult: function (e) {
		if (this.hasAccessibilitySupport())
			return;

		if (e.commandName === '.uno:Undo' || e.commandName === '.uno:Redo') {
			//undoing something does not trigger any input method
			// this causes the editable area content not to be a substring
			// of the document text; moreover this causes problem
			// in mobile working with suggestions:
			//i.e: type "than" and then select "thank" from suggestion
			//now undo and then again select "thanks" from suggestions
			//final output is "thans"
			//this happens because undo doesn't change the editable area content.
			//So better to clean the editable area content.
			this._emptyArea();
		}
	},

	hasFocus: function () {
		return this._textArea && this._textArea === document.activeElement;
	},

	_onFocusBlur: function (ev) {
		var onoff = (ev.type == 'focus' ? L.DomEvent.on : L.DomEvent.off).bind(L.DomEvent);

		onoff(this._textArea, 'input', this._onInput, this);
		onoff(this._textArea, 'compositionstart', this._onCompositionStart, this);
		onoff(this._textArea, 'compositionupdate', this._onCompositionUpdate, this);
		onoff(this._textArea, 'compositionend', this._onCompositionEnd, this);
		onoff(this._textArea, 'keydown', this._onKeyDown, this);
		onoff(this._textArea, 'keyup', this._onKeyUp, this);
		onoff(this._textArea, 'copy cut paste', this._map._handleDOMEvent, this._map);

		app.idleHandler.notifyActive();

		if (ev.type === 'blur' && this._isComposing) {
			this._abortComposition(ev);
		}

		if (ev.type === 'blur' && this._hasFormulaBarFocus())
			this._map.formulabar.blurField();
	},

	// Focus the textarea/contenteditable
	// @acceptInput (only on "mobile" (= mobile phone) or on iOS and Android in general) true if we want to
	// accept key input, and show the virtual keyboard.
	focus: function (acceptInput) {
		// window.app.console.trace('L.TextInput.focus(' + acceptInput + ')');

		// Note that the acceptInput parameter intentionally
		// is a tri-state boolean: undefined, false, or true.

		// Clicking or otherwise focusing the map should focus on the clipboard
		// container in order for the user to input text (and on-screen keyboards
		// to pop-up), unless the document is read only.
		if (!this._map.isEditMode()) {
			this._setAcceptInput(false);
			// on clicking focus is important
			// specially in chrome once document loses focus it never gets it back
			// which causes shortcuts to stop working (i.e: print, search etc...)
			this._map.getContainer().focus();
			return;
		}

		// Trick to avoid showing the software keyboard: Set the textarea
		// read-only before focus() and reset it again after the blur()
		if (!window.ThisIsTheiOSApp && navigator.platform !== 'iPhone' && !window.mode.isChromebook()) {
			if ((window.ThisIsAMobileApp || window.mode.isMobile()) && acceptInput !== true)
				this._textArea.setAttribute('readonly', true);
		}

		if (!window.ThisIsTheiOSApp && navigator.platform !== 'iPhone' && !window.keyboard.guessOnscreenKeyboard()) {
			this._textArea.focus();
		} else if (acceptInput === true) {
			// On the iPhone, only call the textarea's focus() when we get an explicit
			// true parameter. On the other hand, never call the textarea's blur().

			// Calling blur() leads to so confusing behaviour with the keyboard not
			// showing up when we want. Better to have it show up a bit too long that
			// strictly needed.

			// Probably whether the calls to the textarea's focus() and blur() functions
			// actually do anything or not might depend on whether the call stack
			// originates in a user input event handler or not, for security reasons.

			// To investigate, uncomment the call to window.app.console.trace() at the start of
			// this function, and check when the topmost slot in the stack trace is
			// "(anonymous function)" in hammer.js (an event handler), and when it is
			// _onMessage (the WebSocket message handler in Socket.js).
			this._textArea.focus();
		}

		if (!window.ThisIsTheiOSApp && navigator.platform !== 'iPhone' && !window.mode.isChromebook()) {
			if (window.keyboard.guessOnscreenKeyboard() && acceptInput !== true) {
				this._setAcceptInput(false);
				this._textArea.blur();
				this._textArea.removeAttribute('readonly');
			} else {
				this._setAcceptInput(true);
			}
		} else if (acceptInput !== false) {
			this._setAcceptInput(true);
		} else {
			this._setAcceptInput(false);
		}
	},

	blur: function () {
		this._setAcceptInput(false);
		if (!window.ThisIsTheiOSApp && navigator.platform !== 'iPhone' && !window.mode.isChromebook())
			this._textArea.blur();
	},

	// Returns true if the last focus was to accept input.
	// Used to restore the keyboard.
	canAcceptKeyboardInput: function () {
		return this._acceptInput;
	},

	// Marks the content of the textarea/contenteditable as selected,
	// for system clipboard interaction.
	// Note: It is currently reserved and will be deprecated in the future.
	select: function () {
		console.warn('select() is deprecated and will be removed in the future.');
	},

	getValue: function() {
		return this.getPlainTextContent();
	},

	getPlainTextContent: function() {
		return 	this._textArea.textContent;
	},

	getHTML: function() {
		return 	this._textArea.innerHTML;
	},

	update: function () {
		if (this._container && this._map && this._latlng) {
			var position = this._map.latLngToLayerPoint(this._latlng).round();
			this._setPos(position);
		}
	},

	_initLayout: function () {
		this._container = L.DomUtil.create('div', 'clipboard-container');
		this._container.id = 'doc-clipboard-container';
		// The textarea allows the keyboard to pop up and so on.
		// Note that the contents of the textarea are NOT deleted on each composed
		// word, in order to make
		this._textArea = L.DomUtil.create('div', 'clipboard', this._container);
		this._textArea.id = 'clipboard-area';
		this._textArea.setAttribute('contenteditable', 'true');
		this._textArea.setAttribute('autocapitalize', 'off');
		this._textArea.setAttribute('autofocus', 'true');
		this._textArea.setAttribute('autocorrect', 'off');
		this._textArea.setAttribute('autocomplete', 'off');
		this._textArea.setAttribute('spellcheck', 'false');
		this._textArea.setAttribute('wrap', 'on');
		// Prevent autofocus
		this._textArea.setAttribute('disabled', true);

		this._textAreaLabel = L.DomUtil.create('label', 'visuallyhidden', this._container);
		this._textAreaLabel.setAttribute('for', 'clipboard-area');
		this._textAreaLabel.innerHTML = 'clipboard area';

		this._emptyArea();

		if (!this.hasAccessibilitySupport()) {
			var warningMessage =
				_('Screen reader support for text content is disabled. ') +
				_('You need to enable it both at server level and in the UI. ') +
				_('Look for the accessibility section in oxoolwsd.xml for server setting. ') +
				_('Also check the voice over toggle under %parentControl.').replace(
					'%parentControl',
					window.userInterfaceMode === 'notebookbar' ? _('the Help tab') : _('the View menu')
				);
			this._textArea.setAttribute('aria-description', warningMessage);
		}
	},

	debug: function (debugOn) {
		this._isDebugOn = !!debugOn;
	},

	activeElement: function () {
		return this._textArea;
	},

	// Displays the caret and the under-caret marker.
	// Fetches the coordinates of the caret from the map's doclayer.
	showCursor: function () {
		if (!this._map._docLayer._cursorMarker) {
			return;
		}

		// Fetch top and bottom coords of caret
		var top = this._map._docLayer._visibleCursor.getNorthWest();
		var bottom = this._map._docLayer._visibleCursor.getSouthWest();

		if (!this._map._docLayer._cursorMarker.isDomAttached()) {
			// Display caret
			this._map._docLayer._cursorMarker.add();
		}
		this._map._docLayer._cursorMarker.setMouseCursorForTextBox();

		// Move and display under-caret marker

		if (window.touch.hasAnyTouchscreen()) {
			if (this._map._docLayer._textCSelections.empty()) {
				this._cursorHandler.setLatLng(bottom).addTo(this._map);
			} else {
				this._map.removeLayer(this._cursorHandler);
			}
		}

		// Move the hidden text area with the cursor bottom
		this._latlng = L.latLng(window.mode.isDesktop() ? bottom : top);
		this.update();
		// shape handlers hidden (if selected)
		this._map.fire('handlerstatus', { hidden: true });
		if (this._map._docLoaded && this._map.getDocType() === 'spreadsheet')
			this._map.onFormulaBarFocus();
	},

	// Hides the caret and the under-caret marker.
	hideCursor: function () {
		if (!this._map._docLayer._cursorMarker) {
			return;
		}
		if (this._map._docLayer._cursorMarker.isDomAttached())
			this._map._docLayer._cursorMarker.remove();
		this._map.removeLayer(this._cursorHandler);
		// shape handlers visible again (if selected)
		this._map.fire('handlerstatus', { hidden: false });
	},

	_setPos: function (pos) {
		L.DomUtil.setPosition(this._container, pos);
	},

	_hasFormulaBarFocus: function () {
		return this._map && this._map.formulabar && this._map.formulabar.hasFocus();
	},

	// Fired when text has been inputed, *during* and after composing/spellchecking
	_onInput: function (ev) {
		if (this._map.uiManager.isUIBlocked())
			return;

		app.idleHandler.notifyActive();

		// Ignore input events that are too close to the compositionend event.
		// This is to avoid sending the same text twice.
		if (ev.timeStamp - this._compositionendTimestamp < this._compositionendTimeDiff)
			return;


		switch (ev.inputType) {
			case 'insertText': // Direct input
				this._sendText(ev.data); // Send the text to the server
				break;

			case 'insertCompositionText': // Composing
				var textContent = this.getValue();
				/* console.debug('Is composing:', ev.isComposing ? 'Yes' : 'No',
							  ', ev.data:', ev.data,
							  ', content:', textContent,
							  ', cursor:', this._getCursorPosition(),
							  ', inputType:', ev.inputType); */
				if (this._isComposing) {
					if (this._isOnTheSpot()) {
						var type = textContent.length > 0 ? 'input' : '';
						this._sendText(textContent, type);
					} else {
						this._calcCompositionBoxPosition();
					}
				} else {
					this._sendText(textContent);
				}
				break;

			case 'insertParagraph': // Enter
			case 'deleteContentBackward': // Backspace
			case 'deleteContentForward': // Delete
				// Send the Delete key as a key event
				// handle by _onKeyDown()
				break;

			default:
				console.warn('Unknown input type :', ev.inputType);
				break;
		}

		if (!this._isComposing) {
			this._emptyArea(); // Clear the textarea
		}

		if (this._isDebugOn) {
			this._calcCompositionBoxPosition();
		}
	},

	// Sends the given (UTF-8) string of text to server,
	// as IME (text composition) messages
	_sendText: function (text, type) {
		var inputType = type === 'input' ? ' type=input' : '';
		var cursorPos = inputType.length > 0 ? ' cursor=' + this._getCursorPosition() : '';

		app.socket.sendMessage(
			'writetext id=' + this._map.getWinId() +
			' text=' + encodeURIComponent(text) +
			inputType + cursorPos
		);
	},

	// Clears the textarea
	_emptyArea: function () {
		this._textArea.innerHTML = '';
		this._setCursorPosition(0);
	},

	/**
	 * Text composition start.
	 *
	 * @param {object} ev - envnt
	 */
	_onCompositionStart: function (/* ev */) {
		this._isComposing = true;
		// If input mode is OverTheSpot, show the composition box
		if (this._isOverTheSpot() || this._isDebugOn) {
			L.DomUtil.addClass(this._container, 'overspot');
		}
	},

	/**
	 * Text composition update.
	 *
	 * @param {object} ev - envnt
	 */
	_onCompositionUpdate: function (/* ev */) {
		/**
		 * Do nothing.
		 * Handle in _onInput()
		 */
	},

	/**
	 * Text composition end.
	 *
	 * @param {object} ev - envnt
	 */
	_onCompositionEnd: function (ev) {
		app.idleHandler.notifyActive();
		// Record the timestamp of the most recent compositionend
		this._compositionendTimestamp = ev.timeStamp;
		this._isComposing = false; // 結束組字

		// Have any text been composed?
		if (ev.data) {
			this._sendText(ev.data);
		}

		// Hide the composition box
		if (this._isOverTheSpot()) {
			this._hideCompositionBox();
		}

		if (ev.data === '切換輸入模式') {
			this._toggleMode();
		}

		// 清除輸入區資料
		this._emptyArea();
	},

	// Called when the user goes back to a word to spellcheck or replace it,
	// on a timeout.
	// Very difficult to handle right now, so the strategy is to panic and
	// empty the text area.
	_abortComposition: function () {
		// Hide the composition box
		if (this._isOverTheSpot()) {
			this._hideCompositionBox();
		}

		// If the user is composing, and the text area is not empty,
		// send the text
		if (this._isComposing) {
			if (this.getValue().length > 0) {
				this._sendText(this.getValue());
			}
			this._isComposing = false;
		}

		this._emptyArea();
	},

	/**
	 * Check if the input mode is OnTheSpot.
	 *
	 * If the LoKit dialog is opened and the document cursor is not visible,
	 * it is considered OnTheSpot.
	 *
	 * @returns {boolean} - true if the input mode is OnTheSpot
	 */
	_isOnTheSpot: function () {
		return this.options.inputMode === 'OnTheSpot' ||
			(this._map.dialog && this._map.dialog.hasOpenedDialog() &&
			this._map.dialog.getCurrentDialogContainer() && !this._isCaretVisible());
	},

	_isOverTheSpot: function () {
		return !this._isOnTheSpot();
	},

	_toggleMode: function () {
		var prevMode = this.options.inputMode;
		if (window.mode.isDesktop() && this.options.inputEnhanced) {
			this.options.inputMode = this._isOnTheSpot() ? 'OverTheSpot' : 'OnTheSpot';
			if (localStorage) {
				localStorage.setItem('inputMode', this.options.inputMode);
			}
			return prevMode !== this.options.inputMode;
		}
		return false;
	},

	/**
	 * Check if the caret is visible.
	 *
	 * @returns {boolean} - true if the caret is visible
	 */
	_isCaretVisible: function () {
		return this._map._docLayer._cursorMarker &&
			this._map._docLayer._cursorMarker.visible;
	},

	_calcCompositionBoxPosition: function () {
		// 如果是 onTheSpot 模式，不需要計算組字視窗位置
		if (this._isOnTheSpot() && !this._isDebugOn)
			return;

		// 如果游標不可見，可能是選取了物件
		// 也可能是在試算表文件中，尚未進入儲存格編輯模式
		if (!this._isCaretVisible()) {
			// 如果有選取物件，則不需要顯示組字視窗
			if (this._map._docLayer._hasActiveSelection) {
				//console.debug('No cursor, but active selection.');
				return;
			} else  if (this._map.getDocType() === 'spreadsheet'/*  && this._map._docLayer._cellCursor */) {
				// 如果是試算表文件，則移動游標到儲存格開頭
				//console.debug('No cursor, moving to cell cursor.');
				var anchorPos = this._map._docLayer._cellCursor.getNorthWest();
				this._latlng = L.latLng(anchorPos);
				this.update();
			} else {
				//console.debug('No cursor, unknown reason.');
			}
		}

		// 取得 #map 的 rect
		var mapRect = this._map.getContainer().getBoundingClientRect();
		// 取得組字視窗的位置
		var rect = this._container.getBoundingClientRect();

		// 如果游標可見，則取得游標的高度
		var cursorMarker = this._map._docLayer._cursorMarker;
		var cursorHeight = cursorMarker.visible ? cursorMarker.size.y : 0;

		// 取得文件編輯區的寬度及高度
		var viewWidth = this._map.getSize().x;
		var viewHeight = this._map.getSize().y;
		// 取得視窗的寬度及高度
		var winWidth = window.innerWidth || document.documentElement.clientWidth;
		var winHeight = window.innerHeight || document.documentElement.clientHeight;

		// 計算編輯區的右側及底部邊界
		var rightBundary = Math.min(viewWidth, winWidth) + mapRect.left;
		var bottomBundary = Math.min(viewHeight, winHeight) + mapRect.top;

		// 把 _latlng 轉換成畫布座標
		var position = this._map.latLngToLayerPoint(this._latlng).round();
		var hasChanged = false;
		// 如果組字視窗右側超出編輯區右側，則左移組字視窗
		if (rect.right > rightBundary) {
			var moveLeft = rect.right - rightBundary;
			position.x -= moveLeft;
			hasChanged = true;
		}

		// 如果組字視窗底部超出編輯區底部，則上移組字視窗
		if (rect.bottom > bottomBundary) {
			var moveUp = (rect.bottom - bottomBundary) + cursorHeight;
			position.y -= moveUp;
			hasChanged = true;
		}

		// 座標有變動，則更新組字視窗位置
		if (hasChanged) {
			this._latlng = this._map.layerPointToLatLng(position);
			this.update();
		}
	},

	// 隱藏組字視窗
	_hideCompositionBox: function () {
		L.DomUtil.removeClass(this._container, 'overspot');
	},

	_onKeyDown: function (ev) {
		if (this._isComposing || this._map.uiManager.isUIBlocked())
			return;

		if (app.UI.notebookbarAccessibility)
			app.UI.notebookbarAccessibility.onDocumentKeyDown(ev);

		var oneKey = !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey;
		if (oneKey) {
			switch (ev.keyCode) {
				case 8: // Backspace
				case 46: // Delete
				case 13: // Enter
					var unoKeyCode = this._map['keyboard']._toUNOKeyCode(ev.keyCode);
					this._sendKeyEvent(ev.charCode, unoKeyCode);
					break;
			}
		}
	},

	// Check arrow keys on 'keyup' event; using 'ArrowLeft' or 'ArrowRight'
	// shall empty the textarea, to prevent FFX/Gecko from ever not having
	// whitespace around the caret.
	// Across browsers, arrow up/down / home / end would move the caret to
	// the beginning/end of the textarea/contenteditable.
	_onKeyUp: function (ev) {
		if (this._isComposing || this._map.uiManager.isUIBlocked())
			return;

		app.idleHandler.notifyActive();

		if (app.UI.notebookbarAccessibility)
			app.UI.notebookbarAccessibility.onDocumentKeyUp(ev);
	},

	// Tiny helper - encapsulates sending a 'key' or 'windowkey' websocket message
	// "type" can be "input" (default) or "up"
	_sendKeyEvent: function (charCode, unoKeyCode, type) {
		if (!type) {
			type = 'input';
		}
		if (this._map.editorHasFocus() || this._hasFormulaBarFocus()) {
			app.socket.sendMessage(
				'key type=' + type + ' char=' + charCode + ' key=' + unoKeyCode + '\n'
			);
		} else {
			app.socket.sendMessage(
				'windowkey id=' +
				this._map.getWinId() +
				' type=' +
				type +
				' char=' +
				charCode +
				' key=' +
				unoKeyCode +
				'\n'
			);
		}
	},

	_onCursorHandlerDragEnd: function (ev) {
		var cursorPos = this._map._docLayer._latLngToTwips(ev.target.getLatLng());
		this._map._docLayer._postMouseEvent('buttondown', cursorPos.x, cursorPos.y, 1, 1, 0);
		this._map._docLayer._postMouseEvent('buttonup', cursorPos.x, cursorPos.y, 1, 1, 0);
	},

	_getCursorPosition: function () {
		var cursorPos = -1;
		// textarea 是否爲 contenteditable
		if (this._textArea.getAttribute('contenteditable') === 'true') {
			var selection = window.getSelection();
			var range = selection.getRangeAt(0);
			var cloneRange = range.cloneRange();
			cloneRange.selectNodeContents(this._textArea);
			cloneRange.setEnd(range.startContainer, range.startOffset);
			cursorPos = cloneRange.toString().length;
		} else if (this._textArea.selectionStart !== undefined) {
			cursorPos = this._textArea.selectionStart;
		}

		return cursorPos;
	},

	_setCursorPosition: function (pos) {
		// textarea 是否爲 contenteditable
		if (this._textArea.getAttribute('contenteditable') === 'true') {
			var selection = window.getSelection();
			var range = document.createRange();
			// 計算 textArea 的長度
			var textLength = this._textArea.textContent.length;
			// 設定游標位置
			if (pos > textLength) {
				pos = textLength;
			}
			range.setStart(this._textArea, pos);
			range.collapse(true);
			selection.removeAllRanges();
			selection.addRange(range);
		} else if (this._textArea.setSelectionRange !== undefined) {
			this._textArea.setSelectionRange(pos, pos);
		}
	},

	setSwitchedToEditMode: function () {
		if (this.hasAccessibilitySupport()) {
			this._justSwitchedToEditMode = true;
		}
	},

	_setAcceptInput: function (accept) {
		if (L.Browser.cypressTest && this._textArea) {
			// This is used to track whether we *intended*
			// the keyboard to be visible or hidden.
			// There is no way track the keyboard state
			// programmatically, so the next best thing
			// is to track what we intended to do.
			this._textArea.setAttribute('data-accept-input', accept);
		}

		this._acceptInput = accept;
	}
});

L.textInput = function () {
	var loKitVersion = app.map.getLoKitVersion();
	var options = {
		inputEnhanced: loKitVersion['postWindowExtTextInputEventEnhance'] === true,
	};

	if (!options.inputEnhanced) {
		return new L.TextInput();
	}

	var defaultInputMode = 'OverTheSpot';
	if (window.mode.isDesktop()) {
		// 檢查 localStorage 是否有儲存輸入模式
		var inputMode = localStorage && localStorage.getItem('inputMode');
		// 如果指定使用 OverTheSpot 或 OnTheSpot 模式，則使用指定模式
		if (inputMode === 'OverTheSpot' || inputMode === 'OnTheSpot') {
			defaultInputMode = inputMode;
		}
		// 如果指定使用 OverTheSpot 模式，且未啟用增強輸入，則強制使用 OverTheSpot 模式
		if (defaultInputMode === 'OnTheSpot' && !options.inputEnhanced) {
			options.inputMode = 'OverTheSpot';
		}
	} else {
		defaultInputMode = 'OnTheSpot';
	}

	// 預設輸入模式
	if (localStorage) {
		localStorage.setItem('inputMode', defaultInputMode);
	}

	options.inputMode = defaultInputMode;

	return new L.EnhancedTextInput(options);
};

// vim: set ts=4 sw=4 tw=0 noet :

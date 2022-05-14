/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.FormulaBar
 */

/* global $ w2ui _ _UNO */
L.Control.FormulaBar = L.Control.extend({

	_bar: null,

	onAdd: function (map) {
		this.map = map;
		this.create();

		map.on('doclayerinit', this.onDocLayerInit, this);
		map.on('updatepermission', this.onUpdatePermission, this);

		map.on('celladdress', function (e) {
			if (document.activeElement !== L.DomUtil.get('addressInput')) {
				// if the user is not editing the address field
				L.DomUtil.get('addressInput').value = e.address;
			}
		});

		map.on('cellformula', function (e) {
			if (document.activeElement !== L.DomUtil.get('formulaInput')) {
				// if the user is not editing the formula bar
				L.DomUtil.get('formulaInput').value = e.formula;
			}
		});
	},

	create: function() {
		var that = this;
		var toolbar = $('#formulabar');
		this._bar = toolbar.w2toolbar({
			name: 'formulabar',
			hidden: true,
			items: [
				{type: 'html',  id: 'left'},
				{type: 'html', id: 'address', html: '<input id="addressInput" type="text">'},
				{type: 'break'},
				{type: 'button', id: 'functiondialog', img: 'functiondialog', hint: _('Function Wizard')},
				{type: 'menu', id: 'sum', img: 'autosum', hint: _('Select function'),
					items: [
						{id: 'autosum', text: _('Sum'), uno:'.uno:AutoSum', stateChange: true},
						{id: 'autoaverage', text: _('Average'), uno:'.uno:AutoAverage', stateChange: true},
						{id: 'automin', text: _('Minimum'), uno:'.uno:AutoMin', stateChange: true},
						{id: 'automax', text: _('Maximum'),  uno:'.uno:AutoMax', stateChange: true},
						{id: 'autocount', text: _('Count'),  uno:'.uno:AutoCount', stateChange: true},
					]
				},
				{type: 'button', id: 'function',  img: 'equal', hint: _UNO('InsertMath')},
				{type: 'button', hidden: true, id: 'cancelformula',  img: 'cancel', hint: _('Cancel')},
				{type: 'button', hidden: true, id: 'acceptformula',  img: 'ok', hint: _('Accept')},
				{type: 'html', id: 'formula', html: '<input type="text "id="formulaInput">'},
				//{type: 'html', id: 'formula', html: '<div id="calc-inputbar-wrapper"><div id="calc-inputbar"></div></div>'}
			],
			onClick: function (e) {
				that.onClick(e, e.target);
				window.hideTooltip(this, e.target);
			}
		});
		this.map.uiManager.enableTooltip(toolbar);
		this.map.setupStateChangesForToolbar({toolbar: this._bar});
		document.getElementById('addressInput').setAttribute('aria-label', _('cell address'));

		toolbar.bind('touchstart', function(e) {
			w2ui['formulabar'].touchStarted = true;
			var touchEvent = e.originalEvent;
			if (touchEvent && touchEvent.touches.length > 1) {
				L.DomEvent.preventDefault(e);
			}
		});

		$(w2ui.formulabar.box).find('.w2ui-scroll-left, .w2ui-scroll-right').hide();
		w2ui.formulabar.on('resize', function(target, e) {
			e.isCancelled = true;
		});

		$('#addressInput').on('keyup', this.onAddressInput.bind(this));
		$('#formulaInput').on('keyup keyupcompositionstart compositionupdate compositionend textInput', this.onFormulaInput.bind(this));
		$('#formulaInput').on('blur', this.map.onFormulaBarBlur.bind(this));
		$('#formulaInput').on('focus', this.map.onFormulaBarFocus.bind(this));
	},

	onClick: function(e, id, item) {
		if ('formulabar' in w2ui && w2ui['formulabar'].get(id) !== null) {
			var toolbar = w2ui['formulabar'];
			item = toolbar.get(id);
		}

		// In the iOS app we don't want clicking on the toolbar to pop up the keyboard.
		if (!window.ThisIsTheiOSApp && id !== 'zoomin' && id !== 'zoomout' && id !== 'mobile_wizard' && id !== 'insertion_mobile_wizard') {
			this.map.focus(this.map.canAcceptKeyboardInput()); // Maintain same keyboard state.
		}

		if (item.disabled) {
			return;
		}

		if (item.uno) {
			this.map.executeAllowedCommand(item.uno);
		}
		else if (id === 'functiondialog') {
			if (window.mode.isMobile() && this.map._functionWizardData) {
				this.map._docLayer._closeMobileWizard();
				this.map._docLayer._openMobileWizard(this.map._functionWizardData);
			} else {
				this.map.sendUnoCommand('.uno:FunctionDialog');
			}
		} else if (id === 'function') {
			L.DomUtil.get('formulaInput').value = '=';
			L.DomUtil.get('formulaInput').focus();
			this.map.cellEnterString(L.DomUtil.get('formulaInput').value);
		} else if (id === 'cancelformula') {
			this.map.sendUnoCommand('.uno:Cancel');
			toolbar.hide('acceptformula', 'cancelformula');
			toolbar.show('sum', 'function');
		} else if (id === 'acceptformula') {
			// focus on map, and press enter
			this.map.focus();
			this.map._docLayer.postKeyboardEvent(
				'input',
				this.map.keyboard.keyCodes.enter,
				this.map.keyboard._toUNOKeyCode(this.map.keyboard.keyCodes.enter)
			);
			toolbar.hide('acceptformula', 'cancelformula');
			toolbar.show('sum', 'function');
		}
	},

	onDocLayerInit: function() {
		var docType = this.map.getDocType();
		if (docType == 'spreadsheet') {
			$('#formulabar').show();
		}
	},

	onUpdatePermission: function(e) {
		var formulaBarButtons = ['functiondialog', 'sum', 'function'];
		var toolbar = w2ui.formulabar;

		if (e.perm === 'edit') {
			// Enable formula bar
			$('#addressInput').prop('disabled', false);
			$('#formulaInput').prop('disabled', false);

			if (toolbar) {
				formulaBarButtons.forEach(function(id) {
					toolbar.enable(id);
				});
			}
		} else {
			// Disable formula bar
			$('#addressInput').prop('disabled', true);
			$('#formulaInput').prop('disabled', true);

			if (toolbar) {
				formulaBarButtons.forEach(function(id) {
					toolbar.disable(id);
				});
			}
		}
	},

	onAddressInput: function(e) {
		if (e.keyCode === 13) {
			// address control should not have focus anymore
			this.map.focus();
			var value = L.DomUtil.get('addressInput').value;
			var command = {
				ToPoint : {
					type: 'string',
					value: value
				}
			};
			this.map.sendUnoCommand('.uno:GoToCell', command);
		} else if (e.keyCode === 27) { // 27 = esc key
			this.map.sendUnoCommand('.uno:Cancel');
			this.map.focus();
		}
	},

	/**
	 * 公式列的輸入行為
	 */
	onFormulaInput: function(e) {
		switch (e.type) {
		case 'compositionstart':
		case 'compositionupdate':
			this._isComposing = true;
			break;
		case 'compositionend':
			this._isComposing = false;
			break;
		}

		// keycode = 13 is 'enter'
		if (e.keyCode === 13) {
			// formula bar should not have focus anymore
			this.map.focus();

			// forward the 'enter' keystroke to map to deal with the formula entered
			var data = {
				originalEvent: e
			};
			this.map.fire('keypress', data);
		} else if (e.keyCode === 27) { // 27 = esc key
			this.map.sendUnoCommand('.uno:Cancel');
			this.map.focus();
		} else if (!this._isComposing) {
			this.map.cellEnterString(L.DomUtil.get('formulaInput').value);
		}
	},
});

L.Map.include({
	onFormulaBarFocus: function() {
		var formulabar = w2ui.formulabar;
		if (formulabar) {
			formulabar.hide('sum', 'function');
			formulabar.show('cancelformula', 'acceptformula');
		}
	},

	onFormulaBarBlur: function() {
		// The timeout is needed because we want 'click' event on 'cancel',
		// 'accept' button to act before we hide these buttons because
		// once hidden, click event won't be processed.
		// TODO: Some better way to do it ?
		setTimeout(function() {
			if ($('.leaflet-cursor').is(':visible'))
				return;
			var formulabar = w2ui.formulabar;
			formulabar.show('sum', 'function');
			formulabar.hide('cancelformula', 'acceptformula');
		}, 250);
	}
});

L.control.formulaBar = function (options) {
	return new L.Control.FormulaBar(options);
};

/* -*- js-indent-level: 8 -*- */
/*
 * L.Control.Dialog used for displaying alerts
 */

/* global _ sanitizeUrl JSDialog */
L.Control.AlertDialog = L.Control.extend({
	onAdd: function (map) {
		// TODO: Better distinction between warnings and errors
		map.on('error', this._onError, this);
		map.on('warn', this._onError, this);
	},

	_onError: function(e) {
		if (!this._map._fatal) {
			this._map.uiManager.closeAll();
		}

		if (e.msg) {
			if (window.ThisIsAMobileApp && this._map._fatal) {
				this._map.uiManager.showConfirmModal('oxool_alert', '', e.msg, _('Close'), function() {
					window.postMobileMessage('BYE');
					this._map.uiManager.closeAll();
				}.bind(this), true /* Hide cancel button */);
			}
			else
				this._map.uiManager.showConfirmModal('oxool_alert', '', e.msg, _('Close'), function() { /* Do nothing. */ }, true);
		}
		else if (e.cmd == 'load' && e.kind == 'docunloading') {
			// Handled by transparently retrying.
			return;
		} else if (e.cmd == 'openlink') {
			var url = e.url;
			var messageText = window.errorMessages.leaving;

			var isLinkValid = sanitizeUrl(url) !== 'about:blank';

			if (!isLinkValid) {
				messageText = window.errorMessages.invalidLink;
			}

			this._map.uiManager.showInfoModal('openlink', _('External link'), messageText, url,
				isLinkValid ? _('Open link') : _('OK'), function() {
					if (!isLinkValid)
						return;
					if ('processOxoolUrl' in window) {
						url = window.processOxoolUrl({ url: url, type: 'doc' });
					}

					window.open(url, '_blank');
				});
		} else if (e.cmd == 'paste' && e.kind == 'network' && e.code == 24581) {
			var id = 'paste_network_access_error';
			if (JSDialog.shouldShowAgain(id)) {
				this._map.uiManager.showInfoModal(id, '',
					_('It seems you have copied a selection that includes external images.'),
					_('Downloading external resources is forbidden but pasting images is still possible. Please right click in the image, choose "Copy Image" and paste it into the document instead.'),
					_('Don\'t show this again'), function() {
						JSDialog.setShowAgain(id, false);
						return false; // Close modal
					},
					/* with cancel */ true);
			}
		} else if (e.cmd && e.kind) {
			this._map.fire('hidebusy');

			var msg = _('The server encountered a %0 error while parsing the %1 command.');
			msg = msg.replace('%0', e.kind);
			msg = msg.replace('%1', e.cmd);
			this._map.uiManager.showInfoModal('oxool_alert', '', msg, '', _('Close'), function() { /* Do nothing. */ }, false);
		}
	}
});

L.control.alertDialog = function (options) {
	return new L.Control.AlertDialog(options);
};

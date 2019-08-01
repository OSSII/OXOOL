var body = function() {/*
<div style="padding:10px; font-size:16px;">
	<div id="l10n_label"></div>
	<br>
	<div class="w2ui-field w2ui-span4">
		<label id="l10n_New_filename"></label>
        <div>
            <input id="newfile_name" class="w2ui-input" type="text" autofocus>
        </div>
	</div>
</div>
*/}.toString().slice(14,-3);

var buttons = '<button class="w2ui-btn" onclick="w2popup.close()">' + _('Cancel') + '</button>' +
	'<button class="w2ui-btn w2ui-btn-blue" id="okBtn">' + _('OK') + '</button>';

var l10n = {
	l10n_label: _('Please enter a new filename.'),
	l10n_New_filename: _('File name:'), // 新檔名
	};

w2popup.open({
	title: _('Save As'),
	body: body,
	buttons: buttons,
	width: 350,
	height: 200,
	});

for(var key in l10n) { 
	$('#' + key).text(l10n[key]);
}

$('#okBtn').click(function () {
	var val = $('#newfile_name').val();
        if (val.length) {
			map.saveAs(val);
        	w2popup.close();
        } else {
			w2alert(_('Unspecified filename'));
        }
});

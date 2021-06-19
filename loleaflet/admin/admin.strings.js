/* -*- js-indent-level: 8 -*- */
/* Stringtable for Admin Console User Interface */
/* global _ */
var l10nstrings = {
	productName: 'OxOffice Online',
	/**
	 * 找出整頁中，含有 _="字串" 的 DOM，把該 DOM 的 innerHTML 改成 _("字串") 的值
	 */
	fullPageTranslation: function(dumpUntranslatedString) {
		if (typeof dumpUntranslatedString !== 'boolean') {
			dumpUntranslatedString = false;
		}
		document.querySelectorAll('[_]').forEach(function(element) {
			var origStr = element.getAttribute('_'); // 原始字串
			var tranStr = _(origStr); // 翻譯字串
			element.innerHTML = tranStr;
			if (dumpUntranslatedString && origStr === tranStr) {
				console.warn('"'+ origStr +'" : Untranslated.');
			}
		}.bind(this));
	},

	// 內部翻譯的字串陣列
	strings: [
		_('Admin console'), // 管理主控臺
		_('Overview'), // 概覽
		_('Analytics'), // 分析
		_('Log'), // 日誌
		_('System configuration'), // 系統配置設定
		_('Software upgrade'), // 軟體升級
		_('Font manager'), // 字型管理
		_('Table conversion'), // 表格轉試算表
		_('Template Repo'), // 範本中心
		_('ODF report template'), // ODF 報表管理
	],
};

if (module) {
	module.exports = l10nstrings;
}

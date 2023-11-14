/* -*- js-indent-level: 8; fill-column: 100 -*- */

L.Control.OxOOLMain = L.Control.extend({
    options: {},

    onAdd: function (map) {
        map.on('doclayerinit', this.onDocLayerInit, this);

    },

    onRemove: function() {
        this.map.off('doclayerinit', this.onDocLayerInit, this);
    },

    onDocLayerInit: function(/* e */) {
        var docType = this._map.getDocType();
        // 取得文件類型的識別色
        var docIdentify = getComputedStyle(document.documentElement).getPropertyValue('--' + docType + '-identify-color');
        // 設定 CSS 變數 --doc-identify-color 爲目前文件的識別色
        if (docIdentify) {
            document.documentElement.style.setProperty('--doc-identify-color', docIdentify);
            console.debug('document identify color:', docIdentify);
        } else {
            console.warn('Can not get document identify color: ' + docType);
        }
    }
});

L.control.OxOOLMain = function (options) {
    return new L.Control.OxOOLMain(options);
};

/* vim: set ts=8 sts=8 sw=8 tw=100: */
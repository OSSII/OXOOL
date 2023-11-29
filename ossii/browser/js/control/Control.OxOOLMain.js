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

        /**
         * 以下要實作以自己的功能取代原來的功能
         */

        // 替換 this._map._docLayer._showURLPopUp 函數
        // 1. 保留原來的函數
        this._map._docLayer._showURLPopUpSaved = this._map._docLayer._showURLPopUp;
        // 2. 替換原來的函數
        this._map._docLayer._showURLPopUp = function(position, url) {
            // 如果是文件內部的超連結，直接跳到該超連結的位置
            if (url.startsWith('#'))
            {
                this._map.sendUnoCommand('.uno:JumpToMark?Bookmark:string=' + encodeURIComponent(url.substring(1)));
                return;
            }
            // 如果不是編輯模式，就不要顯示超連結的彈出視窗
            if (!this._map.isEditMode()) {
                this._map.fire('warn', {url: url, map: this._map, cmd: 'openlink'});
                return;
            }
            // 交還給原來的函數處理
            this._showURLPopUpSaved(position, url);
        };
    }
});

L.control.OxOOLMain = function (options) {
    return new L.Control.OxOOLMain(options);
};

/* vim: set ts=8 sts=8 sw=8 tw=100: */
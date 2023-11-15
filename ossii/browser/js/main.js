/* -*- js-indent-level: 8; fill-column: 100 -*- */
/* global L app */

(function (global) {
    global.brandProductName = 'MODA ODF Web';
    global.brandProductURL = 'https://moda.gov.tw';
    global.brandProductFAQURL = 'https://www.facebook.com/OSSIITW/';
})(window);

(function() {
    'use strict';

    // register the main control
    app.map.addControl(L.control.OxOOLMain());

    // register the alternative command control
    app.map.alternativeCommand = L.control.alternativeCommand();
    app.map.addControl(app.map.alternativeCommand);
    // register the dialogs control
    app.map.addControl(L.control.dialogs());

    // 紀錄 brandingjs 已經載入完畢
    window.brandingjsLoaded = true;

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */
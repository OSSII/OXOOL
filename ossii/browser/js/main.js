/* -*- js-indent-level: 8; fill-column: 100 -*- */
/* global L app */

(function (global) {
    global.brandProductName = 'OxOffice Online';
    global.brandProductURL = 'https://moda.gov.tw';
    global.brandProductFAQURL = 'https://www.facebook.com/OSSIITW/';
})(window);

(function() {
    'use strict';

    // register the main control
    app.map.addControl(L.control.OxOOLMain());

    /**
     * All handlers are registered here.
     */
    // register the alternative command handler
    app.map.addHandler('alternativeCommand', L.Map.AlternativeCommand);
    // register the state change handler extension
    app.map.addHandler('stateChangeExtend', L.Map.StateChangeExtend);

    // register the dialogs control
    app.map.addControl(L.control.dialogs());

    // 紀錄 brandingjs 已經載入完畢
    window.brandingjsLoaded = true;

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */
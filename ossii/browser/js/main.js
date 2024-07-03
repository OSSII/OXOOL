/* -*- js-indent-level: 8; fill-column: 100 -*- */
/* global L app */

(function() {
	var startTime = new Date().getTime();

	// Inititalize OxOOL
	app.oxool = new L.OxOOL({
		map: app.map,
	});

	// register the dialogs control
	// TODO: 將來應該要移到 OxOOL 中
	app.map.addControl(L.control.dialogs());

	// 等待預載完成，最多 2000 ms，然後觸發 ossiiloaded 事件
	app.map.Tasks.whanPreloadComplate(function(tasks) {
		app.map.fire('ossiiloaded');
		var endTime = new Date().getTime();
		console.debug('All preloads are complete. tasks:', tasks,
					  'execution time:', endTime - startTime, 'ms');
	}, 2000);

})();

/* vim: set ts=8 sts=8 sw=8 tw=100: */

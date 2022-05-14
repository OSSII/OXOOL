/* -*- js-indent-level: 8 -*- */
/*
	Menu editor.
*/

/* global _ _UNO $ L AdminSocketBase Admin Uint8Array */
var AdminSocketMenuEditor = AdminSocketBase.extend({
	constructor: function(host) {
		this.base(host);
	},

	_l10n: [
		_('Enabled item'), // 啟用選項
		_('Disabled item'), // 禁用選項
		_('Menu editor'), // 選單編輯
		_('Writer menu'), // 文字文件簡報選單
		_('Calc menu'), // 試算表簡報選單
		_('Impress menu'), // 簡報選單
		_('Instructions'), // 說明
		_('The option is marked with a red line to indicate that it is disabled.'), // 選項劃紅線表示禁用。
		_('Click the option to enable or disable the function.'), // 點擊選項可啟用或禁用該功能。
		_('Disable the sub-menu, all options under it will also be disabled.'), // 禁用子選單，則其下所有選項也會禁用。
		_('There are three menus available for editing: Writer menu, Calc menu, and Impress Menu.'), // 共有 Writer menu、Calc menu、Impress Menu 三種選單可編輯。
		_('Show enabled JSON content.'), // 顯示啟用 JSON 內容
		_('Show disabled JSON content.'), // 顯示禁用 JSON 內容
		_('Update menu permissions.'), // 更新選單權限
		_('Reset menu'), // 重設選單
		_('Download'), // 下載
	],

	// uno command 圖示路徑
	_cmdIconURL: '',
	// resource 圖示路徑
	_resIconURL: '',

	_iconAlias: {
		'acceptchanges': 'accepttrackedchanges',
		'accepttracedchange': 'accepttrackedchange',
		'adddatefield': 'datefield',
		'addname': 'label',
		'addons': 'insertplugin',
		'addtable': 'dbnewtable',
		'addtextbox': 'insertfixedtext',
		'adjust': 'zoomoptimal',
		'alignhorizontalceter': 'alignhorizontalcenter',
		'alignvcenter': 'alignverticalcenter',
		'anchormenu': 'toggleanchortype',
		'apply': 'ok',
		'arrangeframemenu': 'bringtofront',
		'arrangemenu': 'bringtofront',
		'arrowshapes.left-right-arrow': 'arrowshapes',
		'arrowstoolbox': 'linearrowend',
		'autofilter': 'datafilterautofilter',
		'autoformatmenu': 'autocorrectdlg',
		'availabletoolbars': 'showtoolbar',
		'backgroundpatterncontroller': 'backgroundcolor',
		'badcellstyle': 'badcellstyles',
		'basicshapes': 'basicshapes.diamond',
		'basicshapes.circle': 'circle',
		'basicshapes.circle-pie': 'pie',
		'basicshapes.ellipse': 'ellipse',
		'basicshapes.parallelogram': 'flowchartshapes.flowchart-data',
		'basicshapes.quadrat': 'square',
		'basicshapes.rectangle': 'rect',
		'basicshapes.round-rectangle': 'rect_rounded',
		'bezieredge': 'bezierappend',
		'browsebackward': 'prevrecord',
		'browseforward': 'nextrecord',
		'bulletliststyle': 'defaultbullet',
		'calloutshapes.round-rectangular-callout': 'calloutshapes',
		'cellcontentsmenu': 'calculate',
		'cellprotection': 'protect',
		'cellvertbottom': 'alignbottom',
		'cellvertcenter': 'alignverticalcenter',
		'cellverttop': 'aligntop',
		'centerpara': 'alignhorizontalcenter',
		'changesmenu': 'trackchanges',
		'characterbackgroundpattern': 'backcolor',
		'charactermenu': 'fontdialog',
		'charbackcolor': 'backcolor',
		'charspacing': 'spacing',
		'chartmenu': 'diagramtype',
		'charttitlemenu': 'toggletitle',
		'checkboxformfield': 'checkbox',
		'clickchangerotation': 'toggleobjectrotatemode',
		'closedocs': 'closedoc',
		'closewin': 'closepreview',
		'colorview': 'graphicfilterinvert',
		'columnoperations': 'entirecolumn',
		'columnwidth': 'setminimalcolumnwidth',
		'commentchange': 'commentchangetracking',
		'commonalignbottom': 'alignbottom',
		'commonalignhorizontalcenter': 'alignhorizontalcenter',
		'commonalignjustified': 'alignblock',
		'commonalignleft': 'alignleft',
		'commonalignright': 'alignright',
		'commonaligntop': 'aligntop',
		'commonalignverticalcenter': 'alignverticalcenter',
		'commontaskbarvisible': 'autopilotmenu',
		'com.sun.star.deployment.ui.packagemanagerdialog': 'insertplugin',
		'conditionalformatmenu': 'conditionalformatdialog',
		'config': 'choosecontrols',
		'connectorcircles': 'connector',
		'connectorcurvecircles': 'connectorcurve',
		'connectorlinecircles': 'connectorline',
		'connectorlinescircles': 'connector',
		'connectortoolbox': 'connector',
		'convertinto3dlathefast': 'convertinto3dlathe',
		'convertmenu': 'bezierconvert',
		'customanimation': 'diaeffect',
		'datafilterhideautofilter': 'removefiltersort',
		'datapilotmenu': 'datadatapilotrun',
		'datastreamsplay': 'runbasic',
		'datastreamsstop': 'basicstop',
		'datepickerformfield': 'datefield',
		'dbdtableedit': 'dbtableedit',
		'dbformopen': 'open',
		'dbqueryopen': 'open',
		'dbreportopen': 'open',
		'dbtableopen': 'open',
		'defaultcellstyles': 'defaultcharstyle',
		'defaultparastyle': 'controlcodes',
		'deleteallnotes': 'deleteallannotation',
		'deletecomment': 'deleteannotation',
		'deletenote': 'deleteannotation',
		'deleteshapehyperlink': 'removehyperlink',
		'diaauto': 'dia',
		'diagramaxisall': 'diagramaxisxyz',
		'diagramaxismenu': 'diagramaxis',
		'diagramgridmenu': 'togglegridhorizontal',
		'donation': 'currencyfield',
		'draw': 'reload',
		'drawselect': 'selectobject',
		'drawtext': 'text',
		'dropdownformfield': 'combobox',
		'dsbdocumentdatasource': 'insertexternaldatasource',
		'dsbeditdoc': 'editdoc',
		'dsbinsertcolumns': 'insertfieldctrl',
		'editlinksmenu': 'insertreferencefield',
		'editpastespecialmenu': 'pastespecial',
		'editselectmenu': 'selecttables',
		'editshapehyperlink': 'inserthyperlink',
		'editstyled': 'editstyle',
		'ellipsetoolbox': 'ellipse',
		'exitsearch': 'closepreview',
		'exportasgraphic': 'insertgraphic',
		'exportasmenu': 'exportto',
		'exporttoepub': 'exportdirecttoepub',
		'exporttopdf': 'exportdirecttopdf',
		'extrusiontoggle': 'convertinto3d',
		'fieldmenu': 'addfield',
		'fieldnames': 'addfield',
		'fillcolor': 'backgroundcolor',
		'fillstyle': 'backgroundcolor',
		'filtercrit': 'datafilterstandardfilter',
		'findbar': 'recsearch',
		'firstpage': 'firstrecord',
		'firstslide': 'firstrecord',
		'fliphorizontal': 'mirror',
		'flipmenu': 'mirror',
		'flipvertical': 'mirrorvert',
		'flowchartshapes.flowchart-alternate-process': 'basicshapes.round-quadrat',
		'flowchartshapes.flowchart-connector': 'circle',
		'flowchartshapes.flowchart-extract': 'basicshapes.isosceles-triangle',
		'flowchartshapes.flowchart-magnetic-disk': 'basicshapes.can',
		'flowchartshapes.flowchart-manual-operation': 'basicshapes.trapezoid',
		'flowchartshapes.flowchart-merge': 'fontworkshapetype.fontwork-triangle-down',
		'flowchartshapes.flowchart-process': 'square',
		'focustofindbar': 'recsearch',
		'fontcolor': 'color',
		'fontheight': 'scaletext',
		'fontworkalignmentfloater': 'alignhorizontalcenter',
		'fontworkcharacterspacingfloater': 'spacing',
		'fontworkshapetype': 'fontwork',
		'fontworkshapetype.fontwork-circle-pour': 'basicshapes.ring',
		'fontworkshapetype.fontwork-fade-down': 'basicshapes.trapezoid',
		'fontworkshapetype.fontwork-triangle-up': 'basicshapes.isosceles-triangle',
		'footnotecellstyles': 'insertfootnote',
		'formatarea': 'backgroundcolor',
		'formatbulletsmenu': 'defaultbullet',
		'formatframemenu': 'framedialog',
		'formatimagemenu': 'graphic',
		'formatselection': 'configuredialog',
		'formatspacingmenu': 'spacepara15',
		'formattextmenu': 'charfontname',
		'formfilter': 'datafilterspecialfilter',
		'formfilterexecute': 'datafilterstandardfilter',
		'freezepanescolumn': 'freezepanesfirstcolumn',
		'freezepanesrow': 'freezepanesfirstrow',
		'functionbox': 'dbviewfunctions',
		'functiondialog': 'dbviewfunctions',
		'goodcellstyle': 'goodcellstyles',
		'gotoendofdoc': 'lastrecord',
		'gotostartofdoc': 'firstrecord',
		'grafattrcrop': 'crop',
		'grafinvert': 'graphicfilterinvert',
		'grafmode': 'graphicdialog',
		'graphicfilterposter': 'graphicdialog',
		'graphicfiltertoolbox': 'autopilotmenu',
		'graphicmenu': 'avmediaplayer',
		'grid': 'insertspreadsheet',
		'gridmenu': 'gridvisible',
		'groupmenu': 'formatgroup',
		'groupoutlinemenu': 'group',
		'headerandfooter': 'editheaderandfooter',
		'heading1cellstyles': 'heading1parastyle',
		'heading2cellstyles': 'heading2parastyle',
		'helperdialog': 'helpindex',
		'hscroll': 'hscrollbar',
		'hyperlinkdialog': 'inserthyperlink',
		'hyphenation': 'hyphenate',
		'indexesmenu': 'insertindexesentry',
		'inputlinevisible': 'dbviewfunctions',
		'insertannotation': 'shownote',
		'insertauthorfield': 'dbviewaliases',
		'insertavmedia': 'avmediaplayer',
		'insertcell': 'insertcellsright',
		'insertcolumns': 'insertcolumnsafter',
		'insertcolumnsmenu': 'insertcolumnsafter',
		'insertcontents': 'pastespecial',
		'insertctrl': 'inserttable',
		'insertcurrencyfield': 'currencyfield',
		'insertcurrentdate': 'datefield',
		'insertcurrenttime': 'timefield',
		'insertdatefield': 'datefield',
		'insertdatefieldfix': 'datefield',
		'insertdatefieldvar': 'datefield',
		'insertedit': 'edit',
		'insertfield': 'addfield',
		'insertfilecontrol': 'filecontrol',
		'insertfilefield': 'filefield',
		'insertfootnotesmenu': 'insertfootnote',
		'insertformattedfield': 'formattedfield',
		'insertformcheck': 'checkbox',
		'insertformcombo': 'combobox',
		'insertformhscroll': 'hscrollbar',
		'insertformlist': 'listbox',
		'insertformmenu': 'choosecontrols',
		'insertformradio': 'radiobutton',
		'insertformspin': 'spinbutton',
		'insertformula': 'dbviewfunctions',
		'insertformvscroll': 'scrollbar',
		'insertframeinteract': 'insertframe',
		'insertframeinteractnocolumns': 'insertframe',
		'insertgridcontrol': 'insertspreadsheet',
		'insertheaderfootermenu': 'editheaderandfooter',
		'insertimagecontrol': 'imagecontrol',
		'insertlistbox': 'listbox',
		'insertmenuaxes': 'diagramaxis',
		'insertmenugrids': 'togglegridhorizontal',
		'insertmenulegend': 'legend',
		'insertnumericfield': 'numberformatstandard',
		'insertobjctrl': 'drawchart',
		'insertobjectchart': 'drawchart',
		'insertobjectchartfromfile': 'open',
		'insertobjectdialog': 'insertobject',
		'insertobjectstarmath': 'insertmath',
		'insertpagefield': 'insertpagenumberfield',
		'insertpagefooter': 'insertfooter',
		'insertpageheader': 'insertheader',
		'insertpagenumber': 'insertpagenumberfield',
		'insertpagesfield': 'insertpagecountfield',
		'insertpagetitlefield': 'inserttitlefield',
		'insertpatternfield': 'patternfield',
		'insertpushbutton': 'pushbutton',
		'insertrows': 'insertrowsafter',
		'insertrowsmenu': 'insertrowsafter',
		'insertscript': 'choosemacro',
		'insertsignatureline': 'signaturelinedialog',
		'insertslidefield': 'insertslidenumberfield',
		'insertslidenumber': 'insertslidenumberfield',
		'insertslidesfield': 'insertslidecountfield',
		'inserttextframe': 'insertframe',
		'inserttimefieldfix': 'timefield',
		'inserttimefield': 'timefield',
		'inserttimefieldvar': 'timefield',
		'inserttoolbox': 'dataimport',
		'insobjctrl': 'newdoc',
		'justifypara': 'alignblock',
		'languagemenu': 'managelanguage',
		'lastpage': 'lastrecord',
		'lastslide': 'lastrecord',
		'leftpara': 'alignleft',
		'librelogo-gobackward': 'arrowshapes.down-arrow',
		'librelogo-goforward': 'arrowshapes.up-arrow',
		'librelogo-run': 'runbasic',
		'librelogo-stop': 'basicstop',
		'librelogo-translate': 'editglossary',
		'linenumberdialog': 'linenumberingdialog',
		'linespacing': 'spacepara15',
		'linetoolbox': 'freeline_unfilled',
		'loadstyles': 'open',
		'macrodialog': 'scriptorganizer',
		'macroorganizer%3ftabid%3ashort=1': 'open',
		'macroorganizer': 'scriptorganizer',
		'macrosmenu': 'choosemacro',
		'mailmergefirstentry': 'firstrecord',
		'mailmergelastentry': 'lastrecord',
		'mailmergenextentry': 'nextrecord',
		'mailmergepreventry': 'prevrecord',
		'margins': 'pagemargin',
		'measureattributes': 'measureline',
		'mergecellsmenu': 'togglemergecells',
		'mergedocument': 'mergedocuments',
		'mirrorhorz': 'mirror',
		'mirrormenu': 'rotateleft',
		'modifypage': 'slidesetup',
		'movepagedown': 'downsearch',
		'movepageup': 'upsearch',
		'moveslidedown': 'downsearch',
		'moveslidefirst': 'movepagefirst',
		'moveslidelast': 'movepagelast',
		'moveslideup': 'upsearch',
		'namegroup': 'definename',
		'navigateback': 'prevrecord',
		'navigateforward': 'nextrecord',
		'neutralcellstyle': 'neutralcellstyles',
		'nextpage': 'nextrecord',
		'nextslide': 'nextrecord',
		'no': 'cancel',
		'notecellstyles': 'shownote',
		'notevisible': 'shownote',
		'numberformatcurrencysimple': 'numberformatcurrency',
		'numberformatmenu': 'numberformatstandard',
		'numberingmenu': 'outlinebullet',
		'numberliststyle': 'defaultnumbering',
		'numericfield': 'numberformatstandard',
		'objectalign': 'objectalignleft',
		'objectmenu': 'formatobjectmenu',
		'objectmirrorhorizontal': 'mirror',
		'objectmirrorvertical': 'mirrorvert',
		'objects3dtoolbox': 'cube',
		'objecttitledescription': 'insertcaptiondialog',
		'onlinehelp': 'helpindex',
		'openfromcalc': 'open',
		'openfromwriter': 'open',
		'open_h': 'open',
		'openhyperlinkoncursor': 'inserthyperlink',
		'openurl': 'browseview',
		'openxmlfiltersettings': 'managexmlsource',
		'ordercrit': 'datasort',
		'outlinedown': 'movedown',
		'outlineleft': 'incrementlevel',
		'outlineright': 'decrementlevel',
		'outlineup': 'moveup',
		'outputqualitycolor': 'insertgraphic',
		'pagedown': 'nextrecord',
		'pageformatdialog': 'pagedialog',
		'pageup': 'prevrecord',
		'paragraphmenu': 'paragraphdialog',
		'pastespecialmenu': 'pastespecial',
		'pluginsactive': 'insertplugin',
		'previewprintoptions': 'printpreview',
		'previewzoom': 'zoom',
		'previouspage': 'prevrecord',
		'previousslide': 'prevrecord',
		'printpagepreview': 'printpreview',
		'printrangesmenu': 'defineprintarea',
		'questionanswers': 'browseview',
		'quickedit': 'editdoc',
		'rectangletoolbox': 'rect',
		'recundo': 'undo',
		'refresh': 'reload',
		'removefilter': 'removefiltersort',
		'renametable': 'name',
		'repaginate': 'insertpagenumberfield',
		'reportissue': 'editdoc',
		'rightpara': 'alignright',
		'rotateflipmenu': 'rotateleft',
		'rowheight': 'setminimalrowheight',
		'rowoperations': 'entirerow',
		'rulermenu': 'ruler',
		'rulerrows': 'extrusiontiltleft',
		'rulerrowsvertical': 'extrusiontiltright',
		'savegraphic': 'save',
		'savesimple': 'save',
		'sbabrwinsert': 'insertfieldctrl',
		'scrollbarmenu': 'scrollbar',
		'scrolltonext': 'downsearch',
		'scrolltoprevious': 'upsearch',
		'sectionalignbottom': 'aligndown',
		'sectionalignleft': 'objectalignleft',
		'sectionalignright': 'objectalignright',
		'sectionaligntop': 'alignup',
		'selectcolumn': 'entirecolumn',
		'selectdata': 'selectdb',
		'selectmode': 'selectobject',
		'selectrow': 'entirerow',
		'sendfeedback': 'insertenvelope',
		'setdefault': 'resetattributes',
		'setoptimalcolumnwidthdirect': 'setoptimalcolumnwidth',
		'settabbgcolor': 'backgroundcolor',
		'shapeslinemenu': 'line',
		'shapesmenu': 'insertdraw',
		'sheetcommentmenu': 'shownote',
		'sheetlefttoright': 'paralefttoright',
		'sheetrighttoleft': 'pararighttoleft',
		'showallnotes': 'showannotations',
		'showbrowser': 'controlproperties',
		'showchanges': 'showtrackedchanges',
		'showgraphics': 'graphic',
		'showinlinetooltips': 'shownote',
		'showpropbrowser': 'controlproperties',
		'showruler': 'ruler',
		'sidebarmenu': 'sidebar',
		'sortdialog': 'datasort',
		'sortdown': 'sortdescending',
		'sortup': 'sortascending',
		'sourceview': 'symbolshapes.brace-pair',
		'spelldialog': 'spelling',
		'spellingandgrammardialog': 'spelling',
		'starchartdialog': 'drawchart',
		'symbolcatalogue': 'insertsymbol',
		'symbolshapes.smiley': 'symbolshapes',
		'tableautofitmenu': 'setoptimalrowheight',
		'tablecellbackgroundcolor': 'backgroundcolor',
		'tabledeletemenu': 'deletetable',
		'tableevents': 'animationeffects',
		'tableinsertmenu': 'insertrowsafter',
		'tablemenu': 'tabledialog',
		'tableselectmenu': 'selecttable',
		'tablesort': 'sortascending',
		'templatemenu': 'templatemanager',
		'textalign': 'alignblock',
		'textattributes': 'fontdialog',
		'textfittosizetool': 'text_marquee',
		'textformfield': 'edit',
		'texttoolbox': 'text',
		'thesaurusdialog': 'thesaurus',
		'toggleaxisdescr': 'helplinesvisible',
		'toolbarsmenu': 'showtoolbar',
		'toolsformsmenu': 'dbviewforms',
		'toolsmacroedit': 'basicideappear',
		'tracechangemode': 'trackchanges',
		'underlinesimple': 'underline',
		'underlinesingle': 'underline',
		'updateallindexes': 'insertmultiindex',
		'updatealllinks': 'inserthyperlink',
		'updateall': 'reload',
		'updatecharts': 'drawchart',
		'updatefields': 'addfield',
		'updatemenu': 'reload',
		'usewizards': 'autopilotmenu',
		'view100': 'zoom100percent',
		'view3d': 'cube',
		'viewsidebarstyles': 'designerdialog',
		'viewtrackchanges': 'showtrackedchanges',
		'vscrollbar': 'scrollbar',
		'vscroll': 'scrollbar',
		'webhtml': 'browseview',
		'wrapmenu': 'wrapon',
		'xlinestyle': 'linestyle',
		'yes': 'ok',
		'zoomminus': 'zoomout',
		'zoomplus': 'zoomin',
		'zoomtoolbox': 'zoom'
	},

	// 帶參數的 uno 指令(.uno:AssignLayout?WhatLayer=xx)
	_resorceIcon: {
		'.uno:AssignLayout?WhatLayout:long=20': 'layout_empty', // 空白投影片
		'.uno:AssignLayout?WhatLayout:long=19': 'layout_head01', // 只有題名
		'.uno:AssignLayout?WhatLayout:long=0': 'layout_head03', // 題名投影片
		'.uno:AssignLayout?WhatLayout:long=1': 'layout_head02', // 題名、內容區塊
		'.uno:AssignLayout?WhatLayout:long=32': 'layout_textonly', // 文字置中

		'.uno:AssignLayout?WhatLayout:long=3': 'layout_head02a', // 題名和2個內容區塊
		'.uno:AssignLayout?WhatLayout:long=12': 'layout_head03c', // 題名、內容區塊和2個內容區塊
		'.uno:AssignLayout?WhatLayout:long=15': 'layout_head03b', // 題名、2個內容區塊和內容區塊
		'.uno:AssignLayout?WhatLayout:long=14': 'layout_head02b', // 題名、內容區塊在內容區塊之上
		'.uno:AssignLayout?WhatLayout:long=16': 'layout_head03a', // 題名、2個內容區塊在內容區塊之上
		'.uno:AssignLayout?WhatLayout:long=18': 'layout_head04', // 題名、4個內容區塊
		'.uno:AssignLayout?WhatLayout:long=34': 'layout_head06', // 題名、6個內容區塊

		'.uno:AssignLayout?WhatLayout:long=28': 'layout_vertical01', // 垂直題名、垂直文字
		'.uno:AssignLayout?WhatLayout:long=27': 'layout_vertical02', // 垂直題名、文字、圖表
		'.uno:AssignLayout?WhatLayout:long=29': 'layout_head02', // 題名、垂直文字
		'.uno:AssignLayout?WhatLayout:long=30': 'layout_head02a', // 題名、垂直文字、美術圖形
	},

	_menubars: {
		writer: {
			title: _('Writer'),
			docType: 'text',
			container: null,
			color: '#2b579a',
			menu: {}, // 選單
			perm: {}, // 禁用列表
		},
		calc: {
			title: _('Calc'),
			docType: 'spreadsheet',
			container: null,
			color: '#217346',
			menu: {},
			perm: {},
		},
		impress: {
			title: _('Impress'),
			docType: 'presentation',
			container: null,
			color: '#bc472a',
			menu: {},
			perm: {},
		},
	},

	onSocketOpen: function() {
		// Base class' onSocketOpen handles authentication
		this.base.call(this);

		// uno command 圖示路徑
		this._cmdIconURL = window.loleafletPath + '/images/cmd/';
		// resource 圖示路徑
		this._resIconURL = window.loleafletPath + '/images/res/';

		// 設定文件類別代表色
		document.documentElement.style.setProperty('--doc-identify-color', this._menubars.writer.color);

		for (var key in this._menubars) {
			// 依據不同的文件設定代表色
			$('#' + key + '-tab').click(function(e) {
				var color = '#000'; // 黑色
				switch (e.currentTarget.id) {
				case 'writer-tab':
					color = this._menubars.writer.color;
					break;
				case 'calc-tab':
					color = this._menubars.calc.color;
					break;
				case 'impress-tab':
					color = this._menubars.impress.color;
					break;
				}
				document.documentElement.style.setProperty('--doc-identify-color', color);
			}.bind(this));

			this.socket.send('getMenuPerm ' + key); // 先取得選單權限
			this.socket.send('getMenu ' + key); // 再取得選單內容
		}

		// 更新目前編輯選單的權限
		$('#updatemenu').click(function() {
			var key = this.getEditingMenuKey();
			if (key) {
				var permList = this.getDisabledPermissions(key);
				this.socket.send(
					'updateMenuPerm ' + key + ' '
					+ encodeURI(JSON.stringify(permList, null, '\t'))
				);
			} else {
				console.error('menu key not found! so can\'t be update permission.');
			}
		}.bind(this));

		// 顯示目前編輯禁用的 JSON 內容
		$('#showdisabledjson').click(function() {
			this.showJsonContent(true);
		}.bind(this));

		// 顯示目前編輯啟用的 JSON 內容
		$('#showenabledjson').click(function() {
			this.showJsonContent(false);
		}.bind(this));

		// 下載 JSON 檔案
		$('#downloadJson').click(function() {
			var jsonContent = document.getElementById('jsonContent');
			var isDisabled = jsonContent.getAttribute('disabledItem') === 'true';
			// 轉換資料到 byte array
			var contentLen = jsonContent.innerText.length;
			var byteArray = new Uint8Array(contentLen);
			for (var i = 0; i < contentLen ; i++) {
				byteArray[i] = jsonContent.innerText.charCodeAt(i);
			}
			var blob = new Blob([byteArray], {type: 'octet/stream'});
			var link = L.DomUtil.create('a', '', document.body);
			link.style = 'display: none';
			link.href = window.URL.createObjectURL(blob);
			link.download = this.getEditingMenuKey() + '-' +
				(isDisabled === true ? 'disabled' : 'enabled') + '-menubar.json';
			link.click();
			L.DomUtil.remove(link);
		}.bind(this));

		// 重設選單(恢復所有選項)
		$('#resetmenu').click(function() {
			var key = this.getEditingMenuKey();
			if (key) {
				// 取得所有禁用選項陣列
				var disabledItems = this._menubars[key].container.querySelectorAll('.strikethrough');
				// 依序啟用
				disabledItems.forEach(function(item) {
					if (item.parentNode.mgr) {
						item.parentNode.mgr.setAvailable(true);
					}
				});
			}
		}.bind(this));
	},

	/**
	 * 取得目前正在編輯的選單 key
	 * @returns null: 沒有正在編輯的選單(不可能), string: 目前編輯的選單 key
	 */
	getEditingMenuKey: function() {
		for (var key in this._menubars) {
			// 目前正在編輯哪個選單
			var tabpanEl = document.getElementById(key);
			if (tabpanEl && L.DomUtil.hasClass(tabpanEl, 'active')) {
				return key;
			}
		}
		return null;
	},

	/**
	 * 取得指定的編輯選單禁用列表
	 * @param {string} key - 'writer', 'calc' or 'impress'
	 * @returns Object
	 */
	getDisabledPermissions: function(key) {
		var items = this._menubars[key].container.querySelectorAll('li'); // 取得所有選項
		var permList = {};
		items.forEach(function(item) {
			// 把禁用 id 放進 permList 中
			if (!item.mgr.isAvailable()) {
				permList[item.mgr.getId()] = false;
			}
		});
		return permList;
	},

	showJsonContent: function(isDisabled) {
		var key = this.getEditingMenuKey();
		if (key) {
			var content;
			if (isDisabled === true) {
				content = this.getDisabledPermissions(key);
			} else {
				content = this.constructJsonObject(this._menubars[key].container);
			}
			var jsonContentTitle = document.getElementById('jsonContentTitle');
			jsonContentTitle.innerText = this._menubars[key].title + ' ('
				+ (isDisabled ? _('Disabled item') : _('Enabled item')) + ')';
			var jsonContent = document.getElementById('jsonContent');
			jsonContent.setAttribute('disabledItem', isDisabled);
			jsonContent.innerText = JSON.stringify(content, null, '\t');
			$('#showJsonContentDialog').modal('show');
		} else {
			console.error('menu key not found!');
		}
	},

	/**
	 *
	 * @param {*} menuHtml
	 * @returns array
	 */
	constructJsonObject: function(menuHtml) {
		var menu = [];
		var isLastItemText = false;
		menuHtml.childNodes.forEach(function(liItem) {
			// 不是標準選項，略過(jquery smartmenus 有時會塞一些自己的 element)
			if (liItem.mgr === undefined) {
				return;
			}

			// 該選項被禁用就略過
			if (!liItem.mgr.isAvailable()) {
				return;
			}

			var item = liItem.mgr.getItem();
			// 這個選項是分隔線
			if (liItem.mgr.isSeparator()) {
				if (isLastItemText) {
					isLastItemText = false;
				} else {
					return;
				}
			} else {
				isLastItemText = true;
				// 這個選項有子選單
				if (liItem.mgr.isMenu()) {
					// 遞迴呼叫
					item.menu = this.constructJsonObject(liItem.childNodes[1]/* .lastChild*/);
				}
			}

			// 第一項不能是分隔線
			if (menu.length === 0 && !isLastItemText) {
				return;
			} else {
				menu.push(item);
			}

		}.bind(this));

		// 檢查最後一個選項，是否是分隔線
		if (menu.length) {
			// 從列表移除
			if (menu[menu.length - 1].type === '--') {
				menu.pop();
			}
		}
		return menu;
	},

	onSocketMessage: function(e) {
		var textMsg;
		if (typeof e.data === 'string') {
			textMsg = e.data;
		} else {
			textMsg = '';
		}
		if (textMsg.startsWith('getMenu ') || textMsg.startsWith('getMenuPerm ')) {
			var firstSpace = textMsg.indexOf(' ');
			var otherSpace = textMsg.indexOf(' ', firstSpace + 1);
			var appName;
			var json;
			if (firstSpace >= 0 && otherSpace > firstSpace) {
				appName = textMsg.substring(firstSpace + 1, otherSpace);
				json = JSON.parse(textMsg.substr(otherSpace + 1));

				if (textMsg.startsWith('getMenu ')) {
					this._menubars[appName].menu = json;
					this.initializeMenu(appName);
				} else {
					this._menubars[appName].perm = json;
				}
			}
		// 更新選單權限成功
		} else if (textMsg.startsWith('updateMenuPermOK')) {
			var key = textMsg.split(' ')[1];
			this.showToast({
				title: this._menubars[key].title,
				message: _('Menu permission updated successfully')
			});
		} else {
			console.debug('unknown message: "' + textMsg + '"');
		}
	},

	onSocketClose: function() {
		this.base.call(this);
	},

	/**
	 * 判斷是否 uno 指令
	 * @param {string} unoCommand - uno 指令
	 * @returns {bool} true: 是, false: 否
	 */
	isUnoCommand: function(unoCommand) {
		return (typeof unoCommand === 'string' && unoCommand.startsWith('.uno:'));
	},

	/**
	 * 把 uno 指令轉換成 icon 圖示 URL
	 * @param {string} icon - 若為 'res:' 開頭，則尋找 images/res/ 目錄下同名的圖示
	 * 否則尋找 images/cmd 之下的同名圖示
	 *
	 * @returns {string} 該圖示的位址
	 */
	 getIconURL: function(icon) {
		var iconType = '.svg';
		if (this._resorceIcon[icon]) {
			return this._resIconURL + this._resorceIcon[icon] + iconType;
		}

		icon = icon.toLowerCase(); // 轉成小寫
		// 'res:' 開頭
		if (icon.startsWith('res:')) {
			icon = icon.substring(4);
			return this._resIconURL + icon + iconType;
		} else if (icon.startsWith('.uno:')) {
			icon = icon.substring(5);
		} else if (icon.startsWith('dialog:')) {
			icon = icon.substring(7);
		}

		var unoIcon = this._iconAlias[icon] ? this._iconAlias[icon] : icon;

		console.debug('haha ' + this._cmdIconURL + unoIcon + iconType);
		return this._cmdIconURL + unoIcon + iconType;
	},

	/**
	 * 顯示吐司
	 * @param {object} object
	 */
	 showToast: function(object) {
		var messageBox = document.getElementById('messageBox');
		document.getElementById('messageTitle').innerHTML = object.title;
		document.getElementById('messageBody').innerHTML = object.message;

		messageBox.classList.remove('bg-success', 'bg-warning');
		if (object.alert === true) {
			L.DomUtil.addClass(messageBox, 'bg-warning');
		} else {
			L.DomUtil.addClass(messageBox, 'bg-success');
		}

		$('#messageBox').toast({
			animation: true, // 使用動畫
			autohide: true, // 自動隱藏
			delay: 10000, // 10 秒
		}).toast('show');
	},

	createItem: function(item) {
		var liItem = L.DomUtil.create('li', ''); // li element
		var tagName = (item.type === '--' || Object.keys(item).length === 0 ? 'i' : 'a');

		L.DomUtil.create(tagName, '', liItem); // firstChild

		liItem.mgr = {
			_self: liItem,
			_item: item, // 忠實紀錄 item 資料
			_available: true, // 預設可用
			/**
			 * 取得該 item 的 ID
			 * @returns id or null
			 */
			getId: function() {
				return (this._item.id ? this._item.id : null);
			},
			isHidden: function() {
				return (this._item.hide === true);
			},
			setHidden:function(hidden) {
				this._item.hide === hidden;
				if (hidden) {
					L.DomUtil.addClass(this._self.firstChild, 'disabled');
				} else {
					L.DomUtil.removeClass(this._self.firstChild, 'disabled');
				}
			},
			/**
			 *
			 * @returns true: 可用, false: 禁用
			 */
			isAvailable: function() {
				return this._available;
			},
			/**
			 * 設定該選項是否可用
			 * @param {boolean} available - true:可用, false: 禁用
			 */
			setAvailable: function(available) {
				this._available = available;
				var aItem = this._self.firstChild;
				if (available) {
					L.DomUtil.removeClass(aItem, 'strikethrough');
				} else {
					L.DomUtil.addClass(aItem, 'strikethrough');
				}
			},
			/** 設定該選項為分隔線 */
			setSeparator: function() {
				L.DomUtil.addClass(this._self.firstChild, 'separator');
			},
			/** 該選項是否為分隔線 */
			isSeparator: function() {
				return L.DomUtil.hasClass(this._self.firstChild, 'separator');
			},
			isMenu: function() {
				return L.DomUtil.hasClass(this._self.firstChild, 'has-submenu');
			},
			/** 組成 Item object*/
			getItem: function() {
				return this._item;
			},
		};

		return liItem;
	},

	/**
	 * 利用 json 資料，建立 html 結構的選單
	 */
	createMenu: function(key, menu) {
		var docType = this._menubars[key].docType;
		var itemList = []; // 每個 item 的 html element
		var isLastItemText = false;
		this._menuLevel ++;

		// 依序處理每個選項
		menu.forEach(function(item) {
			var liItem = this.createItem(item);
			var aItem = liItem.firstChild;

			// 忽略被隱藏的選項
			if (item.hide === true) {
				liItem.mgr.setHidden(true);
			}

			// 有指定 id 的話(除了分隔線外，其餘選項必然有)
			if (liItem.mgr.getId()) {
				// 檢查該 id 是否被禁用
				liItem.mgr.setAvailable(this._menubars[key].perm[item.id] !== false);

				// 若同時又指定 name，則選項名稱以 name 為準
				var text = (item.name ? item.name : item.id);
				// 選項名稱依據該名稱是否為 uno 指令，來決定用 _UNO() 或 _() 翻譯
				var textNode = document.createTextNode(
					this.isUnoCommand(text) ? _UNO(text, docType, true) : _(text)
				);
				aItem.appendChild(textNode);

				// 非頂層選項才需顯示圖示及 hot key
				if (this._menuLevel > 1) {
					var iconItem = L.DomUtil.create('i', '');
					var iconURL = 'url("' + this.getIconURL(
						item.icon ? item.icon : text
					) + '")';
					L.DomUtil.setClass(iconItem, 'menuicon img-icon');
					L.DomUtil.setStyle(iconItem, 'backgroundImage', iconURL);
					aItem.insertBefore(iconItem, aItem.firstChild);
					// 有 hot key
					if (item.hotkey) {
						L.DomUtil.addClass(aItem, 'item-has-hotkey');
						var hotkeyItem = L.DomUtil.create('span', 'hotkey', aItem);
						hotkeyItem.textContent = L.Util.replaceCtrlAltInMac(item.hotkey);
					}
				}

				// 處理子選單
				if (item.menu && Array.isArray(item.menu)) {
					// 遞迴呼叫自己
					var subMenu = this.createMenu(key, item.menu);
					if (subMenu.length === 0) {
						return;
					}
					// 建立子選單結構
					var ulItem = L.DomUtil.create('ul', '', liItem);
					// 加入子選單
					subMenu.forEach(function (item) {
						ulItem.appendChild(item);
					});
				}
				isLastItemText = true;
			// 這個 item 是分隔線
			} else if (item.type === '--' || Object.keys(item).length === 0) {
				// 前一個是文字選項
				if (isLastItemText) {
					isLastItemText = false;
					liItem.mgr.setSeparator();
				} else {
					return;
				}
			} else {
				console.debug('Warning! unknow menu item:', item);
				return;
			}

			// 第一項不能是分隔線
			if (itemList.length === 0 && !isLastItemText) {
				return;
			} else {
				itemList.push(liItem);
			}
		}.bind(this));

		this._menuLevel --;
		// 檢查最後一個選項，是否是分隔線
		if (itemList.length) {
			// 從列表移除
			if (itemList[itemList.length - 1].mgr.isSeparator()) {
				itemList.pop();
			}
		}
		return itemList;
	},

	/**
	 * 建立選單
	 * @param {string} key - app 名稱(writer,calc or impress)
	 */
	initializeMenu: function(key) {
		this._menuLevel = 0;
		this._menubars[key].container = document.getElementById(key + '-menu');
		var menuHtml = this.createMenu(key, this._menubars[key].menu);
		// 加入主選單
		menuHtml.forEach(function(item) {
			this._menubars[key].container.appendChild(item);
		}.bind(this));

		// initialize menubar plugin
		$(this._menubars[key].container).smartmenus({
			hideOnClick: false,
			showOnClick: false,
			hideTimeout: 0,
			hideDuration: 0,
			showDuration: 0,
			showTimeout: 0,
			collapsibleHideDuration: 0,
			subIndicatorsPos: 'append'
		}).on('click.smapi', function(e, item) {
			if (item) {
				this.itemClick(key, item);
			} else {
				return false;
			}
		}.bind(this));
	},

	/**
	 *
	 * @param {*} key - writer, calc or impress
	 * @param {*} item - 被點擊的選項
	 */
	itemClick: function(key, item) {
		var liItem = item.parentNode;
		var id = liItem.mgr.getId();
		if (id) {
			var changeAvailable = !liItem.mgr.isAvailable(); // 反轉原先可用狀態
			liItem.mgr.setAvailable(changeAvailable);
		}
	}
});

Admin.MenuEditor = function(host) {
	return new AdminSocketMenuEditor(host);
};

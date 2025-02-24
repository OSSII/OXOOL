/* global describe it require cy afterEach beforeEach */

var helper = require('../../common/helper');
var { insertMultipleComment, setupUIforCommentInsert, createComment } = require('../../common/desktop_helper');
var desktopHelper = require('../../common/desktop_helper');
var calcHelper = require('../../common/calc_helper');

describe(['tagdesktop'], 'Annotation Tests', function() {
	var origTestFileName = 'annotation.ods';
	var testFileName;

	beforeEach(function() {
		testFileName = helper.beforeAll(origTestFileName, 'calc');
		desktopHelper.switchUIToNotebookbar();
	});

	afterEach(function() {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	it('Insert',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');
	});

	it('Modify',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('body').contains('.context-menu-item','Modify').click();
		cy.cGet('#annotation-modify-textarea-1').type('some other text, ');
		cy.cGet('#annotation-save-1').click();
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#annotation-content-area-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some other text, some text');
		cy.cGet('#comment-container-1').should('exist');
	});

	it('Reply should not be possible', function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('.context-menu-list:visible .context-menu-item').should('not.have.text', 'Reply');
	});

	it('Remove',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('body').contains('.context-menu-item','Remove').click();
		cy.cGet('#comment-container-1').should('not.exist');
	});

	it('Delete then Create Sheet should not retain comment',function() {
		calcHelper.assertNumberofSheets(1);

		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);

                insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');
		cy.cGet('.oxool-annotation').should('exist');

		calcHelper.selectOptionFromContextMenu('Delete Sheet...');
		cy.cGet('#delete-sheet-modal-response').click();
		calcHelper.assertNumberofSheets(1);

		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
		cy.cGet('#comment-container-1').should('not.exist');
	});
});

describe(['tagdesktop'], 'Annotation Autosave Tests', function() {
	var origTestFileName = 'annotation.ods';
	var testFileName;

	beforeEach(function() {
		testFileName = helper.beforeAll(origTestFileName, 'calc');
		desktopHelper.switchUIToNotebookbar();
	});

	afterEach(function() {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	it('Insert autosave',function() {
		setupUIforCommentInsert('calc');
		createComment('writer', 'Test Comment', false, '[id=insert-insert-annotation]');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','Test Comment');
	});

	it('Insert autosave save',function() {
		setupUIforCommentInsert('calc');
		createComment('writer', 'Test Comment', false, '[id=insert-insert-annotation]');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');
		cy.cGet('#annotation-save-1').click();
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('.oxool-annotation-autosavelabel').should('be.not.visible');
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','Test Comment');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','Test Comment');
	});

	it('Insert autosave cancel',function() {
		setupUIforCommentInsert('calc');
		createComment('writer', 'Test Comment', false, '[id=insert-insert-annotation]');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');
		cy.cGet('#annotation-cancel-1').click();
		cy.cGet('.oxool-annotation').should('not.exist');
		cy.cGet('.oxool-annotation-autosavelabel').should('not.exist');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('not.exist');
	});

	it('Modify autosave',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('body').contains('.context-menu-item','Modify').click();
		cy.cGet('#annotation-modify-textarea-1').type('some other text, ');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some other text, some text0');
	});

	it('Modify autosave save',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('body').contains('.context-menu-item','Modify').click();
		cy.cGet('#annotation-modify-textarea-1').type('some other text, ');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');
		cy.cGet('#annotation-save-1').click();
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#annotation-content-area-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some other text, some text0');
		cy.cGet('#comment-container-1').should('exist');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some other text, some text0');
	});

	it('Modify autosave cancel',function() {
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('#comment-container-1').should('exist');

		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
		cy.cGet('#comment-annotation-menu-1').click();
		cy.cGet('body').contains('.context-menu-item','Modify').click();
		cy.cGet('#annotation-modify-textarea-1').type('some other text, ');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');
		cy.cGet('#annotation-cancel-1').click();
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#annotation-content-area-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
		cy.cGet('#comment-container-1').should('exist');

		helper.closeDocument(testFileName, '');
		helper.beforeAll(testFileName, 'calc', true, false, false, true);
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
	});
});

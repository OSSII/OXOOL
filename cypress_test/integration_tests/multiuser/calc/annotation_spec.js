/* global describe it require cy afterEach beforeEach */

var helper = require('../../common/helper');
var { insertMultipleComment, setupUIforCommentInsert, createComment } = require('../../common/desktop_helper');
var desktopHelper = require('../../common/desktop_helper');

describe(['tagmultiuser'], 'Multiuser Annotation Tests', function() {
	var origTestFileName = 'annotation.ods';
	var testFileName;

	beforeEach(function() {
		testFileName = helper.beforeAll(origTestFileName, 'calc', undefined, true);
		desktopHelper.switchUIToNotebookbar();
	});

	afterEach(function() {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	it('Insert',function() {
		cy.cSetActiveFrame('#iframe1');
		insertMultipleComment('calc', 1, false, '[id=insert-insert-annotation]');

		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some text');
	});

	it('Modify',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#annotation-content-area-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('contain','some other text, some text');
		cy.cGet('#comment-container-1').should('exist');
	});

	it('Remove',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('#comment-container-1').should('not.exist');
	});
});

describe(['tagmultiuser'], 'Multiuser Annotation Autosave Tests', function() {
	var origTestFileName = 'annotation.ods';
	var testFileName;

	beforeEach(function() {
		testFileName = helper.beforeAll(origTestFileName, 'calc', undefined, true);
		desktopHelper.switchUIToNotebookbar();
	});

	afterEach(function() {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	it('Insert autosave',function() {
		cy.cSetActiveFrame('#iframe1');
		setupUIforCommentInsert('calc');
		createComment('writer', 'Test Comment', false, '[id=insert-insert-annotation]');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','Test Comment');
	});

	it('Insert autosave save',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','Test Comment');
	});

	it('Insert autosave cancel',function() {
		cy.cSetActiveFrame('#iframe1');
		setupUIforCommentInsert('calc');
		createComment('writer', 'Test Comment', false, '[id=insert-insert-annotation]');
		cy.cGet('#map').focus();
		cy.cGet('.oxool-annotation-autosavelabel').should('be.visible');
		cy.cGet('.oxool-annotation-edit.modify-annotation').should('be.visible');
		cy.cGet('#annotation-cancel-1').click();
		cy.cGet('.oxool-annotation').should('not.exist');
		cy.cGet('.oxool-annotation-autosavelabel').should('not.exist');

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('not.exist');
	});

	it('Modify autosave',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some other text, some text0');
	});

	it('Modify autosave save',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some other text, some text0');
	});

	it('Modify autosave cancel',function() {
		cy.cSetActiveFrame('#iframe1');
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

		cy.cSetActiveFrame('#iframe2');
		cy.cGet('.oxool-annotation').should('exist');
		cy.cGet('#comment-container-1').then(function (element) {
			element[0].style.visibility = '';
			element[0].style.display = '';
		});
		cy.cGet('#comment-container-1').trigger('mouseover');
		cy.cGet('#annotation-content-area-1').should('have.text','some text0');
	});
});

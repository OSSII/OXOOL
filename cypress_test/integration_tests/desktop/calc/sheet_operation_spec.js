/* global describe it cy beforeEach require afterEach */

var helper = require('../../common/helper');
var calcHelper = require('../../common/calc_helper');

describe(['tagdesktop', 'tagnextcloud', 'tagproxy'], 'Sheet Operations.', function () {
	var origTestFileName = 'sheet_operation.ods';
	var testFileName;

	beforeEach(function () {
		testFileName = helper.beforeAll(origTestFileName, 'calc');
	});

	afterEach(function () {
		helper.afterAll(testFileName, this.currentTest.state);
	});

	it('Insert sheet', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
	});

	it.skip('Switching sheet sets the view that contains cell-cursor', function () {
		calcHelper.assertNumberofSheets(1);
		helper.typeIntoInputField('input#addressInput', 'A1');
		calcHelper.ensureViewContainsCellCursor();
		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
		helper.clickOnIdle('#spreadsheet-tab1');
		calcHelper.ensureViewContainsCellCursor();
		helper.typeIntoInputField('input#addressInput', 'A200');
		calcHelper.ensureViewContainsCellCursor();
		helper.clickOnIdle('#spreadsheet-tab0');
		calcHelper.ensureViewContainsCellCursor();
	});

	it('Insert sheet before', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet1');
		calcHelper.selectOptionFromContextMenu('Insert sheet before this');
		calcHelper.assertNumberofSheets(2);
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet2');
		cy.cGet('#spreadsheet-tab1').should('have.text', 'Sheet1');
	});

	it('Insert sheet after', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet1');
		calcHelper.selectOptionFromContextMenu('Insert sheet after this');
		calcHelper.assertNumberofSheets(2);
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet1');
		cy.cGet('#spreadsheet-tab1').should('have.text', 'Sheet2');
	});

	it('Delete sheet', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
		calcHelper.selectOptionFromContextMenu('Delete Sheet...');
		cy.cGet('#delete-sheet-modal-response').click();
		calcHelper.assertNumberofSheets(1);
	});

	it('Rename sheet', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('.spreadsheet-tab.spreadsheet-tab-selected').should('have.text', 'Sheet1');
		calcHelper.selectOptionFromContextMenu('Rename Sheet...');
		cy.cGet('#modal-dialog-rename-calc-sheet').should('exist');
		cy.cGet('#input-modal-input').clear().type('renameSheet');
		cy.cGet('#response-ok').click();
		cy.cGet('.spreadsheet-tab.spreadsheet-tab-selected').should('have.text', 'renameSheet');
	});

	it('Hide/Show sheet', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
		//hide sheet
		calcHelper.selectOptionFromContextMenu('Hide Sheet');
		calcHelper.assertNumberofSheets(1);
		//show sheet
		calcHelper.selectOptionFromContextMenu('Show Sheet');
		cy.cGet('#show-sheets-modal').should('exist');
		cy.cGet('#hidden-part-checkbox-1').check();
		cy.cGet('#show-sheets-modal-response').click();
		calcHelper.assertNumberofSheets(2);
	});

	it('Move sheet left/right', function () {
		calcHelper.assertNumberofSheets(1);
		cy.cGet('#tb_spreadsheet-toolbar_item_insertsheet').click();
		calcHelper.assertNumberofSheets(2);
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet1');
		//left
		calcHelper.selectOptionFromContextMenu('Move Sheet Left');
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet2');
		//right
		calcHelper.selectOptionFromContextMenu('Move Sheet Right');
		cy.cGet('#spreadsheet-tab0').should('have.text', 'Sheet1');
	});
});

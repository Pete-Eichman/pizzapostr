describe('Pizza Builder', () => {
  // Use a session-based approach: register + sign in before tests
  const testUser = {
    name: 'Pizza Builder Tester',
    email: `pizza-${Date.now()}@test.com`,
    password: 'testpassword123',
  };

  before(() => {
    // Register a user
    cy.visit('/auth/register');
    cy.get('input[name="name"]').type(testUser.name);
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/auth/signin', { timeout: 10000 });

    // Sign in
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.contains('Build Your Pizza', { timeout: 10000 }).should('be.visible');
  });

  it('renders the pizza canvas', () => {
    cy.get('canvas').should('be.visible');
  });

  it('renders topping buttons', () => {
    cy.contains('Pepperoni').should('be.visible');
    cy.contains('Mushrooms').should('be.visible');
    cy.contains('Olives').should('be.visible');
    cy.contains('Peppers').should('be.visible');
  });

  it('toggles topping selection', () => {
    // Click Pepperoni to select
    cy.contains('Pepperoni').click();
    cy.contains('Pepperoni').should('have.class', 'bg-stone-800');

    // Click again to deselect
    cy.contains('Pepperoni').click();
    cy.contains('Pepperoni').should('have.class', 'bg-stone-100');
  });

  it('opens and closes save dialog', () => {
    cy.contains('Save Pizza').click();
    cy.contains('Name Your Pizza').should('be.visible');

    cy.contains('Cancel').click();
    cy.contains('Name Your Pizza').should('not.exist');
  });

  it('saves a pizza and displays it in the sidebar', () => {
    // Select toppings
    cy.contains('Pepperoni').click();
    cy.contains('Olives').click();

    // Open save dialog
    cy.contains('Save Pizza').click();
    cy.get('input[placeholder*="Friday Night"]').type('E2E Test Pizza');
    cy.get('button').contains('Save').click();

    // Should show success message
    cy.contains('Pizza saved successfully!').should('be.visible');

    // Pizza should appear in sidebar
    cy.contains('E2E Test Pizza').should('be.visible');
    cy.contains('pepperoni, olive').should('be.visible');
  });

  it('loads a saved pizza', () => {
    // First deselect all toppings
    cy.contains('Pepperoni').click(); // deselect
    cy.contains('Olives').click(); // deselect

    // Verify they are deselected
    cy.contains('Pepperoni').should('have.class', 'bg-stone-100');

    // Click Load on the saved pizza
    cy.contains('Load').click();

    // Toppings should be re-selected
    cy.contains('Pepperoni').should('have.class', 'bg-stone-800');
    cy.contains('Olives').should('have.class', 'bg-stone-800');
  });

  it('deletes a saved pizza', () => {
    cy.contains('E2E Test Pizza')
      .parent()
      .within(() => {
        cy.get('button').contains('✕').click();
      });

    cy.contains('E2E Test Pizza').should('not.exist');
  });
});

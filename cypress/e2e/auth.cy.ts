describe('Authentication Flow', () => {
  const testUser = {
    name: 'Cypress Test User',
    email: `cypress-${Date.now()}@test.com`,
    password: 'testpassword123',
  };

  it('shows the sign-in page for unauthenticated users', () => {
    cy.visit('/');
    cy.url().should('include', '/auth/signin');
  });

  it('navigates from sign-in to register page', () => {
    cy.visit('/auth/signin');
    cy.contains('Create an account').click();
    cy.url().should('include', '/auth/register');
  });

  it('shows validation messages for empty registration fields', () => {
    cy.visit('/auth/register');
    cy.get('button[type="submit"]').click();
    // HTML5 validation should prevent submission with empty required fields
    cy.get('input[name="name"]:invalid').should('exist');
  });

  it('registers a new user', () => {
    cy.visit('/auth/register');

    cy.get('input[name="name"]').type(testUser.name);
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();

    // After successful registration, should redirect to sign-in
    cy.url().should('include', '/auth/signin', { timeout: 10000 });
  });

  it('signs in with the registered user', () => {
    cy.visit('/auth/signin');

    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();

    // Should end up on the main page with the pizza builder
    cy.contains('Build Your Pizza', { timeout: 10000 }).should('be.visible');
  });
});

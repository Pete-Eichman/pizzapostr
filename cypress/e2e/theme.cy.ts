describe('Theme Toggle', () => {
  const testUser = {
    name: 'Theme Tester',
    email: `theme-${Date.now()}@test.com`,
    password: 'testpassword123',
  };

  before(() => {
    cy.visit('/auth/register');
    cy.get('input[name="name"]').type(testUser.name);
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/auth/signin', { timeout: 10000 });

    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    cy.contains('Build Your Pizza', { timeout: 10000 }).should('be.visible');
  });

  it('has a theme toggle button', () => {
    cy.get('button[aria-label*="Switch to"]').should('be.visible');
  });

  it('toggles to dark mode', () => {
    cy.get('button[aria-label="Switch to dark mode"]').click();

    // html element should have dark class
    cy.get('html').should('have.class', 'dark');
    cy.get('button[aria-label="Switch to light mode"]').should('be.visible');
  });

  it('toggles back to light mode', () => {
    cy.get('button[aria-label="Switch to light mode"]').click();

    cy.get('html').should('not.have.class', 'dark');
    cy.get('button[aria-label="Switch to dark mode"]').should('be.visible');
  });

  it('persists theme preference across page reload', () => {
    // Switch to dark mode
    cy.get('button[aria-label="Switch to dark mode"]').click();
    cy.get('html').should('have.class', 'dark');

    // Reload the page
    cy.reload();
    cy.contains('Build Your Pizza', { timeout: 10000 }).should('be.visible');

    // Should still be dark
    cy.get('html').should('have.class', 'dark');

    // Clean up: switch back to light
    cy.get('button[aria-label="Switch to light mode"]').click();
  });
});

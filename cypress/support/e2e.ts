// Cypress E2E support file
// Add custom commands and global configuration here

Cypress.on('uncaught:exception', (_err) => {
  // Prevent Cypress from failing on uncaught exceptions from the app
  // (e.g., Next.js hydration warnings)
  return false;
});

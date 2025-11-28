# Testing Strategy

## Overview

This project uses Playwright for E2E testing to ensure UI correctness and prevent regressions like incorrect i18n usage.

## Database Setup

### Why a separate test database?

- Isolates test data from dev and production
- Allows parallel test execution without conflicts
- Prevents data pollution in development database
- Safe to reset/clean between test runs

### Setup Instructions

1. **Create test database**:
   ```bash
   createdb larib_portal_test
   ```

2. **Configure environment**:
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your test database credentials
   ```

3. **Run migrations**:
   ```bash
   chmod +x scripts/setup-test-db.sh
   ./scripts/setup-test-db.sh
   ```

### Test Data Management

- **Seed data**: Create test fixtures in `prisma/seed.test.ts` (optional)
- **Clean between runs**: Tests should be idempotent or clean up after themselves
- **Isolation**: Each test should work independently

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/bestof-larib.spec.ts
```

### UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

## Test Structure

### Current Test Suites

- `auth.spec.ts`: Authentication flow (currently outdated, needs update)
- `bestof-larib.spec.ts`: Best of Larib features, including relative time display

### Writing New Tests

1. **Create test file**: `tests/e2e/feature-name.spec.ts`
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Use Page Object Model** for complex pages (optional)
4. **Check for i18n errors**: Always verify no translation keys are displayed

Example:
```typescript
test('should not display translation keys', async ({ page }) => {
  await page.goto('/your-page');

  // Check for curly braces indicating untranslated keys
  const translationKeys = page.locator('text=/\\{\\w+\\}/');
  await expect(translationKeys).toHaveCount(0);
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests (via GitHub Actions)
- Before deployment

The PR reviewer workflow can be configured to run tests before approving PRs.

## Common Issues

### Tests fail with "Database not found"
- Ensure `.env.test` is configured correctly
- Run `./scripts/setup-test-db.sh`

### Tests hang or timeout
- Check if dev server is running on correct port
- Increase timeout in `playwright.config.ts` if needed

### Random failures
- Usually due to race conditions
- Use `waitForSelector`, `waitForURL`, `waitForLoadState`
- Avoid hard-coded `page.waitForTimeout()`

## Best Practices

1. **Always login before protected routes**: Use `test.beforeEach()` for auth
2. **Clean test data**: Remove data created during tests
3. **Use semantic selectors**: Prefer `getByRole`, `getByLabel` over `locator`
4. **Test i18n**: Check both English and French versions
5. **Screenshot on failure**: Configured automatically in Playwright

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests Guide](https://playwright.dev/docs/writing-tests)

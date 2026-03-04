import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows a link to the register page', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Create one' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/register');
  });

  test('shows an error on invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('notauser@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('img', { name: /alert/i }).or(
      page.locator('[class*="destructive"]')
    )).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders the registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('shows a link back to the login page', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Sign in' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  test('enforces minimum password length', async ({ page }) => {
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Browser native validation prevents submit — password field should be invalid
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveJSProperty('validity.valid', false);
  });
});

import { test, expect } from '@playwright/test';

const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123',
};

test.describe('Authentication Flow', () => {
  test('should display navbar with login/signup buttons when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('link', { name: 'F FeedbackApp' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('should toggle between login and signup forms', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await page.getByText('Need an account? Sign up').click();
    
    await expect(page.getByText('Create a new account')).toBeVisible();
    await expect(page.getByPlaceholder('Name')).toBeVisible();
    
    await page.getByText('Already have an account? Sign in').click();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/login');
    
    // Test login validation
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email address')).toBeVisible();
    
    await page.getByPlaceholder('Email address').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email address')).toBeVisible();
    
    await page.getByPlaceholder('Email address').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('should create a new account', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Need an account? Sign up').click();
    
    await page.getByPlaceholder('Name').fill(testUser.name);
    await page.getByPlaceholder('Email address').fill(testUser.email);
    await page.getByPlaceholder('Password').fill(testUser.password);
    
    await page.getByRole('button', { name: 'Sign up' }).click();
    
    // Should redirect to home page after successful signup
    await page.waitForURL('/');
    
    // Should show user is logged in
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should login with existing account', async ({ page }) => {
    // First create an account
    await page.goto('/login');
    await page.getByText('Need an account? Sign up').click();
    
    const loginUser = {
      name: 'Login Test User',
      email: `logintest${Date.now()}@example.com`,
      password: 'password123',
    };
    
    await page.getByPlaceholder('Name').fill(loginUser.name);
    await page.getByPlaceholder('Email address').fill(loginUser.email);
    await page.getByPlaceholder('Password').fill(loginUser.password);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForURL('/');
    
    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    
    // Login again
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(loginUser.email);
    await page.getByPlaceholder('Password').fill(loginUser.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    await page.waitForURL('/');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('Email address').fill('nonexistent@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    await expect(page.getByText(/Authentication failed|Invalid credentials/)).toBeVisible();
  });

  test('should access profile page when authenticated', async ({ page }) => {
    // Create and login
    await page.goto('/login');
    await page.getByText('Need an account? Sign up').click();
    
    const profileUser = {
      name: 'Profile Test User',
      email: `profile${Date.now()}@example.com`,
      password: 'password123',
    };
    
    await page.getByPlaceholder('Name').fill(profileUser.name);
    await page.getByPlaceholder('Email address').fill(profileUser.email);
    await page.getByPlaceholder('Password').fill(profileUser.password);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForURL('/');
    
    // Navigate to profile
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('/profile');
    
    // Check profile information
    await expect(page.getByText('User Profile')).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: profileUser.name })).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: profileUser.email })).toBeVisible();
  });

  test('should redirect to login when accessing profile unauthenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Create and login
    await page.goto('/login');
    await page.getByText('Need an account? Sign up').click();
    
    const logoutUser = {
      name: 'Logout Test User',
      email: `logout${Date.now()}@example.com`,
      password: 'password123',
    };
    
    await page.getByPlaceholder('Name').fill(logoutUser.name);
    await page.getByPlaceholder('Email address').fill(logoutUser.email);
    await page.getByPlaceholder('Password').fill(logoutUser.password);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForURL('/');
    
    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    
    // Should show login/signup buttons again
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
    
    // Should not be able to access profile
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });
});
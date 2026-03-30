import { expect, type Locator, type Page } from '@playwright/test';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export interface ManualContentInput {
  title: string;
  body: string;
}

const DEFAULT_PASSWORD = process.env.E2E_TEST_PASSWORD || 'P@ssw0rd123!';

export function createTestUser(prefix = 'user'): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: `${prefix}-${id}`,
    email: `${prefix}-${id}@example.com`,
    password: DEFAULT_PASSWORD,
  };
}

export async function register(page: Page, user: TestUser) {
  await page.goto('/register');
  await page.getByTestId('register-name').fill(user.name);
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);
  await page.getByTestId('register-submit').click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '知识库' })).toBeVisible();
}

export async function login(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '知识库' })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/($|login$)|\/login$/);
}

export async function saveManualContent(page: Page, input: ManualContentInput) {
  const editor = page.getByTestId('quick-collect-input');
  const content = `${input.title}\n\n${input.body}`;

  await editor.fill(content);
  await page.getByTestId('quick-collect-submit').click();

  await expect(editor).toHaveValue('');
  await expect(contentCard(page, input.title)).toBeVisible();
}

export async function openContent(page: Page, title: string) {
  await contentCard(page, title).click();
  await expect(page).toHaveURL(/\/reader\/.+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

export function contentCard(page: Page, title: string): Locator {
  return page.locator('[data-testid^="content-card-"]').filter({ hasText: title }).first();
}

import { expect, test } from '@playwright/test';
import {
  contentCard,
  createTestUser,
  login,
  logout,
  openContent,
  register,
  saveManualContent,
} from './helpers/app';

test.describe('P0 core journeys', () => {
  test('@p0 user can register, log out, and log back in', async ({ page }) => {
    const user = createTestUser('p0-auth');

    await register(page, user);
    await logout(page);
    await login(page, user);
  });

  test('@p0 user can collect manual content and persist reading status', async ({ page }) => {
    const user = createTestUser('p0-reader');
    const title = `P0 reading note ${Date.now()}`;

    await register(page, user);
    await saveManualContent(page, {
      title,
      body: '这是一段用于 P0 端到端测试的正文，用来验证采集、进入阅读页和状态切换。',
    });

    await openContent(page, title);
    await page.getByTestId('reader-full-tab').click();
    await expect(
      page.getByText('这是一段用于 P0 端到端测试的正文，用来验证采集、进入阅读页和状态切换。')
    ).toBeVisible();

    await page.getByTestId('reader-status-select').selectOption('READING');
    await expect(page.getByTestId('reader-status-select')).toHaveValue('READING');

    await page.getByTestId('reader-back').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByTestId('dashboard-filter-reading').click();
    await expect(contentCard(page, title)).toContainText('阅读中');
  });
});

import { expect, test } from '@playwright/test';
import {
  contentCard,
  createTestUser,
  openContent,
  register,
  saveManualContent,
} from './helpers/app';

test.describe('P1 secondary journeys', () => {
  test('@p1 dashboard search and status filters work with collected notes', async ({ page }) => {
    const user = createTestUser('p1-dashboard');
    const unreadTitle = `P1 unread note ${Date.now()}`;
    const readTitle = `P1 read note ${Date.now()}`;

    await register(page, user);

    await saveManualContent(page, {
      title: unreadTitle,
      body: '搜索和筛选需要能找到这篇未读内容。',
    });
    await saveManualContent(page, {
      title: readTitle,
      body: '这篇内容会被切换为已读，用来验证状态过滤。',
    });

    await openContent(page, readTitle);
    await page.getByTestId('reader-status-select').selectOption('READ');
    await expect(page.getByTestId('reader-status-select')).toHaveValue('READ');
    await page.getByTestId('reader-back').click();

    await page.getByTestId('dashboard-search').fill(unreadTitle);
    await expect(contentCard(page, unreadTitle)).toBeVisible();
    await expect(page.locator('[data-testid^="content-card-"]').filter({ hasText: readTitle })).toHaveCount(0);

    await page.getByTestId('dashboard-search').fill('');
    await page.getByTestId('dashboard-filter-read').click();
    await expect(contentCard(page, readTitle)).toContainText('已读');
    await expect(page.locator('[data-testid^="content-card-"]').filter({ hasText: unreadTitle })).toHaveCount(0);

    await page.getByTestId('dashboard-filter-unread').click();
    await expect(contentCard(page, unreadTitle)).toContainText('未读');
    await expect(page.locator('[data-testid^="content-card-"]').filter({ hasText: readTitle })).toHaveCount(0);
  });

  test('@p1 review page shows the empty-state experience for a fresh user', async ({ page }) => {
    const user = createTestUser('p1-review');

    await register(page, user);
    await page.goto('/review');

    await expect(page.getByTestId('review-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: '今日复习', exact: true })).toBeVisible();
    await expect(page.getByTestId('review-empty-state')).toContainText('今日复习完成');
  });

  test('@p1 knowledge graph pages render their main entry points', async ({ page }) => {
    await page.goto('/knowledge-graph');

    await expect(page.getByTestId('knowledge-graph-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Knowledge Graph' })).toBeVisible();
    await page.getByRole('link', { name: '互动探索' }).click();

    await expect(page).toHaveURL(/\/knowledge-graph\/explore$/);
    await expect(page.getByText('探索路径')).toBeVisible();
    await expect(page.getByText('深度探索')).toBeVisible();
  });
});

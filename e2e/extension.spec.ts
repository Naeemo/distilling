import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import * as path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../apps/extension');
const TEST_ARTICLE_URL = 'https://mp.weixin.qq.com/s?__biz=MzI5NjUyNTE4MQ==&mid=2247483659&idx=1&sn=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // 示例URL

test.describe('Chrome Extension - WeChat Article Extraction', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    // 启动 Chrome 并加载扩展
    context = await chromium.launchPersistentContext('', {
      headless: false, // 必须非无头模式才能加载扩展
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    // 等待扩展加载
    await new Promise(r => setTimeout(r, 2000));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should extract WeChat article content', async () => {
    const page = await context.newPage();
    
    // 打开微信文章 (使用测试文章或真实文章)
    // 注意：微信文章有反爬，可能需要先登录或处理验证码
    await page.goto(TEST_ARTICLE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded');
    
    // 检查是否能获取到微信文章内容
    const title = await page.$eval('#activity_name', el => el.textContent).catch(() => null);
    const content = await page.$eval('#js_content', el => el.textContent).catch(() => null);
    const author = await page.$eval('#js_name', el => el.textContent).catch(() => null);
    
    console.log('Extracted:');
    console.log('Title:', title?.slice(0, 50));
    console.log('Author:', author?.slice(0, 30));
    console.log('Content length:', content?.length);
    
    // 验证内容提取
    expect(title).toBeTruthy();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);
  });

  test('should trigger extension popup', async () => {
    const page = await context.newPage();
    await page.goto(TEST_ARTICLE_URL, { waitUntil: 'networkidle' });
    
    // 获取扩展 ID
    const extensionId = await getExtensionId(context);
    console.log('Extension ID:', extensionId);
    
    // 打开扩展 popup
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup.html`);
    
    // 验证 popup 内容
    await expect(popup.locator('body')).toBeVisible();
  });
});

async function getExtensionId(context: BrowserContext): Promise<string> {
  // 通过 service worker 获取扩展 ID
  const worker = context.serviceWorkers()[0];
  if (worker) {
    const url = worker.url();
    const match = url.match(/chrome-extension:\/\/([^\/]+)/);
    return match?.[1] || '';
  }
  return '';
}

const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../apps/extension');
const TEST_URL = process.argv[2] || 'https://mp.weixin.qq.com/s?__biz=MzI5NjUyNTE4MQ==';

async function test() {
  console.log('🚀 启动 Chrome...');
  console.log('📦 扩展:', EXTENSION_PATH);
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage();
  
  console.log('🔗 打开:', TEST_URL);
  await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 提取内容
  const result = await page.evaluate(() => {
    const title = document.querySelector('#activity_name')?.textContent?.trim() || 
                  document.querySelector('h2.rich_media_title')?.textContent?.trim();
    const author = document.querySelector('#js_name')?.textContent?.trim();
    const content = document.querySelector('#js_content')?.textContent?.trim() || '';
    
    return { title, author, contentLength: content.length, url: location.href };
  });

  console.log('\n📄 结果:');
  console.log('  标题:', result.title || '❌ 未提取');
  console.log('  作者:', result.author || '❌ 未提取');
  console.log('  内容:', result.contentLength, '字符');
  
  const success = result.title && result.contentLength > 100;
  console.log('\n' + (success ? '✅ 测试通过' : '❌ 测试失败'));
  
  console.log('\n按 Ctrl+C 关闭浏览器...');
}

test().catch(console.error);

import { chromium } from 'playwright';

const TEST_URL = 'https://mp.weixin.qq.com/s?__biz=MzIzNjc1NzUzMw==&mid=2247790479&idx=2&sn=1c2526d14ae8ed2a829f7c9bbfd8223a';

async function debug() {
  console.log('🔍 调试文章:', TEST_URL);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  
  try {
    console.log('⏳ 导航到页面...');
    const response = await page.goto(TEST_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('   状态码:', response?.status());
    console.log('   最终URL:', page.url());
    
    // 等待更长时间
    await page.waitForTimeout(5000);
    
    // 检查页面内容
    const html = await page.content();
    console.log('   HTML长度:', html.length);
    
    // 尝试多种选择器
    const selectors = [
      '#activity_name',
      'h1.rich_media_title', 
      'h2.rich_media_title',
      '#js_content',
      '.rich_media_content',
      'title',
    ];
    
    console.log('\n📋 检查选择器:');
    for (const selector of selectors) {
      const element = await page.$(selector);
      const text = element ? await element.textContent() : null;
      console.log(`   ${selector}: ${element ? '✅' : '❌'} ${text?.slice(0, 30) || ''}`);
    }
    
    // 提取任何文本内容
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500));
    console.log('\n📝 页面文本预览:');
    console.log(bodyText);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    
    // 截图
    const screenshot = await page.screenshot({ encoding: 'base64' });
    console.log('\n📸 截图 (base64前100字符):');
    console.log(screenshot.slice(0, 100) + '...');
    
  } finally {
    await browser.close();
  }
}

debug();

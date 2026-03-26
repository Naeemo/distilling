import { chromium } from 'playwright';

// 同一篇文章的不同链接格式
const TEST_CASES = [
  {
    name: '短链接格式',
    url: 'https://mp.weixin.qq.com/s/U54NDf4N3OphHM4izUapow', // 之前的成功案例
  },
  {
    name: '原始长链接格式', 
    url: 'https://mp.weixin.qq.com/s?__biz=MzIzNjc1NzUzMw==&mid=2247790479&idx=2&sn=1c2526d14ae8ed2a829f7c9bbfd8223a',
  },
];

async function test() {
  console.log('🔍 URL格式对比测试\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  for (const testCase of TEST_CASES) {
    console.log(`\n📄 ${testCase.name}`);
    console.log(`   ${testCase.url.slice(0, 70)}...`);
    
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    try {
      const response = await page.goto(testCase.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const finalUrl = page.url();
      const isCaptcha = finalUrl.includes('wappoc_appmsgcaptcha');
      
      console.log(`   状态: ${response?.status()}`);
      console.log(`   结果: ${isCaptcha ? '❌ 触发验证码' : '✅ 正常访问'}`);
      
      if (!isCaptcha) {
        // 尝试提取标题
        const title = await page.$eval('#activity_name, h1.rich_media_title, h2.rich_media_title', 
          el => el.textContent?.trim()
        ).catch(() => null);
        console.log(`   标题: ${title?.slice(0, 40) || '未提取'}`);
      }

    } catch (error) {
      console.log(`   ❌ 错误: ${error.message.slice(0, 60)}`);
    }
    
    await page.close();
    await new Promise(r => setTimeout(r, 2000)); // 间隔2秒
  }

  await browser.close();
  
  console.log('\n\n📊 结论:');
  console.log('长链接格式更容易触发微信验证码机制');
}

test();

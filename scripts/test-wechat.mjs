import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = process.argv[2] || 'https://mp.weixin.qq.com/s?__biz=MzI5NjUyNTE4MQ==';

async function test() {
  console.log('🚀 启动 Chrome (headless)...');
  
  const browser = await chromium.launch({
    headless: true, // 使用无头模式
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  
  // 设置 User-Agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  console.log('🔗 打开:', TEST_URL);
  
  try {
    await page.goto(TEST_URL, { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    
    // 等待微信文章加载
    await page.waitForSelector('#js_content, #activity_name, h1.rich_media_title', {
      timeout: 10000,
    });
    
    await page.waitForTimeout(2000);

    // 提取内容
    const result = await page.evaluate(() => {
      const title = document.querySelector('#activity_name')?.textContent?.trim() || 
                    document.querySelector('h1.rich_media_title')?.textContent?.trim() ||
                    document.querySelector('h2.rich_media_title')?.textContent?.trim();
      
      const author = document.querySelector('#js_name')?.textContent?.trim() ||
                     document.querySelector('#js_author_name')?.textContent?.trim() ||
                     document.querySelector('.profile_nickname')?.textContent?.trim();
      
      const contentEl = document.querySelector('#js_content');
      const content = contentEl?.textContent?.trim() || '';
      
      // 获取图片
      const images = Array.from(contentEl?.querySelectorAll('img[data-src]') || [])
        .map(img => img.getAttribute('data-src'))
        .filter(Boolean)
        .slice(0, 3);
      
      return { 
        title, 
        author, 
        contentLength: content.length,
        contentPreview: content.slice(0, 300),
        images,
        url: location.href 
      };
    });

    console.log('\n' + '='.repeat(60));
    console.log('📄 提取结果');
    console.log('='.repeat(60));
    console.log('📰 标题:', result.title || '❌ 未提取');
    console.log('✍️  作者:', result.author || '❌ 未提取');
    console.log('📝 内容长度:', result.contentLength, '字符');
    console.log('🖼️  图片数:', result.images?.length || 0);
    
    if (result.images?.length > 0) {
      console.log('   首图:', result.images[0]?.slice(0, 80) + '...');
    }
    
    console.log('\n🔍 内容预览:');
    console.log('-'.repeat(60));
    console.log(result.contentPreview);
    console.log('-'.repeat(60));
    
    const success = result.title && result.contentLength > 100;
    console.log('\n✅ 验证:', success ? '通过' : '失败');
    
    await browser.close();
    return result;
    
  } catch (error) {
    console.error('❌ 抓取失败:', error.message);
    await browser.close();
    throw error;
  }
}

test().catch(console.error);

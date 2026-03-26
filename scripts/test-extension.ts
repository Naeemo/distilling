/**
 * 微信文章扩展测试脚本
 * 
 * 使用方法:
 * 1. 启动后端: cd apps/api && npm run start:dev
 * 2. 运行测试: npx ts-node scripts/test-extension.ts [微信文章URL]
 * 
 * 测试步骤:
 * 1. 启动真实 Chrome 浏览器
 * 2. 加载未打包的扩展
 * 3. 导航到微信文章页面
 * 4. 注入内容脚本执行提取逻辑
 * 5. 验证提取结果
 */

import { chromium } from 'playwright';
import * as path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../apps/extension');

// 示例微信文章URL (可以替换为任意有效的微信文章)
const DEFAULT_TEST_URL = 'https://mp.weixin.qq.com/s?__biz=MzI5NjUyNTE4MQ==';

async function testExtension() {
  const testUrl = process.argv[2] || DEFAULT_TEST_URL;
  
  console.log('🚀 启动 Chrome 浏览器...');
  console.log('📦 扩展路径:', EXTENSION_PATH);
  console.log('🔗 测试文章:', testUrl);
  console.log('');

  // 启动 Chrome (非无头模式，方便观察)
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
  });

  try {
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();

    // 打开微信文章
    console.log('⏳ 正在打开微信文章...');
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 等待内容加载
    await page.waitForTimeout(3000);

    // 执行内容脚本相同的提取逻辑
    console.log('🔍 提取文章内容...\n');
    
    const extractionResult = await page.evaluate(() => {
      // 与扩展内容脚本相同的提取逻辑
      function extractFromWeChat() {
        const title = document.querySelector('#activity_name')?.textContent?.trim() || 
                      document.querySelector('h2.rich_media_title')?.textContent?.trim() ||
                      document.title;
        
        const author = document.querySelector('#js_name')?.textContent?.trim() ||
                       document.querySelector('#js_author_name')?.textContent?.trim() ||
                       document.querySelector('.rich_media_meta_nickname')?.textContent?.trim();
        
        const contentElement = document.querySelector('#js_content');
        const contentText = contentElement ? getCleanText(contentElement) : '';
        
        const publishTime = document.querySelector('#publish_time')?.textContent?.trim() ||
                           document.querySelector('#js_publishtime')?.textContent?.trim();
        
        const coverImage = document.querySelector('#js_content img')?.getAttribute('data-src') ||
                          document.querySelector('meta[property="og:image"]')?.getAttribute('content');

        return {
          success: !!(title && contentText),
          title,
          author,
          contentLength: contentText.length,
          contentPreview: contentText.slice(0, 200) + '...',
          publishTime,
          coverImage,
          url: window.location.href,
        };
      }

      function getCleanText(element: Element): string {
        const clone = element.cloneNode(true) as HTMLElement;
        
        // 移除脚本和样式
        clone.querySelectorAll('script, style, iframe').forEach(el => el.remove());
        
        // 获取文本
        let text = clone.innerText || '';
        
        // 清理
        return text
          .replace(/\n{3,}/g, '\n\n')
          .replace(/^\s+|\s+$/g, '');
      }

      return extractFromWeChat();
    });

    // 输出结果
    console.log('='.repeat(60));
    console.log('📄 提取结果');
    console.log('='.repeat(60));
    console.log('✅ 成功:', extractionResult.success);
    console.log('📰 标题:', extractionResult.title);
    console.log('✍️  作者:', extractionResult.author || 'N/A');
    console.log('📅 发布时间:', extractionResult.publishTime || 'N/A');
    console.log('📝 内容长度:', extractionResult.contentLength, '字符');
    console.log('');
    console.log('🔍 内容预览:');
    console.log('-'.repeat(60));
    console.log(extractionResult.contentPreview);
    console.log('-'.repeat(60));
    console.log('🔗 URL:', extractionResult.url);
    console.log('='.repeat(60));

    // 验证关键字段
    const validations = [
      { name: '标题', value: extractionResult.title, minLength: 5 },
      { name: '内容', value: extractionResult.contentLength, minLength: 100 },
    ];

    console.log('\n✅ 验证结果:');
    let allPassed = true;
    for (const v of validations) {
      const passed = typeof v.value === 'number' 
        ? v.value >= v.minLength 
        : (v.value?.length || 0) >= v.minLength;
      console.log(`  ${passed ? '✓' : '✗'} ${v.name}: ${passed ? '通过' : '失败'}`);
      if (!passed) allPassed = false;
    }

    console.log('');
    if (allPassed) {
      console.log('🎉 所有测试通过！扩展工作正常。');
    } else {
      console.log('⚠️  部分测试失败，请检查提取逻辑。');
    }

    // 等待用户查看结果
    console.log('\n⏳ 浏览器保持打开，按 Ctrl+C 关闭...');
    await new Promise(() => {}); // 无限等待

  } catch (error) {
    console.error('❌ 测试失败:', error);
    await browser.close();
    process.exit(1);
  }
}

testExtension().catch(console.error);

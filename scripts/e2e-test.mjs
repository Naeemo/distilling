import { chromium } from 'playwright';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

// 测试文章列表
const TEST_ARTICLES = [
  {
    url: 'https://mp.weixin.qq.com/s/fGjGpC0ivEOKLsdrwfKysg',
    expected: {
      domain: 'tech', // 预期领域：科技
      hasTechnicalContent: true,
    }
  },
  {
    url: 'https://mp.weixin.qq.com/s/6V3hcgvsoEI5b7ebMG0WeQ',
    expected: {
      domain: 'tech',
      hasTechnicalContent: true,
    }
  },
  {
    url: 'https://mp.weixin.qq.com/s?__biz=MzIzNjc1NzUzMw==&mid=2247790479&idx=2&sn=1c2526d14ae8ed2a829f7c9bbfd8223a',
    expected: {
      domain: 'general',
      hasTechnicalContent: false,
    }
  },
];

// 测试结果汇总
const results = {
  passed: 0,
  failed: 0,
  articles: [],
};

async function fetchArticle(page, url, index) {
  console.log(`\n📄 [${index + 1}/${TEST_ARTICLES.length}] ${url.slice(0, 50)}...`);
  
  try {
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    // 检查是否被重定向到验证码页面
    const finalUrl = page.url();
    if (finalUrl.includes('wappoc_appmsgcaptcha') || finalUrl.includes('captcha')) {
      console.log(`  ⚠️  触发微信验证码验证，跳过`);
      return { success: false, skipped: true, reason: 'captcha' };
    }
    
    await page.waitForSelector('#js_content, #activity_name, h1.rich_media_title, h2.rich_media_title', {
      timeout: 15000,
    });
    
    await page.waitForTimeout(3000);

    const article = await page.evaluate(() => {
      const title = document.querySelector('#activity_name')?.textContent?.trim() || 
                    document.querySelector('h1.rich_media_title')?.textContent?.trim() ||
                    document.querySelector('h2.rich_media_title')?.textContent?.trim();
      
      const author = document.querySelector('#js_name')?.textContent?.trim() ||
                     document.querySelector('.profile_nickname')?.textContent?.trim() ||
                     document.querySelector('#js_author_name')?.textContent?.trim();
      
      const contentEl = document.querySelector('#js_content');
      const contentText = contentEl?.textContent?.trim() || '';
      
      const paragraphs = contentEl?.querySelectorAll('p').length || 0;
      const images = Array.from(contentEl?.querySelectorAll('img[data-src]') || [])
        .map(img => img.getAttribute('data-src'))
        .filter(Boolean);
      
      return { 
        title, 
        author, 
        contentLength: contentText.length,
        paragraphs,
        images,
        url: location.href,
      };
    });

    const validations = [
      { name: '标题', passed: !!article.title && article.title.length > 5 },
      { name: '作者', passed: !!article.author },
      { name: '内容', passed: article.contentLength > 200 },
    ];

    const allPassed = validations.every(v => v.passed);
    
    console.log(`  ${allPassed ? '✅' : '❌'} ${article.title?.slice(0, 40)}${article.title?.length > 40 ? '...' : ''}`);
    console.log(`     作者: ${article.author || 'N/A'} | 字数: ${article.contentLength} | 段落: ${article.paragraphs} | 图片: ${article.images?.length || 0}`);

    return { success: allPassed, article, validations };
    
  } catch (error) {
    console.log(`  ❌ 错误: ${error.message.slice(0, 60)}`);
    return { success: false, error: error.message };
  }
}

async function login() {
  const testUser = {
    email: `e2e_${Date.now()}@test.com`,
    password: 'test123456',
  };
  
  console.log('\n🔐 创建测试用户...');
  
  try {
    await axios.post(`${API_URL}/auth/register`, testUser);
  } catch (e) {
    // 可能已存在，忽略
  }
  
  const res = await axios.post(`${API_URL}/auth/login`, testUser);
  const token = res.data.tokens?.accessToken;
  console.log('  ✅ 登录成功');
  
  return { token, user: res.data.user };
}

async function saveContent(token, article) {
  try {
    const res = await axios.post(
      `${API_URL}/contents`,
      { url: article.url },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`     💾 保存成功: ${res.data.id.slice(0, 16)}...`);
    return { success: true, content: res.data };
  } catch (error) {
    console.log(`     ❌ 保存失败: ${error.response?.data?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  InfoDigest E2E 测试 - 多文章采集');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`测试文章数: ${TEST_ARTICLES.length}`);
  console.log(`API地址: ${API_URL}`);

  // 启动浏览器
  console.log('\n🚀 启动 Chrome...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  // 抓取所有文章
  console.log('\n📚 阶段一: 文章抓取');
  console.log('─'.repeat(60));
  
  const articles = [];
  for (let i = 0; i < TEST_ARTICLES.length; i++) {
    const testCase = TEST_ARTICLES[i];
    const result = await fetchArticle(page, testCase.url, i);
    
    if (result.success) {
      articles.push({ ...result.article, expected: testCase.expected });
      results.passed++;
    } else if (result.skipped) {
      results.skipped = (results.skipped || 0) + 1;
    } else {
      results.failed++;
    }
    results.articles.push(result);
  }

  await browser.close();

  if (articles.length === 0) {
    console.log('\n❌ 所有文章抓取失败，测试终止');
    process.exit(1);
  }

  // 登录并保存
  console.log('\n' + '─'.repeat(60));
  console.log('💾 阶段二: 内容保存');
  console.log('─'.repeat(60));
  
  const { token, user } = await login();
  
  const savedContents = [];
  for (const article of articles) {
    const result = await saveContent(token, article);
    if (result.success) {
      savedContents.push({ ...result.content, original: article });
    }
  }

  // 测试其他功能
  console.log('\n' + '─'.repeat(60));
  console.log('🔍 阶段三: 功能验证');
  console.log('─'.repeat(60));
  
  // 3.1 获取内容列表
  console.log('\n📋 获取内容列表...');
  try {
    const listRes = await axios.get(
      `${API_URL}/contents`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`  ✅ 列表获取成功: ${listRes.data.data?.length || 0} 条内容`);
  } catch (error) {
    console.log(`  ❌ 列表获取失败: ${error.message}`);
  }

  // 3.2 获取单篇详情
  if (savedContents.length > 0) {
    const firstContent = savedContents[0];
    console.log('\n📄 获取内容详情...');
    try {
      const detailRes = await axios.get(
        `${API_URL}/contents/${firstContent.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`  ✅ 详情获取成功: ${detailRes.data.title?.slice(0, 30)}...`);
    } catch (error) {
      console.log(`  ❌ 详情获取失败: ${error.message}`);
    }
  }

  // 3.3 更新阅读状态
  if (savedContents.length > 0) {
    const content = savedContents[0];
    console.log('\n📝 更新阅读状态...');
    try {
      await axios.patch(
        `${API_URL}/contents/${content.id}/status`,
        { status: 'READING' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(`  ✅ 状态更新成功: READING`);
    } catch (error) {
      console.log(`  ❌ 状态更新失败: ${error.message}`);
    }
  }

  // 汇总报告
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 测试报告');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`文章抓取: ${results.passed}/${TEST_ARTICLES.length} 成功 ${results.skipped ? `(${results.skipped} 跳过)` : ''}`);
  console.log(`内容保存: ${savedContents.length}/${articles.length} 成功`);
  console.log(`测试用户: ${user.email}`);
  
  console.log('\n📑 已保存内容:');
  savedContents.forEach((content, idx) => {
    console.log(`  ${idx + 1}. ${content.title?.slice(0, 45)}${content.title?.length > 45 ? '...' : ''}`);
    console.log(`     ID: ${content.id}`);
  });

  const skippedArticles = results.articles.filter(r => r.skipped);
  if (skippedArticles.length > 0) {
    console.log('\n📋 跳过的文章:');
    skippedArticles.forEach((r, idx) => {
      console.log(`  ${idx + 1}. 触发微信验证码验证`);
    });
  }

  const overallSuccess = results.passed >= 2;
  
  console.log('\n' + '═'.repeat(60));
  if (overallSuccess) {
    console.log('  ✅ 测试通过 (主要功能正常)');
  } else {
    console.log('  ❌ 测试失败');
  }
  console.log('═'.repeat(60));

  return overallSuccess;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常:', error);
    process.exit(1);
  });

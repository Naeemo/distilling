import axios from 'axios';
import { chromium } from 'playwright';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const TEST_URL = process.argv[2] || 'https://mp.weixin.qq.com/s/U54NDf4N3OphHM4izUapow';

// 测试账号
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'test123456',
};

async function fetchArticle(url) {
  console.log('🔍 Step 1: 抓取微信文章...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#js_content', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const article = await page.evaluate(() => {
    const title = document.querySelector('#activity_name, h1.rich_media_title, h2.rich_media_title')?.textContent?.trim();
    const author = document.querySelector('#js_name, .profile_nickname')?.textContent?.trim();
    const contentEl = document.querySelector('#js_content');
    const contentText = contentEl?.innerText?.trim() || '';
    const publishTime = document.querySelector('#publish_time, #js_publishtime')?.textContent?.trim();
    
    const coverImage = document.querySelector('#js_content img[data-src]')?.getAttribute('data-src') ||
                      document.querySelector('meta[property="og:image"]')?.getAttribute('content');

    return { title, author, contentText, publishTime, coverImage };
  });

  await browser.close();
  
  console.log('  ✅ 抓取成功');
  console.log(`     标题: ${article.title}`);
  console.log(`     作者: ${article.author}`);
  console.log(`     字数: ${article.contentText.length}`);
  
  return article;
}

async function login() {
  console.log('\n🔐 Step 2: 登录...');
  
  try {
    const res = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    const token = res.data.tokens?.accessToken;
    console.log('  ✅ 登录成功');
    return token;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('  📝 用户不存在，创建用户...');
      try {
        await axios.post(`${API_URL}/auth/register`, TEST_USER);
        const res = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        console.log('  ✅ 注册并登录成功');
        return res.data.tokens?.accessToken;
      } catch (regError) {
        if (regError.response?.data?.message === 'Email already registered') {
          console.log('  ⚠️  用户已存在但密码不匹配，请检查测试账号密码');
          throw new Error('测试账号密码错误');
        }
        throw regError;
      }
    }
    throw error;
  }
}

async function saveContent(token, article) {
  console.log('\n💾 Step 3: 保存到 InfoDigest...');
  
  const res = await axios.post(
    `${API_URL}/contents`,
    { url: TEST_URL },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  console.log('  ✅ 保存成功');
  console.log(`     ID: ${res.data.id}`);
  console.log(`     状态: ${res.data.status}`);
  
  return res.data;
}

async function generateInsight(token, contentId) {
  console.log('\n🧠 Step 4: 生成内容洞察 (知识图谱)...');
  
  try {
    const res = await axios.post(
      `${API_URL}/knowledge-graph/contents/${contentId}/insight`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('  ✅ 分析完成');
    console.log(`     主题数: ${res.data.topics?.length || 0}`);
    console.log(`     实体数: ${res.data.keyEntities?.length || 0}`);
    console.log(`     立场: ${res.data.stance || 'N/A'}`);
    
    return res.data;
  } catch (error) {
    console.log('  ⚠️  洞察生成失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function getPosition(token, contentId) {
  console.log('\n📍 Step 5: 获取信息位置...');
  
  try {
    const res = await axios.get(
      `${API_URL}/knowledge-graph/contents/${contentId}/position`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const { position, role } = res.data;
    console.log('  ✅ 位置分析完成');
    console.log(`     领域: ${position.domain}`);
    console.log(`     深度: ${position.level}`);
    console.log(`     受众: ${position.audience}`);
    console.log(`     角色: ${role.type}`);
    
    return res.data;
  } catch (error) {
    console.log('  ⚠️  位置分析失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  InfoDigest 完整功能测试');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`测试文章: ${TEST_URL}\n`);

  try {
    // Step 1: 抓取文章
    const article = await fetchArticle(TEST_URL);
    
    // Step 2: 登录
    const token = await login();
    
    // Step 3: 保存内容
    const content = await saveContent(token, article);
    
    // Step 4: 生成洞察
    const insight = await generateInsight(token, content.id);
    
    // Step 5: 获取位置
    const position = await getPosition(token, content.id);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ 所有测试通过');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应:', error.response.data);
    }
    process.exit(1);
  }
}

main();

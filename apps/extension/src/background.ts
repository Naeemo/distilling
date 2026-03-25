/**
 * InfoDigest Background Service Worker
 * 处理消息通信和 API 调用
 * 支持从网页端自动同步 Token
 */

const API_BASE_URL = 'http://localhost:3001';
const API_ENDPOINT = '/api/v1/contents';

interface SaveContentRequest {
  url: string;
  title: string;
  contentText: string;
  sourceType: 'WEB';
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  needLogin?: boolean;
}

// 扩展 ID（用于外部网站通信验证）
const EXTENSION_ID = chrome.runtime.id;

/**
 * 从 storage 获取 Token
 */
async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('infodigest_token');
  return result.infodigest_token || null;
}

/**
 * 存储 Token 到 storage
 */
async function storeToken(token: string): Promise<void> {
  await chrome.storage.local.set({ 
    infodigest_token: token,
    token_synced_at: Date.now()
  });
}

/**
 * 清除 Token
 */
async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(['infodigest_token', 'token_synced_at']);
}

/**
 * 调用 InfoDigest API 保存内容
 */
async function saveToApi(content: SaveContentRequest, token: string): Promise<ApiResponse> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(content)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      if (response.status === 401) {
        // Token 失效，清除存储
        await clearToken();
        return { success: false, error: '登录已过期，请重新登录 InfoDigest' };
      }

      if (response.status === 403) {
        return { success: false, error: '权限不足，无法保存内容' };
      }

      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[InfoDigest] 第 ${attempt} 次请求失败，${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: `请求失败 (已重试 ${maxRetries} 次): ${lastError?.message}`
  };
}

/**
 * 从当前标签页提取文章数据
 */
async function extractFromCurrentTab(): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      return { success: false, error: '无法获取当前标签页' };
    }

    // 检查是否在微信公众号页面
    if (!tab.url?.includes('mp.weixin.qq.com')) {
      return { success: false, error: '当前页面不是微信公众号文章' };
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'EXTRACT_ARTICLE'
    });

    return response;

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '提取文章失败'
    };
  }
}

/**
 * 保存当前文章
 */
async function saveCurrentArticle(): Promise<ApiResponse> {
  const token = await getStoredToken();

  if (!token) {
    return { 
      success: false, 
      error: '未登录 InfoDigest，请先访问网页版登录',
      needLogin: true
    };
  }

  const extractResult = await extractFromCurrentTab();

  if (!extractResult.success || !extractResult.data) {
    return { success: false, error: extractResult.error || '提取文章失败' };
  }

  const articleData = extractResult.data;

  const content: SaveContentRequest = {
    url: articleData.url as string,
    title: articleData.title as string,
    contentText: articleData.contentText as string,
    sourceType: 'WEB'
  };

  return await saveToApi(content, token);
}

/**
 * 检查当前页面状态
 */
async function checkCurrentPage(): Promise<{ 
  success: boolean; 
  data?: { isWechatArticle: boolean; url?: string };
  error?: string;
}> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isWechatArticle = tab?.url?.includes('mp.weixin.qq.com') ?? false;
    return { 
      success: true, 
      data: { isWechatArticle, url: tab?.url } 
    };
  } catch (error) {
    return { success: false, error: '检查页面失败' };
  }
}

/**
 * 获取连接状态（Token + 页面）
 */
async function getConnectionStatus(): Promise<{
  isLoggedIn: boolean;
  isWechatArticle: boolean;
  url?: string;
}> {
  const [tokenResult, pageResult] = await Promise.all([
    getStoredToken(),
    checkCurrentPage()
  ]);

  return {
    isLoggedIn: !!tokenResult,
    isWechatArticle: pageResult.success ? pageResult.data?.isWechatArticle ?? false : false,
    url: pageResult.success ? pageResult.data?.url : undefined
  };
}

// ============================================
// 消息监听
// ============================================

/**
 * 监听来自 popup 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleMessage = async () => {
    switch (request.action) {
      case 'SAVE_ARTICLE':
        return await saveCurrentArticle();

      case 'GET_CONNECTION_STATUS':
        return { success: true, data: await getConnectionStatus() };

      case 'CLEAR_TOKEN':
        await clearToken();
        return { success: true };

      default:
        return { success: false, error: '未知操作' };
    }
  };

  handleMessage().then(sendResponse);
  return true;
});

/**
 * 监听来自外部网站（InfoDigest 网页）的消息
 * 实现方案 A：网页 → 扩展 Token 同步
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  const handleExternalMessage = async () => {
    // 验证消息来源（可选的安全检查）
    const senderUrl = sender.url || sender.origin || '';
    const isAllowedOrigin = 
      senderUrl.includes('localhost:3000') ||
      senderUrl.includes('infodigest.app') ||  // 生产域名
      senderUrl.includes('infodigest.io');     // 备用域名

    if (!isAllowedOrigin) {
      console.warn('[InfoDigest] 拒绝来自未授权来源的消息:', senderUrl);
      return { success: false, error: '未授权的来源' };
    }

    switch (request.type) {
      case 'SET_TOKEN':
        if (request.token && typeof request.token === 'string') {
          await storeToken(request.token);
          console.log('[InfoDigest] Token 已从网页同步');
          return { success: true, message: 'Token 已同步' };
        }
        return { success: false, error: '无效的 Token' };

      case 'CLEAR_TOKEN':
        await clearToken();
        console.log('[InfoDigest] Token 已清除');
        return { success: true, message: 'Token 已清除' };

      case 'CHECK_EXTENSION':
        // 网页端用来检测扩展是否安装
        return { 
          success: true, 
          installed: true,
          version: chrome.runtime.getManifest().version
        };

      default:
        return { success: false, error: '未知操作类型' };
    }
  };

  handleExternalMessage().then(sendResponse);
  return true;
});

console.log('[InfoDigest] Background service worker 已启动');

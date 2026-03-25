"use strict";
/**
 * InfoDigest Content Script
 * 用于从微信公众号文章页面提取内容
 */
/**
 * 提取文章标题
 */
function extractTitle() {
    // 尝试多个选择器
    const selectors = [
        '#activity_name',
        'h1.rich_media_title',
        '#js_title',
        'h1#activity_name',
        '.rich_media_title'
    ];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim();
            if (text)
                return text;
        }
    }
    // 兜底：使用页面标题
    return document.title?.trim() || '未知标题';
}
/**
 * 提取作者名称
 */
function extractAuthor() {
    const selectors = [
        '#js_name',
        '.profile_nickname',
        '#js_profile_name',
        '.rich_media_meta_author',
        'a#js_name'
    ];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim();
            if (text)
                return text;
        }
    }
    return '未知作者';
}
/**
 * 提取正文内容
 */
function extractContent() {
    const contentElement = document.querySelector('#js_content');
    if (!contentElement) {
        console.error('[InfoDigest] 未找到文章内容元素 #js_content');
        return '';
    }
    // 克隆元素以避免修改原页面
    const clone = contentElement.cloneNode(true);
    // 移除脚本和样式元素
    const scripts = clone.querySelectorAll('script, style, link');
    scripts.forEach(el => el.remove());
    // 获取纯文本
    let text = clone.innerText || '';
    // 清理空白字符
    text = text
        .replace(/\n{3,}/g, '\n\n') // 多个换行合并为两个
        .replace(/^\s+|\s+$/g, ''); // 去除首尾空白
    return text;
}
/**
 * 提取封面图片
 */
function extractCoverImage() {
    // 从 meta 标签提取
    const metaSelectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]'
    ];
    for (const selector of metaSelectors) {
        const meta = document.querySelector(selector);
        if (meta?.content) {
            return meta.content;
        }
    }
    // 尝试从页面变量提取
    try {
        const match = document.documentElement.innerHTML.match(/var\s+msg_cdn_url\s*=\s*["']([^"']+)["']/);
        if (match?.[1]) {
            return match[1];
        }
    }
    catch (e) {
        // 忽略错误
    }
    return null;
}
/**
 * 提取发布时间
 */
function extractPublishTime() {
    const selectors = [
        '#publish_time',
        '.rich_media_meta_list em',
        '#js_publish_time',
        '.rich_media_meta_text'
    ];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.trim();
            if (text)
                return text;
        }
    }
    return null;
}
/**
 * 提取完整文章数据
 */
function extractArticleData() {
    return {
        url: window.location.href,
        title: extractTitle(),
        author: extractAuthor(),
        contentText: extractContent(),
        coverImage: extractCoverImage(),
        publishTime: extractPublishTime()
    };
}
/**
 * 监听来自 background 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_ARTICLE') {
        console.log('[InfoDigest] 收到提取文章请求');
        try {
            const data = extractArticleData();
            console.log('[InfoDigest] 文章提取成功:', data.title);
            sendResponse({ success: true, data });
        }
        catch (error) {
            console.error('[InfoDigest] 文章提取失败:', error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
        return true; // 保持消息通道开启
    }
});
console.log('[InfoDigest] Content script 已加载');
//# sourceMappingURL=content.js.map
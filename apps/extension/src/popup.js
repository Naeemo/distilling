"use strict";
/**
 * InfoDigest Popup Script
 * 弹出界面逻辑 - 自动同步 Token 版本
 * 无需手动输入 Token，从网页端自动获取
 */
// DOM 元素
const elements = {
    statusCard: document.getElementById('statusCard'),
    statusIcon: document.getElementById('statusIcon'),
    statusTitle: document.getElementById('statusTitle'),
    statusMessage: document.getElementById('statusMessage'),
    loginGuide: document.getElementById('loginGuide'),
    openWebBtn: document.getElementById('openWebBtn'),
    articlePreview: document.getElementById('articlePreview'),
    articleAuthor: document.getElementById('articleAuthor'),
    articleTitle: document.getElementById('articleTitle'),
    saveBtn: document.getElementById('saveBtn'),
    saveBtnText: document.getElementById('saveBtnText')
};
// 当前状态
let currentStatus = null;
let currentArticle = null;
/**
 * 显示状态卡片
 */
function showStatus(type, icon, title, message) {
    elements.statusCard.className = `status-card ${type}`;
    elements.statusCard.classList.remove('hidden');
    elements.statusIcon.textContent = icon;
    elements.statusTitle.textContent = title;
    elements.statusMessage.textContent = message;
}
/**
 * 隐藏状态卡片
 */
function hideStatus() {
    elements.statusCard.classList.add('hidden');
}
/**
 * 显示登录指引
 */
function showLoginGuide() {
    elements.loginGuide.classList.remove('hidden');
    elements.articlePreview.classList.add('hidden');
    elements.saveBtn.classList.add('hidden');
}
/**
 * 隐藏登录指引
 */
function hideLoginGuide() {
    elements.loginGuide.classList.add('hidden');
}
/**
 * 显示文章预览
 */
function showArticlePreview(article) {
    currentArticle = article;
    elements.articleAuthor.textContent = `作者：${article.author}`;
    elements.articleTitle.textContent = article.title;
    elements.articlePreview.classList.remove('hidden');
}
/**
 * 设置保存按钮状态
 */
function setSaveButton(enabled, loading = false) {
    elements.saveBtn.disabled = !enabled || loading;
    if (loading) {
        elements.saveBtnText.innerHTML = '<span class="spinner"></span> 保存中...';
    }
    else {
        elements.saveBtnText.textContent = '💾 保存到 InfoDigest';
    }
}
/**
 * 初始化：检查连接状态和页面
 */
async function initialize() {
    try {
        // 获取连接状态
        const response = await chrome.runtime.sendMessage({ action: 'GET_CONNECTION_STATUS' });
        if (!response.success) {
            showStatus('error', '❌', '获取状态失败', response.error || '请重试');
            return;
        }
        currentStatus = response.data;
        // 情况1：未登录
        if (!currentStatus?.isLoggedIn) {
            showLoginGuide();
            hideStatus();
            return;
        }
        hideLoginGuide();
        // 情况2：已登录，但不在微信文章页面
        if (!currentStatus?.isWechatArticle) {
            showStatus('warning', '⚠️', '不在微信文章页面', '请打开一篇微信公众号文章后再使用');
            elements.articlePreview.classList.add('hidden');
            elements.saveBtn.classList.add('hidden');
            return;
        }
        // 情况3：已登录，在微信文章页面 - 提取文章预览
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            try {
                const articleResponse = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_ARTICLE' });
                if (articleResponse.success && articleResponse.data) {
                    showArticlePreview(articleResponse.data);
                    elements.saveBtn.classList.remove('hidden');
                    setSaveButton(true);
                    hideStatus();
                }
                else {
                    showStatus('error', '❌', '提取失败', articleResponse.error || '无法提取文章内容');
                }
            }
            catch (error) {
                // Content script 未加载（可能不是微信文章）
                showStatus('warning', '⚠️', '无法提取文章', '请确保在微信文章页面');
            }
        }
    }
    catch (error) {
        showStatus('error', '❌', '初始化失败', error instanceof Error ? error.message : '未知错误');
    }
}
/**
 * 保存文章
 */
async function saveArticle() {
    setSaveButton(false, true);
    try {
        const response = await chrome.runtime.sendMessage({ action: 'SAVE_ARTICLE' });
        if (response.success) {
            showStatus('success', '✅', '保存成功', '文章已保存到 InfoDigest');
            elements.saveBtn.classList.add('hidden');
        }
        else {
            if (response.needLogin) {
                showStatus('warning', '🔐', '登录已过期', '请重新登录 InfoDigest');
                showLoginGuide();
            }
            else {
                showStatus('error', '❌', '保存失败', response.error || '未知错误');
                setSaveButton(true);
            }
        }
    }
    catch (error) {
        showStatus('error', '❌', '保存失败', error instanceof Error ? error.message : '未知错误');
        setSaveButton(true);
    }
}
/**
 * 打开 InfoDigest 网页
 */
function openInfoDigest() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
}
// 事件监听
elements.openWebBtn.addEventListener('click', openInfoDigest);
elements.saveBtn.addEventListener('click', saveArticle);
// 初始化
document.addEventListener('DOMContentLoaded', initialize);
//# sourceMappingURL=popup.js.map
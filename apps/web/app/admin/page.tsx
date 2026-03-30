'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LLMConfig {
  providerType: 'vertex-ai' | 'custom';
  provider: string;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  models: string[];
}

const VERTEX_AI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-2.5-flash'];
const DEFAULT_CUSTOM_MODELS = ['step-3.5-flash', 'step-3.5-turbo', 'gpt-4o'];

export default function AdminConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<LLMConfig>({
    providerType: 'vertex-ai',
    provider: 'vertex-ai',
    baseURL: '',
    apiKey: '',
    defaultModel: 'gemini-2.0-flash',
    models: VERTEX_AI_MODELS,
  });

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/system-config/llm/config', {
          credentials: 'same-origin',
        });

        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('加载配置失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // 切换 provider 类型
  const handleProviderTypeChange = (type: 'vertex-ai' | 'custom') => {
    if (type === 'vertex-ai') {
      setConfig({
        providerType: 'vertex-ai',
        provider: 'vertex-ai',
        baseURL: '',
        apiKey: '',
        defaultModel: 'gemini-2.0-flash',
        models: VERTEX_AI_MODELS,
      });
    } else {
      setConfig({
        providerType: 'custom',
        provider: 'stepfun',
        baseURL: 'https://api.stepfun.com/v1',
        apiKey: '',
        defaultModel: 'step-3.5-flash',
        models: DEFAULT_CUSTOM_MODELS,
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');

      const res = await fetch('/api/v1/system-config/llm/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage('✓ 配置已保存');
      } else {
        const err = await res.json();
        setMessage(`保存失败: ${err.message || '未知错误'}`);
      }
    } catch (err) {
      setMessage('保存失败: 网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setMessage('测试连接...');
    // TODO: 实现测试连接API
    setMessage('测试功能待实现');
  };

  const addModel = () => {
    const newModel = prompt('输入模型名称:');
    if (newModel && !config.models.includes(newModel)) {
      setConfig({ ...config, models: [...config.models, newModel] });
    }
  };

  const removeModel = (model: string) => {
    setConfig({
      ...config,
      models: config.models.filter((m) => m !== model),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              系统配置
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              仅管理员可访问
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← 返回 Dashboard
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.startsWith('✓')
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              LLM 大模型配置
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              选择默认 Vertex AI (Gemini) 或自定义 OpenAI 兼容提供商
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Provider Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                选择 LLM 提供商
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('vertex-ai')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    config.providerType === 'vertex-ai'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Vertex AI (Gemini)
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Google Cloud 托管的 Gemini 模型
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {config.providerType === 'vertex-ai' ? '● 当前选择' : '点击切换'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderTypeChange('custom')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    config.providerType === 'custom'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">
                    自定义 OpenAI 兼容
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Stepfun、OpenAI 或其他兼容 API
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {config.providerType === 'custom' ? '● 当前选择' : '点击切换'}
                  </div>
                </button>
              </div>
            </div>

            {/* 自定义 Provider 配置 */}
            {config.providerType === 'custom' && (
              <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  自定义 API 配置
                </h3>

                {/* Provider Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提供商名称
                  </label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="stepfun">阶跃星辰 (Stepfun)</option>
                    <option value="openai">OpenAI</option>
                    <option value="custom">其他</option>
                  </select>
                </div>

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API 基础 URL
                  </label>
                  <input
                    type="text"
                    value={config.baseURL}
                    onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                    placeholder="https://api.stepfun.com/v1"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    OpenAI 兼容格式的 API 端点
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    密钥将被加密存储，不会在前端显示明文
                  </p>
                </div>
              </div>
            )}

            {/* 公共配置：模型选择 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                模型配置
              </h3>

              {/* Default Model */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  默认模型
                </label>
                <select
                  value={config.defaultModel}
                  onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {config.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Models List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  可用模型列表
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.models.map((model) => (
                    <span
                      key={model}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {model}
                      <button
                        onClick={() => removeModel(model)}
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={addModel}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  + 添加模型
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? '保存中...' : '保存配置'}
            </button>
            {config.providerType === 'custom' && (
              <button
                onClick={handleTest}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                测试连接
              </button>
            )}
          </div>
        </div>

        {/* 其他配置预留 */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            更多配置
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            其他系统配置项将在后续版本中添加...
          </p>
        </div>
      </div>
    </div>
  );
}

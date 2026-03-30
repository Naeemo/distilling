import { defineConfig, type DefaultTheme } from 'vitepress';

const repository = 'Naeemo/distilling';
const repositoryName = repository.split('/')[1];
const base =
  process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}/` : '/';

type LocalePrefix = '' | '/zh';

const withLocalePrefix = (localePrefix: LocalePrefix, path: string) =>
  localePrefix ? `${localePrefix}${path}` : path;

const createNav = (
  localePrefix: LocalePrefix,
  text: {
    gettingStarted: string;
    workflows: string;
    platforms: string;
    reference: string;
  },
): DefaultTheme.NavItem[] => [
  {
    text: text.gettingStarted,
    link: withLocalePrefix(localePrefix, '/getting-started/overview'),
    activeMatch: `^${withLocalePrefix(localePrefix, '/getting-started/')}`,
  },
  {
    text: text.workflows,
    link: withLocalePrefix(localePrefix, '/workflows/collect-content'),
    activeMatch: `^${withLocalePrefix(localePrefix, '/workflows/')}`,
  },
  {
    text: text.platforms,
    link: withLocalePrefix(localePrefix, '/platforms/web-app'),
    activeMatch: `^${withLocalePrefix(localePrefix, '/platforms/')}`,
  },
  {
    text: text.reference,
    link: withLocalePrefix(localePrefix, '/reference/concepts'),
    activeMatch: `^${withLocalePrefix(localePrefix, '/reference/')}`,
  },
  { text: 'GitHub', link: `https://github.com/${repository}` },
];

const createSidebar = (
  localePrefix: LocalePrefix,
  text: {
    gettingStarted: string;
    overview: string;
    firstWorkflow: string;
    workflows: string;
    collectContent: string;
    readAndReview: string;
    knowledgeGraph: string;
    platforms: string;
    webApp: string;
    browserExtension: string;
    mobileShortcut: string;
    reference: string;
    concepts: string;
    troubleshooting: string;
  },
): DefaultTheme.Sidebar => ({
  [withLocalePrefix(localePrefix, '/getting-started/')]: [
    {
      text: text.gettingStarted,
      items: [
        {
          text: text.overview,
          link: withLocalePrefix(localePrefix, '/getting-started/overview'),
        },
        {
          text: text.firstWorkflow,
          link: withLocalePrefix(localePrefix, '/getting-started/first-workflow'),
        },
      ],
    },
  ],
  [withLocalePrefix(localePrefix, '/workflows/')]: [
    {
      text: text.workflows,
      items: [
        {
          text: text.collectContent,
          link: withLocalePrefix(localePrefix, '/workflows/collect-content'),
        },
        {
          text: text.readAndReview,
          link: withLocalePrefix(localePrefix, '/workflows/read-and-review'),
        },
        {
          text: text.knowledgeGraph,
          link: withLocalePrefix(localePrefix, '/workflows/knowledge-graph'),
        },
      ],
    },
  ],
  [withLocalePrefix(localePrefix, '/platforms/')]: [
    {
      text: text.platforms,
      items: [
        {
          text: text.webApp,
          link: withLocalePrefix(localePrefix, '/platforms/web-app'),
        },
        {
          text: text.browserExtension,
          link: withLocalePrefix(localePrefix, '/platforms/browser-extension'),
        },
        {
          text: text.mobileShortcut,
          link: withLocalePrefix(localePrefix, '/platforms/mobile-shortcut'),
        },
      ],
    },
  ],
  [withLocalePrefix(localePrefix, '/reference/')]: [
    {
      text: text.reference,
      items: [
        {
          text: text.concepts,
          link: withLocalePrefix(localePrefix, '/reference/concepts'),
        },
        {
          text: text.troubleshooting,
          link: withLocalePrefix(localePrefix, '/reference/troubleshooting'),
        },
      ],
    },
  ],
});

export default defineConfig({
  title: 'InfoDigest Docs',
  description:
    'Product documentation for collecting, understanding, and revisiting information with InfoDigest.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: createNav('', {
          gettingStarted: 'Get Started',
          workflows: 'Workflows',
          platforms: 'Platforms',
          reference: 'Reference',
        }),
        sidebar: createSidebar('', {
          gettingStarted: 'Get Started',
          overview: 'Overview',
          firstWorkflow: 'First Workflow',
          workflows: 'Workflows',
          collectContent: 'Collect Content',
          readAndReview: 'Read and Review',
          knowledgeGraph: 'Knowledge Graph',
          platforms: 'Platforms',
          webApp: 'Web App',
          browserExtension: 'Browser Extension',
          mobileShortcut: 'Mobile Shortcut',
          reference: 'Reference',
          concepts: 'Concepts',
          troubleshooting: 'Troubleshooting',
        }),
        socialLinks: [{ icon: 'github', link: `https://github.com/${repository}` }],
        editLink: {
          pattern: `https://github.com/${repository}/edit/main/docs/:path`,
          text: 'Edit this page on GitHub',
        },
        search: {
          provider: 'local',
        },
        footer: {
          message: 'Built with VitePress and published from /docs.',
          copyright: 'Copyright © InfoDigest contributors',
        },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'InfoDigest 文档',
      description: 'InfoDigest 产品文档，帮助你收集信息、理解内容，并在之后高效回看。',
      themeConfig: {
        nav: createNav('/zh', {
          gettingStarted: '开始使用',
          workflows: '工作流',
          platforms: '平台',
          reference: '参考',
        }),
        sidebar: createSidebar('/zh', {
          gettingStarted: '开始使用',
          overview: '概览',
          firstWorkflow: '首次工作流',
          workflows: '工作流',
          collectContent: '收集内容',
          readAndReview: '阅读与复习',
          knowledgeGraph: '知识图谱',
          platforms: '平台',
          webApp: 'Web 应用',
          browserExtension: '浏览器扩展',
          mobileShortcut: '移动端快捷指令',
          reference: '参考',
          concepts: '概念',
          troubleshooting: '故障排查',
        }),
        socialLinks: [{ icon: 'github', link: `https://github.com/${repository}` }],
        editLink: {
          pattern: `https://github.com/${repository}/edit/main/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        search: {
          provider: 'local',
        },
        footer: {
          message: '使用 VitePress 构建，并从 /docs 发布。',
          copyright: 'Copyright © InfoDigest contributors',
        },
      },
    },
  },
});

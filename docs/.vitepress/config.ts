import { defineConfig } from 'vitepress';

const repository = 'Naeemo/distilling';
const repositoryName = repository.split('/')[1];
const base =
  process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}/` : '/';

export default defineConfig({
  title: 'InfoDigest Docs',
  description:
    'Product documentation for collecting, understanding, and revisiting information with InfoDigest.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Get Started', link: '/getting-started/overview' },
      { text: 'Workflows', link: '/workflows/collect-content' },
      { text: 'Platforms', link: '/platforms/web-app' },
      { text: 'Reference', link: '/reference/concepts' },
      { text: 'GitHub', link: `https://github.com/${repository}` },
    ],
    sidebar: {
      '/getting-started/': [
        {
          text: 'Get Started',
          items: [
            { text: 'Overview', link: '/getting-started/overview' },
            { text: 'First Workflow', link: '/getting-started/first-workflow' },
          ],
        },
      ],
      '/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Collect Content', link: '/workflows/collect-content' },
            { text: 'Read and Review', link: '/workflows/read-and-review' },
            { text: 'Knowledge Graph', link: '/workflows/knowledge-graph' },
          ],
        },
      ],
      '/platforms/': [
        {
          text: 'Platforms',
          items: [
            { text: 'Web App', link: '/platforms/web-app' },
            { text: 'Browser Extension', link: '/platforms/browser-extension' },
            { text: 'Mobile Shortcut', link: '/platforms/mobile-shortcut' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Concepts', link: '/reference/concepts' },
            { text: 'Troubleshooting', link: '/reference/troubleshooting' },
          ],
        },
      ],
    },
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
});

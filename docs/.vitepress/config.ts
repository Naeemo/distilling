import { defineConfig } from 'vitepress';

const repository = 'Naeemo/distilling';
const repositoryName = repository.split('/')[1];
const base =
  process.env.GITHUB_ACTIONS === 'true' ? `/${repositoryName}/` : '/';

export default defineConfig({
  title: 'InfoDigest Docs',
  description:
    'Contribution, architecture, and operations guide for the InfoDigest monorepo.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Operations', link: '/operations/deployment' },
      { text: 'Reference', link: '/reference/domain-model' },
      { text: 'GitHub', link: `https://github.com/${repository}` },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Development', link: '/guide/development' },
            { text: 'Contributing', link: '/guide/contributing' },
            { text: 'Agent Guide', link: '/guide/agent-guide' },
          ],
        },
      ],
      '/operations/': [
        {
          text: 'Operations',
          items: [
            { text: 'Deployment', link: '/operations/deployment' },
            { text: 'Release Process', link: '/operations/release' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Domain Model', link: '/reference/domain-model' },
            { text: 'Content Ingestion', link: '/reference/content-ingestion' },
            { text: 'Knowledge Graph', link: '/reference/knowledge-graph' },
            {
              text: 'Intelligence Pipeline',
              link: '/reference/intelligence-pipeline',
            },
            {
              text: 'Mobile and Extension',
              link: '/reference/mobile-and-extension',
            },
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

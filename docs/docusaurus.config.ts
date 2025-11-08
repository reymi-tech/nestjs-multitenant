import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'NestJS MultiTenant',
  tagline:
    'Complete multi-tenant solution for NestJS with PostgreSQL schema-per-tenant architecture',
  favicon: 'img/favicon.ico',

  // Future flags
  future: {
    v4: true,
  },

  // Production URL
  url: 'https://reymi-tech.github.io',
  baseUrl: '/nestjs-multitenant/',

  // GitHub pages deployment config
  organizationName: 'reymi-tech',
  projectName: 'nestjs-multitenant',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/reymi-tech/nestjs-multitenant/tree/master/docs/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/reymi-tech/nestjs-multitenant/tree/master/docs/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'NestJS MultiTenant',
      logo: {
        alt: 'NestJS MultiTenant Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/nestjs-multitenant',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/reymi-tech/nestjs-multitenant',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Core Concepts',
              to: '/docs/core-concepts/architecture',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference/modules',
            },
            {
              label: 'Examples',
              to: '/docs/examples/basic-setup',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/nestjs-multitenant',
            },
            {
              label: 'GitHub Repository',
              href: 'https://github.com/reymi-tech/nestjs-multitenant',
            },
            {
              label: 'Report Issues',
              href: 'https://github.com/reymi-tech/nestjs-multitenant/issues',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/nestjs-multitenant',
            },
            {
              label: 'NestJS Docs',
              href: 'https://docs.nestjs.com',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Changelog',
              to: '/docs/changelog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Reymi Tech. Licensed under MIT. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'javascript', 'json', 'sql'],
    },
    algolia: {
      // Placeholder for Algolia DocSearch
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_API_KEY',
      indexName: 'nestjs-multitenant',
      contextualSearch: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

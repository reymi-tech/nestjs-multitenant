import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/setup-postgres',
        'guides/tenant-resolution',
        'guides/migrations',
        'guides/testing',
        'guides/exception-handling',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'core-concepts/architecture',
        'core-concepts/orm-comparison',
        'core-concepts/tenant-context',
        'core-concepts/connection-pooling',
        'core-concepts/entity-registry',
        'core-concepts/validation-strategies',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: false,
      items: [
        'examples/basic-setup',
        'examples/with-authentication',
        'examples/custom-tenant-resolution',
        'examples/admin-api',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      collapsed: false,
      items: [
        'advanced/performance',
        'advanced/security',
        'advanced/monitoring',
        'advanced/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Migration Guides',
      items: [
        'migration-guides/from-database-per-tenant',
        'migration-guides/from-typeorm-to-drizzle',
        'migration-guides/upgrading',
      ],
    },
    'changelog',
  ],

  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api-reference/modules',
        'api-reference/services',
        'api-reference/decorators',
        'api-reference/interfaces',
      ],
    },
  ],
};

export default sidebars;

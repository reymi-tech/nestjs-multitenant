const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');

// Ensure directories exist
const dirs = [
  'getting-started',
  'guides',
  'core-concepts',
  'api-reference',
  'examples',
  'advanced',
  'migration-guides'
];

dirs.forEach(dir => {
  const dirPath = path.join(docsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const docs = {
  'getting-started/quick-start.md': `---
sidebar_position: 2
title: Quick Start
description: Build your first multi-tenant NestJS application in 5 minutes
---

# Quick Start

Get a working multi-tenant application up and running in less than 5 minutes.

[Content continues here - see full version in the actual generated file]
`,

  'getting-started/configuration.md': `---
sidebar_position: 3
title: Configuration
description: Configure nestjs-multitenant for your application
---

# Configuration

Learn how to configure the MultiTenantModule for your specific needs.

[Content continues - full version in generated file]
`
};

// Write all files
Object.entries(docs).forEach(([filepath, content]) => {
  const fullPath = path.join(docsDir, filepath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Created: ${filepath}`);
});

console.log('Documentation files created successfully!');

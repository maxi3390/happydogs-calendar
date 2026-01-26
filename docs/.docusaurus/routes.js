import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', '94e'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'c28'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'c55'),
            routes: [
              {
                path: '/docs/architecture',
                component: ComponentCreator('/docs/architecture', '52f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/backend/intro',
                component: ComponentCreator('/docs/backend/intro', 'c5b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/deployment',
                component: ComponentCreator('/docs/deployment', '9a4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/frontend/intro',
                component: ComponentCreator('/docs/frontend/intro', 'e1b'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/overview',
                component: ComponentCreator('/docs/overview', 'bdc'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];

const {themes: prismThemes} = require('prism-react-renderer');

export default {
  title: 'Happy Calendar Documentation',
  tagline: 'Comprehensive documentation for the Happy Calendar project',
  favicon: 'img/logo.svg',

  // Set the production url of your site here
  url: 'https://happy-calendar-docs.example.com',
  // The pathname under which the site is served. Read from
  // ``DOCS_BASE_URL`` so the same image can be deployed at the root
  // (``/``) for direct port-forward access (the historical
  // ``http://localhost:3001/`` workflow) or behind a sub-path
  // (``/docs/``) when Traefik proxies it under the main domain
  // (``https://${DOMAIN}/docs/``). Docusaurus needs this value at
  // BUILD TIME — it bakes it into every absolute asset URL — so the
  // env var has to be set before ``npm run build`` runs in the
  // container's CMD. Trailing slash is required by Docusaurus.
  baseUrl: process.env.DOCS_BASE_URL || '/',

  // GitHub pages deployment config.
  organizationName: 'maximiliano', // Adjust as needed
  projectName: 'happy-calendar',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/maximiliano/happy-calendar/edit/main/docs/',
        },
        // Blog disabled: there's no `blog/` content directory, so leaving
        // the default config wired up generates empty / 404 routes.
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Happy Calendar Docs',
        logo: {
          alt: 'Happy Calendar Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/maximiliano/happy-calendar',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Project',
            items: [
              {
                label: 'Overview',
                to: '/docs/overview',
              },
              {
                label: 'Architecture',
                to: '/docs/architecture',
              },
            ],
          },
          {
            title: 'Components',
            items: [
              {
                label: 'Backend',
                to: '/docs/backend/intro',
              },
              {
                label: 'Frontend',
                to: '/docs/frontend/intro',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/maximiliano/happy-calendar',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Happy Calendar Project. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

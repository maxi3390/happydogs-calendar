const {themes: prismThemes} = require('prism-react-renderer');

export default {
  title: 'Happy Calendar Documentation',
  tagline: 'Comprehensive documentation for the Happy Calendar project',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://happy-calendar-docs.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'maximiliano', // Adjust as needed
  projectName: 'happy-calendar',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: [],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/maximiliano/happy-calendar/edit/main/docs/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/maximiliano/happy-calendar/edit/main/docs/blog/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/happy-calendar-social-card.jpg',
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

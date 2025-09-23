export default () => ({
  // Плагин интернационализации
  i18n: {
    enabled: true,
    config: {
      // Языки по умолчанию
      locales: ['en', 'ru'],
      // Язык по умолчанию
      defaultLocale: 'ru',
      // Показывать локаль в URL
      displayLocaleInUrl: true,
    },
  },
  
  // SEO плагин
  seo: {
    enabled: true,
  },
});

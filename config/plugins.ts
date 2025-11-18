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
  
  upload: {
    config: {
      breakpoints: {
        large: 560, // ≈ 560 × 267
        medium: 320, // ≈ 280 × 134
        small: 280,  // ≈ 280 × 134
      },
    },
  },
  // SEO плагин
  seo: {
    enabled: true,
  },
});

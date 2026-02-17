module.exports = [
  'strapi::errors',
  {
    name: 'strapi::session',
    config: {
      cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      }
    }
  },
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'https://test11.audiosector.ru',
        'http://test11.audiosector.ru'
      ],
      headers: '*',
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::favicon',
  'strapi::public',
];

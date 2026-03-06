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
        'http://test11.audiosector.ru',
        'https://www.test11.audiosector.ru',
        'http://www.test11.audiosector.ru',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
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

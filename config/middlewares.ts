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
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::favicon',
  'strapi::public',
];

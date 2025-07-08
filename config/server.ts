export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('APP_URL', 'https://test11.audiosector.ru/'),
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
});

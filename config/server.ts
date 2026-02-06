export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('APP_URL', 'https://test11.audiosector.ru/cp/'),
  // Обязательно для корректной авторизации админки за reverse proxy (сессия/куки)
  proxy: { koa: true },
  app: {
    keys: env.array('APP_KEYS'),
  },
});

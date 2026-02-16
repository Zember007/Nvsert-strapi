export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Обязательно для корректной авторизации админки за reverse proxy (сессия/куки)
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
});

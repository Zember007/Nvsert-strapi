export default ({ env }) => {
  const host = env('HOST', '0.0.0.0');
  const port = env.int('PORT', 1337);
  const urlHost = host === '0.0.0.0' ? 'localhost' : host;

  return {
    host,
    port,
    // Публичный URL Strapi (APP_URL), как в браузере; без слэша в конце. Обязателен за reverse proxy.
    url: env('APP_URL', `http://${urlHost}:${port}`),
    // Strapi 5: доверие к X-Forwarded-* задаётся только через proxy.koa (булево proxy: true не работает).
    proxy: {
      koa: env.bool('STRAPI_PROXY_KOA', true),
    },
    app: {
      keys: env.array('APP_KEYS'),
    },
  };
};

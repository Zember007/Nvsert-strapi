export default ({ env }) => ({
  host: '0.0.0.0',
  port: 1337,
  url: 'https://test11-admin.audiosector.ru',
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
});

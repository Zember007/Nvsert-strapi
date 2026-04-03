// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const env = strapi.config.get('environment');

    // Фикс авторизации админки за reverse proxy (HTTPS → HTTP к Strapi):
    // библиотека куки смотрит на socket.encrypted; без этого Secure-куки не ставятся.
    strapi.server.use(async (ctx, next) => {
      const raw = ctx.get('x-forwarded-proto');
      const proto = raw.split(',')[0]?.trim().toLowerCase();
      if (ctx.req?.socket && proto === 'https') {
        (ctx.req.socket as any).encrypted = true;
      }
      await next();
    });

    // Временный обход: админка шлёт Bearer (JWT админа) на /uploads и /api/upload/*.
    // Users-Permissions проверяет заголовок своим JWT_SECRET → ложный пользователь и Forbidden.
    // Правильное решение — разные JWT_SECRET и ADMIN_JWT_SECRET в .env.
    const relaxUploadAuth =
      env === 'development' || process.env.STRAPI_RELAX_UPLOAD_AUTH === 'true';

    if (relaxUploadAuth) {
      strapi.server.use(async (ctx, next) => {
        if (ctx.method === 'GET') {
          const p = ctx.path || '';
          if (p.startsWith('/uploads') || p.startsWith('/api/upload')) {
            delete ctx.request.headers.authorization;
          }
        }
        await next();
      });
      strapi.log.warn(
        '[STRAPI_RELAX_UPLOAD_AUTH] Bearer снят для GET /uploads и /api/upload — только для отладки. Разведите JWT_SECRET и ADMIN_JWT_SECRET и выключите флаг.'
      );
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    const adminSecret = strapi.config.get('admin.auth.secret') as string | undefined;
    const upSecret = strapi.config.get('plugin::users-permissions.jwtSecret') as string | undefined;

    if (
      adminSecret &&
      upSecret &&
      adminSecret === upSecret &&
      adminSecret !== 'tobemodified'
    ) {
      strapi.log.warn(
        '[security] JWT_SECRET и ADMIN_JWT_SECRET совпадают. Users-Permissions принимает JWT админки → Forbidden на медиа/API. Сгенерируйте два разных секрета, обновите .env и перезапустите.'
      );
    }
  },
};

// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Фикс авторизации админки за reverse proxy (HTTPS → HTTP к Strapi):
    // библиотека куки смотрит на socket.encrypted; без этого Secure-куки не ставятся.
    strapi.server.use(async (ctx, next) => {
      const proto = ctx.get('x-forwarded-proto');
      if (ctx.req?.socket && proto === 'https') {
        (ctx.req.socket as any).encrypted = true;
      }
      await next();
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};

/**
 *  okpd2 controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::okpd2.okpd2' as any, ({ strapi }) => ({
  async findWithPage(ctx) {
    // Keep existing OKPD2 response intact, just add `page` alongside it.
    const okpd2Response = await super.find(ctx);

    const locale = (ctx.query as any)?.locale;

    const page = await strapi.db.query('api::okpd2-page.okpd2-page').findOne({
      where: locale ? { locale } : {},
      populate: {
        content: {
          populate: {
            image: true,
          },
        },
        cta: true,
        seo: true,
      },
    });

    return {
      ...(okpd2Response as any),
      page,
    };
  },
}));



/**
 * okpd2-page controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::okpd2-page.okpd2-page', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        content: {
          populate: {
            image: true,
          },
        },
        cta: true,
        seo: true,
      },
    };

    return await super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        content: {
          populate: {
            image: true,
          },
        },
        cta: true,
        seo: true,
      },
    };

    return await super.findOne(ctx);
  },
}));



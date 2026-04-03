/**
 * privacy-policy controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::privacy-policy.privacy-policy', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        content: {
          populate: {
            image: true
          }
        },
        seo: true
      }
    };
    return await super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        content: {
          populate: {
            image: true
          }
        },
        seo: true
      }
    };
    return await super.findOne(ctx);
  }
}));

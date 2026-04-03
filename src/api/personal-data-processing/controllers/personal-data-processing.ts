/**
 * personal-data-processing controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::personal-data-processing.personal-data-processing', ({ strapi }) => ({
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

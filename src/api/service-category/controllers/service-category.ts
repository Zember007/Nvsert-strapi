/**
 * service-category controller
 */

import { factories } from '@strapi/strapi';


export default factories.createCoreController('api::service-category.service-category', ({ strapi }) => ({
    async find(ctx) {
      ctx.query = {
        ...ctx.query,
        sort: ['order:asc']
      };
      return await super.find(ctx);
    }
  }));



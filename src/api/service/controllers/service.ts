/**
 * service controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::service.service', ({ strapi }) => ({
    async find(ctx) {
      ctx.query = {
        ...ctx.query,
        sort: ['order:asc']
      };
      return await super.find(ctx);
    }
  }));

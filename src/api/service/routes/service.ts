/**
 * service router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::service.service');

export default {
  routes: [
    {
      method: 'GET',
      path: '/services/slug/:slug',
      handler: 'service.findBySlug',
      config: {
        auth: false,
      },
    },
    ...(typeof defaultRouter.routes === 'function' ? defaultRouter.routes() : defaultRouter.routes),
  ],
};



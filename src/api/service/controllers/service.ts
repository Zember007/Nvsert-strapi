/**
 * service controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::service.service', ({ strapi }) => ({
    async find(ctx) {
      ctx.query = {
        ...ctx.query,
        sort: ['order:asc'],
        populate: {
          category: true,
          img: true,
          documents: true,
          content: {
            populate: {
              image: true
            }
          },
          cta: true,
          seo: true
        }
      };
      return await super.find(ctx);
    },
    
    async findOne(ctx) {
      ctx.query = {
        ...ctx.query,
        populate: {
          category: true,
          img: true,
          documents: true,
          content: {
            populate: {
              image: true
            }
          },
          cta: true,
          seo: true
        }
      };
      return await super.findOne(ctx);
    },

    async findBySlug(ctx) {
      const { slug } = ctx.params;
      
      const entity = await strapi.entityService.findMany('api::service.service', {
        filters: { slug },
        populate: {
          category: true,
          img: true,
          documents: true,
          content: {
            populate: {
              image: true
            }
          },
          cta: true,
          seo: true
        }
      });

      if (!entity || entity.length === 0) {
        return ctx.notFound('Service not found');
      }

      return { data: entity[0] };
    }
  }));

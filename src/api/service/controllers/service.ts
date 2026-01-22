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
      const requestedLocale = String((ctx.query as any)?.locale || '').trim() || null;

      const candidates = [
        requestedLocale,
        'ru',
        'en',
      ].filter(Boolean) as string[];

      const uniqueLocales = [...new Set(candidates)];
      const whereBase: any = { slug };
  
      let entity: any = null;
      for (const locale of uniqueLocales) {
        entity = await strapi.db.query('api::service.service').findOne({
          where: { ...whereBase, locale, publishedAt: { $notNull: true } },
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
          },
        });
        if (entity) break;
      }
  
      if (!entity) {
        return ctx.notFound('Service not found');
      }
  
      return entity;
    }
  }));

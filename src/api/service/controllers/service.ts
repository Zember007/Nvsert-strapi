/**
 * service controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::service.service', ({ strapi }) => ({
    async find(ctx) {
      const { query } = ctx;
      
      // Преобразуем сортировку из формата Strapi ['order:asc'] в { order: 'asc' }
      let orderBy: { order: string } | Record<string, string> = { order: 'asc' };
      if (query.sort && Array.isArray(query.sort) && query.sort.length > 0) {
        const sortItem = query.sort[0];
        if (typeof sortItem === 'string') {
          const [field, direction] = sortItem.split(':');
          orderBy = { [field]: direction || 'asc' } as Record<string, string>;
        }
      } else if (query.sort && typeof query.sort === 'object' && !Array.isArray(query.sort)) {
        orderBy = query.sort as Record<string, string>;
      }

      // Обрабатываем пагинацию
      const pagination = query.pagination as { pageSize?: number; limit?: number; page?: number; start?: number } | undefined;
      const pageSize = pagination?.pageSize || pagination?.limit || 25;
      const page = pagination?.page || 1;
      const start = pagination?.start || (page - 1) * pageSize;
      
      const entities = await strapi.db.query('api::service.service').findMany({
        where: (query.filters as object) || {},
        orderBy: orderBy as { order: string },
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
        limit: pageSize,
        offset: start,
      });

      const total = await strapi.db.query('api::service.service').count({
        where: (query.filters as object) || {},
      });

      return {
        data: entities,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total,
          },
        },
      };
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
  
      const entity = await strapi.db.query('api::service.service').findOne({
        where: { slug },
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
  
      if (!entity) {
        return ctx.notFound('Service not found');
      }
  
      return entity;
    }
  }));

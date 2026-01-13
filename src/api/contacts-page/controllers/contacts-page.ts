/**
 * contacts-page controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::contacts-page.contacts-page', () => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        offices: {
          populate: {
            image: true,
            phones: true
          }
        },
        connectSection: {
          populate: {
            consultationImage: true,
            featureCards: true
          }
        },
        requisitesSection: {
          populate: {
            image: true,
            legal: true
          }
        },
        seo: {
          populate: {
            shareImage: true
          }
        }
      }
    };
    return await super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: {
        offices: {
          populate: {
            image: true,
            phones: true
          }
        },
        connectSection: {
          populate: {
            consultationImage: true,
            featureCards: true
          }
        },
        requisitesSection: {
          populate: {
            image: true,
            legal: true
          }
        },
        seo: {
          populate: {
            shareImage: true
          }
        }
      }
    };
    return await super.findOne(ctx);
  }
}));


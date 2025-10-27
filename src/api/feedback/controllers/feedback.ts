/**
 * feedback controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::feedback.feedback', ({ strapi }) => ({
    async find(ctx) {
        ctx.query = {
            ...ctx.query,
            sort: ['order:asc'],
            populate: ['*'],
            pagination: {
                page: 1,
                pageSize: 1000
            },
        };
        return await super.find(ctx);
    }
}));

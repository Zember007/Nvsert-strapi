/**
 *  okpd2 controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::okpd2.okpd2' as any, ({ strapi }) => ({
  async findWithPage(ctx) {
    // Custom: return only roots (all sections) + subtree for 01 on first load,
    // and attach `page` alongside it (same contract as before: { data, meta, page }).
    const locale = (ctx.query as any)?.locale;

    const [roots, subtree01, page] = await Promise.all([
      strapi.db.query('api::okpd2.okpd2').findMany({
        where: { level: 1 },
        orderBy: { code: 'asc' },
      }),
      strapi.db.query('api::okpd2.okpd2').findMany({
        // Strapi query engine supports `$startsWith` for string fields.
        where: { code: { $startsWith: '01' } },
        orderBy: { code: 'asc' },
      }),
      strapi.db.query('api::okpd2-page.okpd2-page').findOne({
        where: locale ? { locale } : {},
        populate: {
          content: {
            populate: {
              image: true,
            },
          },
          cta: true,
          seo: true,
        },
      }),
    ]);

    const byCode = new Map<string, any>();
    for (const it of [...(roots || []), ...(subtree01 || [])]) {
      const code = (it?.code ?? '').trim();
      if (!code) continue;
      if (!byCode.has(code)) byCode.set(code, it);
    }

    const data = [...byCode.values()];
    return {
      data,
      meta: {
        pagination: {
          page: 1,
          pageSize: data.length,
          pageCount: 1,
          total: data.length,
        },
      },
      page,
    };
  },

  async findSection(ctx) {
    const sectionRaw = String((ctx.params as any)?.section ?? '').trim();
    if (!/^\d{2}$/.test(sectionRaw)) {
      return ctx.badRequest('Invalid section. Expected two digits, e.g. 01, 02.');
    }

    const data = await strapi.db.query('api::okpd2.okpd2').findMany({
      where: { code: { $startsWith: sectionRaw } },
      orderBy: { code: 'asc' },
    });

    return {
      data,
      meta: {
        pagination: {
          page: 1,
          pageSize: data.length,
          pageCount: 1,
          total: data.length,
        },
      },
    };
  },
}));



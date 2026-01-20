/**
 * tnved controller
 */

import { factories } from '@strapi/strapi';

function normalizeDigits(raw: any): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function safeInt(raw: any, fallback: number) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export default factories.createCoreController('api::tnved.tnved' as any, ({ strapi }) => ({
  async findWithPage(ctx) {
    const locale = (ctx.query as any)?.locale;

    const [chapters, subtree01, page] = await Promise.all([
      strapi.db.query('api::tnved.tnved').findMany({
        where: {
          level: 2,
          codeNorm: { $notNull: true },
        },
        orderBy: { codeNorm: 'asc' },
      }),
      strapi.db.query('api::tnved.tnved').findMany({
        where: { chapter: '01' },
        orderBy: { path: 'asc' },
      }),
      strapi.db.query('api::tnved-page.tnved-page').findOne({
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

    const data = [...(chapters || []), ...(subtree01 || [])];

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

  async findChapter(ctx) {
    const sectionParam = (ctx.params as any)?.chapter ?? (ctx.params as any)?.section;
    const chapterRaw = String(sectionParam ?? '').trim();
    if (!/^\d{2}$/.test(chapterRaw)) {
      return ctx.badRequest('Invalid chapter. Expected two digits, e.g. 01, 02.');
    }

    const data = await strapi.db.query('api::tnved.tnved').findMany({
      where: { chapter: chapterRaw },
      orderBy: { path: 'asc' },
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

  async findByCode(ctx) {
    const code = normalizeDigits((ctx.params as any)?.code);
    if (!code) return ctx.badRequest('Invalid code.');

    const root = await strapi.db.query('api::tnved.tnved').findOne({
      where: { codeNorm: code },
    });
    if (!root) return ctx.notFound('Not found.');

    const data = await strapi.db.query('api::tnved.tnved').findMany({
      where: { path: { $startsWith: String(root.path) } },
      orderBy: { path: 'asc' },
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
      root,
    };
  },

  async search(ctx) {
    const qRaw = String(((ctx.query as any)?.q ?? (ctx.query as any)?.query ?? '')).trim();

    strapi?.log?.debug?.(`[TNVED Search] Query: ${qRaw}`);

    if (!qRaw) {
      return {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 0, pageCount: 1, total: 0 },
        },
      };
    }

    const limit = Math.min(Math.max(safeInt((ctx.query as any)?.limit, 50), 1), 500);
    const codeQ = normalizeDigits(qRaw);

    strapi?.log?.debug?.(`[TNVED Search] Normalized code: ${codeQ}`);

    const or: any[] = [];

    // Поиск по названию
    or.push({ name: { $containsi: qRaw } });

    // Поиск по коду (важно: в проде codeNorm может быть пустым/неполным, а code часто содержит точки)
    // Поэтому добавляем code-поиск всегда (и для "01", и для "01.01").
    or.push({ code: { $containsi: qRaw } });
    // Для числовых запросов полезен и поиск по "очищенному" коду в строке с точками.
    if (codeQ && codeQ !== qRaw) {
      or.push({ code: { $containsi: codeQ } });
    }

    // Поиск по нормализованному коду (только цифры)
    if (codeQ && codeQ.length > 0) {
      or.push({ codeNorm: { $startsWith: codeQ } });
      // Также ищем вхождение в середине кода
      if (codeQ.length >= 2) {
        or.push({ codeNorm: { $containsi: codeQ } });
      }
    }

    strapi?.log?.debug?.(`[TNVED Search] Search conditions: ${JSON.stringify(or)}`);

    // Если нет условий поиска, возвращаем пустой результат
    if (or.length === 0) {
      strapi?.log?.debug?.('[TNVED Search] No search conditions, returning empty result');
      return {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 0, pageCount: 1, total: 0 },
        },
      };
    }

    const data = await strapi.db.query('api::tnved.tnved').findMany({
      where: { $or: or },
      limit,
      orderBy: { codeNorm: 'asc' },
    });

    strapi?.log?.debug?.(`[TNVED Search] Found results: ${data.length}`);

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

 
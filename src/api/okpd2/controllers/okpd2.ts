/**
 *  okpd2 controller
 */

import { factories } from '@strapi/strapi';

function normalizeDigits(raw: any): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function safeInt(raw: any, fallback: number) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

// "011111" -> "01.11.11", "011" -> "01.1"
function digitsToOkpdDotted(digits: string): string {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 2) return d;
  const head = d.slice(0, 2);
  const rest = d.slice(2);
  const parts: string[] = [];
  for (let i = 0; i < rest.length; i += 2) {
    parts.push(rest.slice(i, i + 2));
  }
  return [head, ...parts].join('.');
}

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

  async search(ctx) {
    const qRaw = String(((ctx.query as any)?.q ?? (ctx.query as any)?.query ?? '')).trim();

    strapi?.log?.debug?.(`[OKPD2 Search] Query: ${qRaw}`);

    if (!qRaw) {
      return {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 0, pageCount: 1, total: 0 },
        },
      };
    }

    const limit = Math.min(Math.max(safeInt((ctx.query as any)?.limit, 50), 1), 500);
    const digitsQ = normalizeDigits(qRaw);
    const dottedQ = digitsQ ? digitsToOkpdDotted(digitsQ) : '';

    strapi?.log?.debug?.(`[OKPD2 Search] Digits: ${digitsQ} Dotted: ${dottedQ}`);

    const or: any[] = [];

    // Поиск по названию и "как есть" по коду (с точками)
    or.push({ name: { $containsi: qRaw } });
    or.push({ code: { $containsi: qRaw } });

    // Если запрос похож на код (цифры/точки/пробелы) — дополнительно ищем по "дотнутой" версии
    if (digitsQ) {
      if (dottedQ && dottedQ !== qRaw) {
        or.push({ code: { $startsWith: dottedQ } });
        // contains полезен для случаев, когда пользователь вводит середину кода
        if (dottedQ.length >= 2) or.push({ code: { $containsi: dottedQ } });
      }

      // Частый кейс: пользователь вводит только первые 2 цифры (раздел)
      if (digitsQ.length >= 2) {
        const section2 = digitsQ.slice(0, 2);
        or.push({ code: { $startsWith: section2 } });
      }
    }

    strapi?.log?.debug?.(`[OKPD2 Search] Search conditions: ${JSON.stringify(or)}`);

    if (or.length === 0) {
      return {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 0, pageCount: 1, total: 0 },
        },
      };
    }

    const data = await strapi.db.query('api::okpd2.okpd2').findMany({
      where: { $or: or },
      limit,
      orderBy: { code: 'asc' },
    });

    strapi?.log?.debug?.(`[OKPD2 Search] Found results: ${data.length}`);

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



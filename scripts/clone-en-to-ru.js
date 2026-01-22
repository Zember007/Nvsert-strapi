'use strict';

/**
 * Clone all existing localized entries from `en` into `ru` (as a localization),
 * without translating the content. Keeps `en` as-is.
 *
 * Usage:
 *   node ./scripts/clone-en-to-ru.js --dry
 *   node ./scripts/clone-en-to-ru.js --run
 *   node ./scripts/clone-en-to-ru.js --run --no-include-plugins
 *   node ./scripts/clone-en-to-ru.js --run --depth 6
 *
 * Notes:
 * - Requires Strapi app context (same approach as other scripts in this repo).
 * - Designed for Strapi v5 style entityService usage.
 */

const SOURCE_LOCALE = 'en';
const TARGET_LOCALE = 'ru';

function parseArgs(argv) {
  const out = { dry: false, run: false, limit: 100, start: 0, strategy: 'move', includePlugins: true, depth: 6 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') out.dry = true;
    if (a === '--run') out.run = true;
    if (a === '--clone') out.strategy = 'clone';
    if (a === '--move') out.strategy = 'move';
    if (a === '--include-plugins') out.includePlugins = true;
    if (a === '--no-include-plugins') out.includePlugins = false;
    if (a === '--limit') out.limit = Number(argv[++i] || out.limit);
    if (a === '--start') out.start = Number(argv[++i] || out.start);
    if (a === '--depth') out.depth = Number(argv[++i] || out.depth);
  }
  if (!out.dry && !out.run) out.dry = true; // safe default
  return out;
}

function stripSystemFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
    // publishedAt is controlled at the top-level only
    if (k === 'publishedAt') continue;
    clone[k] = stripSystemFields(v);
  }
  return clone;
}

function buildPopulateFromAttributes(getComponentAttributes, attrs, depth) {
  if (!attrs || depth <= 0) return '*';
  const populate = {};

  for (const [name, def] of Object.entries(attrs)) {
    if (!def || typeof def !== 'object') continue;

    if (def.type === 'relation' || def.type === 'media') {
      populate[name] = true;
      continue;
    }

    if (def.type === 'component') {
      const compUid = def.component;
      const compAttrs = getComponentAttributes(compUid);
      const nested = buildPopulateFromAttributes(getComponentAttributes, compAttrs, depth - 1);
      // Strapi expects nested populate to be '*' (string) or an object/array; boolean is not accepted.
      const nestedPopulate =
        typeof nested === 'object' && nested && !Object.keys(nested).length ? '*' : nested;
      populate[name] = { populate: nestedPopulate };
      continue;
    }

    if (def.type === 'dynamiczone') {
      // Polymorphic: Strapi requires '*' here.
      populate[name] = { populate: '*' };
      continue;
    }
  }

  return populate;
}

function normalizeRelationsAndMedia(uid, entry, contentType) {
  const attrs = contentType?.attributes || {};
  const out = { ...entry };

  for (const [name, def] of Object.entries(attrs)) {
    if (!def || typeof def !== 'object') continue;
    const val = out[name];
    if (val == null) continue;

    if (def.type === 'media') {
      if (Array.isArray(val)) out[name] = val.map(x => (x && typeof x === 'object' ? x.id : x)).filter(Boolean);
      else out[name] = typeof val === 'object' ? val.id : val;
      continue;
    }

    if (def.type === 'relation') {
      if (Array.isArray(val)) out[name] = val.map(x => (x && typeof x === 'object' ? x.id : x)).filter(Boolean);
      else out[name] = typeof val === 'object' ? val.id : val;
      continue;
    }
  }

  return out;
}

function getUidFieldNames(contentType) {
  const attrs = contentType?.attributes || {};
  return Object.entries(attrs)
    .filter(([, def]) => def && typeof def === 'object' && def.type === 'uid')
    .map(([name]) => name);
}

function ensureSuffix(value, suffix) {
  if (typeof value !== 'string' || !value) return value;
  if (value.endsWith(suffix)) return value;
  return `${value}${suffix}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const contentTypes = Object.entries(strapi.contentTypes || {})
      .filter(([uid, ct]) => {
        const isApi = uid.startsWith('api::');
        const isPlugin = uid.startsWith('plugin::');
        const typeAllowed = isApi || (args.includePlugins && isPlugin);
        return typeAllowed && ct?.pluginOptions?.i18n?.localized;
      })
      .map(([uid, ct]) => ({ uid, ct }));

    console.log(`[i18n] localized types (api +${args.includePlugins ? ' plugin' : ' no-plugin'}): ${contentTypes.length}`);
    for (const { uid } of contentTypes) console.log(`  - ${uid}`);

    let totalToCreate = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const { uid, ct } of contentTypes) {
      const kind = ct.kind;
      const uidFields = getUidFieldNames(ct);

      const getComponentAttributes = (componentUid) => {
        const comp = strapi.components?.[componentUid];
        return comp?.attributes || null;
      };

      const depth = Number.isFinite(args.depth) && args.depth > 0 ? args.depth : 6;
      const populate = buildPopulateFromAttributes(getComponentAttributes, ct.attributes, depth);
      const populateWithLoc = { ...(populate || {}), localizations: true };

      console.log(`\n[${uid}] kind=${kind}`);

      if (kind === 'singleType') {
        const existingTargetArr = await strapi.entityService.findMany(uid, {
          filters: { locale: TARGET_LOCALE },
          limit: 1,
        });
        const existingTarget = Array.isArray(existingTargetArr) ? existingTargetArr[0] : null;
        if (existingTarget) {
          console.log(`  -> ru exists, skip`);
          totalSkipped++;
          continue;
        }

        const sourceArr = await strapi.entityService.findMany(uid, {
          filters: { locale: SOURCE_LOCALE },
          populate: populateWithLoc,
          limit: 1,
        });
        const source = Array.isArray(sourceArr) ? sourceArr[0] : null;

        if (!source) {
          console.log(`  -> no en entry, skip`);
          totalSkipped++;
          continue;
        }

        totalToCreate++;
        const publishedAt = source.publishedAt ? new Date() : null;

        if (args.dry) {
          console.log(`  -> would ${args.strategy} en->ru (singleType) (from en id=${source.id})`);
          continue;
        }

        const base = normalizeRelationsAndMedia(uid, stripSystemFields(source), ct);
        if (args.strategy === 'clone') {
          const data = {
            ...base,
            documentId: String(source.documentId),
            ...(publishedAt ? { publishedAt } : {}),
          };
          const created = await strapi.entityService.create(uid, { data, locale: TARGET_LOCALE });
          totalCreated++;
          console.log(`  -> created ru id=${created?.id}`);
        } else {
          // move: flip existing en entry to ru, then create a new en localization with uid suffix
          await strapi.db.query(uid).update({
            where: { id: source.id },
            data: { locale: TARGET_LOCALE },
          });

          const enData = {
            ...base,
            documentId: String(source.documentId),
            ...(publishedAt ? { publishedAt } : {}),
          };
          for (const f of uidFields) enData[f] = ensureSuffix(enData[f], '-en');

          await strapi.entityService.create(uid, { data: enData, locale: SOURCE_LOCALE });
          totalCreated++;
          console.log(`  -> moved en->ru and created en localization (singleType)`);
        }
        continue;
      }

      // collectionType
      let start = args.start;
      const limit = Number.isFinite(args.limit) && args.limit > 0 ? args.limit : 100;
      // paginate until empty
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await strapi.entityService.findMany(uid, {
          filters: { locale: SOURCE_LOCALE },
          populate: populateWithLoc,
          start,
          limit,
        });

        const items = Array.isArray(batch) ? batch : [];
        if (!items.length) break;

        console.log(`  -> fetched ${items.length} en entries (start=${start})`);

        for (const source of items) {
          const locs = Array.isArray(source.localizations) ? source.localizations : [];
          const hasRu = locs.some((l) => l && typeof l === 'object' && l.locale === TARGET_LOCALE);
          if (hasRu) {
            totalSkipped++;
            continue;
          }

          totalToCreate++;
          const publishedAt = source.publishedAt ? new Date() : null;

          if (args.dry) continue;

          const base = normalizeRelationsAndMedia(uid, stripSystemFields(source), ct);
          if (args.strategy === 'clone') {
            const data = {
              ...base,
              documentId: String(source.documentId),
              ...(publishedAt ? { publishedAt } : {}),
            };
            await strapi.entityService.create(uid, { data, locale: TARGET_LOCALE });
            totalCreated++;
          } else {
            // move: flip existing en entry to ru, then create a new en localization with uid suffix
            await strapi.db.query(uid).update({
              where: { id: source.id },
              data: { locale: TARGET_LOCALE },
            });

            const enData = {
              ...base,
              documentId: String(source.documentId),
              ...(publishedAt ? { publishedAt } : {}),
            };
            for (const f of uidFields) enData[f] = ensureSuffix(enData[f], '-en');

            await strapi.entityService.create(uid, { data: enData, locale: SOURCE_LOCALE });
            totalCreated++;
          }
          if (totalCreated % 25 === 0) console.log(`    created so far: ${totalCreated}`);
        }

        start += limit;
      }
    }

    console.log(`\nDone.`);
    console.log(`  toCreate=${totalToCreate}`);
    console.log(`  created=${totalCreated}`);
    console.log(`  skipped=${totalSkipped}`);
    console.log(`  mode=${args.dry ? 'dry' : 'run'}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main();
}


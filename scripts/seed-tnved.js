'use strict';

const fs = require('fs');
const path = require('path');

const UID_TNVED = 'api::tnved.tnved';

function parseArgs(argv) {
  return {
    jsonPath:
      argv.find((a) => a.startsWith('--file='))?.split('=')[1] ||
      path.resolve(__dirname, '../data/tnved_catalog.json'),
    noTruncate: argv.includes('--no-truncate'),
    batchSize: Number(argv.find((a) => a.startsWith('--batch='))?.split('=')[1]) || undefined,
  };
}

function normalizeDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

function flattenTnvedTree(nodes, opts = {}, out = []) {
  const parentNodeId = opts.parentNodeId ?? null;
  const level = opts.level ?? 1;
  const pathParts = Array.isArray(opts.pathParts) ? opts.pathParts : [];
  const currentChapter = opts.chapter ?? null;

  for (const n of nodes) {
    const nodeId = Number(n.id);
    const children = Array.isArray(n.children) ? n.children : [];
    const codeRaw = typeof n.code === 'string' ? n.code.trim() : '';
    const codeNorm = normalizeDigits(codeRaw);
    const name = String(n.name ?? '');

    const myPathParts = [...pathParts, String(nodeId)];
    const nodePath = myPathParts.join('.');

    // Chapter = first 2 digits node under a section (depth 2), but we use a robust rule:
    // if this node has exactly 2 digits code, it becomes current chapter for descendants.
    const nextChapter = codeNorm && codeNorm.length === 2 ? codeNorm : currentChapter;

    out.push({
      nodeId,
      path: nodePath,
      code: codeRaw || null,
      codeNorm: codeNorm || null,
      name,
      level,
      chapter: nextChapter || null,
      hasChildren: children.length > 0,
      parentNodeId,
    });

    if (children.length) {
      flattenTnvedTree(children, {
        parentNodeId: nodeId,
        level: level + 1,
        pathParts: myPathParts,
        chapter: nextChapter,
      }, out);
    }
  }

  return out;
}

function buildAttrToColumn(meta) {
  const out = {};

  for (const [column, attribute] of Object.entries(meta.columnToAttribute || {})) {
    out[attribute] = column;
  }

  const attrs = meta.attributes || {};

  function ensureAttr(attrName) {
    const def = attrs[attrName];

    if (out[attrName]) {
      if (
        def &&
        def.type === 'relation' &&
        (def.relation === 'manyToOne' || def.relation === 'oneToOne') &&
        typeof out[attrName] === 'string' &&
        !out[attrName].endsWith('_id')
      ) {
        out[attrName] = `${out[attrName]}_id`;
      }
      return;
    }

    if (def && typeof def.columnName === 'string' && def.columnName.length > 0) {
      out[attrName] = def.columnName;
      return;
    }

    let snake = attrName
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();

    if (def && def.type === 'relation' &&
        (def.relation === 'manyToOne' || def.relation === 'oneToOne')) {
      snake += '_id';
    }

    out[attrName] = snake;
  }

  [
    'nodeId',
    'path',
    'code',
    'codeNorm',
    'name',
    'level',
    'chapter',
    'hasChildren',
    'parentNodeId',
    'parent',
  ].forEach(ensureAttr);

  return out;
}

async function setParentLinks(knex, table, client, opts) {
  const batchSize = opts.batchSize || (client.includes('sqlite') ? 200 : 1000);

  if (opts.mode === 'joinTable') {
    const jt = opts.joinTable;

    // 1) nodeId -> id
    const idRows = await knex(table).select('id', jt.nodeId);
    const nodeIdToId = new Map(idRows.map((r) => [Number(r[jt.nodeId]), r.id]));

    // 2) children with parentNodeId
    const children = await knex(table)
      .select('id', jt.parentNodeId)
      .whereNotNull(jt.parentNodeId);

    const links = [];
    for (const c of children) {
      const pNodeId = c[jt.parentNodeId];
      if (pNodeId == null) continue;
      const parentId = nodeIdToId.get(Number(pNodeId));
      if (!parentId) continue;
      links.push({
        [jt.joinColumn]: c.id, // child id
        [jt.inverseJoinColumn]: parentId, // parent id
        ...(jt.orderColumn ? { [jt.orderColumn]: 1 } : {}),
      });
    }

    if (!links.length) return;
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      await knex(jt.name).insert(batch);
    }
    return;
  }

  // FK mode
  const cols = opts.fk;
  const t = knex.raw('??', [table]).toString();
  const parentIdCol = knex.raw('??', [cols.parentId]).toString();
  const parentNodeIdCol = knex.raw('??', [cols.parentNodeId]).toString();
  const nodeIdCol = knex.raw('??', [cols.nodeId]).toString();

  if (client.includes('sqlite')) {
    await knex.raw(
      `UPDATE ${t}
       SET ${parentIdCol} = (
         SELECT p.id FROM ${t} AS p WHERE p.${nodeIdCol} = ${t}.${parentNodeIdCol}
       )
       WHERE ${parentNodeIdCol} IS NOT NULL`
    );
    return;
  }

  if (client.includes('postgres')) {
    await knex.raw(
      `UPDATE ${t} AS c
       SET ${parentIdCol} = p.id
       FROM ${t} AS p
       WHERE c.${parentNodeIdCol} = p.${nodeIdCol}`
    );
    return;
  }

  if (client.includes('mysql')) {
    await knex.raw(
      `UPDATE ${t} AS c
       JOIN ${t} AS p ON c.${parentNodeIdCol} = p.${nodeIdCol}
       SET c.${parentIdCol} = p.id`
    );
    return;
  }

  await knex.raw(
    `UPDATE ${t} AS c
     SET ${parentIdCol} = p.id
     FROM ${t} AS p
     WHERE c.${parentNodeIdCol} = p.${nodeIdCol}`
  );
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const args = parseArgs(process.argv.slice(2));

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const jsonRaw = fs.readFileSync(args.jsonPath, 'utf8');
    const tree = JSON.parse(jsonRaw);
    if (!Array.isArray(tree)) {
      throw new Error(`Expected JSON array at root. Got: ${typeof tree}`);
    }

    const rows = flattenTnvedTree(tree);
    console.log(`[tnved] nodes to import: ${rows.length}`);

    const meta = strapi.db.metadata.get(UID_TNVED);
    const table = meta.tableName;
    const cols = buildAttrToColumn(meta);
    const knex = strapi.db.connection;
    const client = String(strapi.db?.config?.connection?.client || '').toLowerCase();
    const parentRel = meta.attributes?.parent;
    const parentJoinTableName = parentRel?.joinTable?.name;

    const batchSize = args.batchSize || (client.includes('sqlite') ? 200 : 1000);

    if (!args.noTruncate) {
      console.log(`[tnved] truncating ${table} ...`);
      if (parentJoinTableName) {
        await knex(parentJoinTableName).del();
      } else if (cols.parent) {
        await knex(table).update({ [cols.parent]: null });
      }
      await knex(table).del();
    } else {
      console.log(`[tnved] --no-truncate enabled: appending (may fail on duplicate nodeId/path)`);
    }

    console.log(`[tnved] inserting in batches (size=${batchSize}) ...`);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const mapped = batch.map((r) => ({
        [cols.nodeId]: r.nodeId,
        [cols.path]: r.path,
        [cols.code]: r.code,
        [cols.codeNorm]: r.codeNorm,
        [cols.name]: r.name,
        [cols.level]: r.level,
        [cols.chapter]: r.chapter,
        [cols.hasChildren]: r.hasChildren,
        [cols.parentNodeId]: r.parentNodeId,
      }));
      await knex(table).insert(mapped);
      inserted += batch.length;
      if (inserted % (batchSize * 20) === 0) {
        console.log(`[tnved] inserted ${inserted}/${rows.length}`);
      }
    }

    console.log('[tnved] linking parents...');
    if (parentJoinTableName) {
      await setParentLinks(knex, table, client, {
        mode: 'joinTable',
        batchSize,
        joinTable: {
          name: parentJoinTableName,
          joinColumn: parentRel.joinTable.joinColumn.name,
          inverseJoinColumn: parentRel.joinTable.inverseJoinColumn.name,
          orderColumn: parentRel.joinTable.inverseOrderColumnName || null,
          parentNodeId: cols.parentNodeId,
          nodeId: cols.nodeId,
        },
      });
    } else {
      await setParentLinks(knex, table, client, {
        mode: 'fk',
        fk: {
          parentId: cols.parent,
          parentNodeId: cols.parentNodeId,
          nodeId: cols.nodeId,
        },
      });
    }

    console.log('[tnved] done ✅');
  } catch (e) {
    console.error('[tnved] seed failed:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main();
}


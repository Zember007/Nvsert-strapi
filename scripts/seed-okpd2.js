'use strict';

const fs = require('fs');
const path = require('path');

const UID_OKPD2 = 'api::okpd2.okpd2';

function parseArgs(argv) {
  return {
    jsonPath:
      argv.find((a) => a.startsWith('--file='))?.split('=')[1] ||
      path.resolve(__dirname, '../data/okpd2.json'),
    noTruncate: argv.includes('--no-truncate'),
    batchSize: Number(argv.find((a) => a.startsWith('--batch='))?.split('=')[1]) || undefined,
  };
}

function flattenOkpd2Tree(nodes, parentCode = null, out = []) {
  for (const n of nodes) {
    const children = Array.isArray(n.children) ? n.children : [];
    out.push({
      code: String(n.code),
      name: String(n.name),
      level: Number(n.level),
      hasChildren: children.length > 0,
      parentCode,
    });
    if (children.length) flattenOkpd2Tree(children, String(n.code), out);
  }
  return out;
}

function buildAttrToColumn(meta) {
  const out = {};

  // 1) Стандартная карта column -> attribute от Strapi (если есть)
  for (const [column, attribute] of Object.entries(meta.columnToAttribute || {})) {
    out[attribute] = column;
  }

  const attrs = meta.attributes || {};

  // 2) Утилита: достать columnName из описания атрибута, если оно есть
  function ensureAttr(attrName) {
    const def = attrs[attrName];

    // Если Strapi уже отдал маппинг (meta.columnToAttribute), то берем его,
    // но для relations иногда приходит "parent" вместо "parent_id" — страхуемся.
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

    // Fallback: Strapi по умолчанию делает snake_case
    // parentCode -> parent_code, hasChildren -> has_children и т.д.
    let snake = attrName
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();
    
    // Для relation (manyToOne, oneToOne) Strapi добавляет суффикс _id
    if (def && def.type === 'relation' && 
        (def.relation === 'manyToOne' || def.relation === 'oneToOne')) {
      snake += '_id';
    }
    
    out[attrName] = snake;
  }

  // Нам обязательно нужны эти атрибуты
  [
    'code',
    'name',
    'level',
    'hasChildren',
    'parentCode',
    'parent', // FK колонка для связи manyToOne -> parent_id
  ].forEach(ensureAttr);

  return out;
}

async function setParentLinks(knex, table, client, opts) {
  // Strapi 5 для self-relation может использовать joinTable вместо FK-колонки.
  // opts:
  // - mode: 'fk' | 'joinTable'
  // - fk: { parentId, parentCode, code }
  // - joinTable: { name, joinColumn, inverseJoinColumn, orderColumn, parentCode, code }
  // - batchSize

  const batchSize = opts.batchSize || (client.includes('sqlite') ? 200 : 1000);

  if (opts.mode === 'joinTable') {
    const jt = opts.joinTable;

    // 1) Мапа code -> id
    const idRows = await knex(table).select('id', jt.code);
    const codeToId = new Map(idRows.map((r) => [String(r[jt.code]), r.id]));

    // 2) Список детей с parentCode
    const children = await knex(table)
      .select('id', jt.parentCode)
      .whereNotNull(jt.parentCode);

    const links = [];
    for (const c of children) {
      const parentCode = c[jt.parentCode];
      if (parentCode == null) continue;
      const parentId = codeToId.get(String(parentCode));
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

  // FK mode (на случай других БД/схем)
  const cols = opts.fk;
  const t = knex.raw('??', [table]).toString();
  const parentIdCol = knex.raw('??', [cols.parentId]).toString();
  const parentCodeCol = knex.raw('??', [cols.parentCode]).toString();
  const codeCol = knex.raw('??', [cols.code]).toString();

  if (client.includes('sqlite')) {
    await knex.raw(
      `UPDATE ${t}
       SET ${parentIdCol} = (
         SELECT p.id FROM ${t} AS p WHERE p.${codeCol} = ${t}.${parentCodeCol}
       )
       WHERE ${parentCodeCol} IS NOT NULL`
    );
    return;
  }

  if (client.includes('postgres')) {
    await knex.raw(
      `UPDATE ${t} AS c
       SET ${parentIdCol} = p.id
       FROM ${t} AS p
       WHERE c.${parentCodeCol} = p.${codeCol}`
    );
    return;
  }

  if (client.includes('mysql')) {
    await knex.raw(
      `UPDATE ${t} AS c
       JOIN ${t} AS p ON c.${parentCodeCol} = p.${codeCol}
       SET c.${parentIdCol} = p.id`
    );
    return;
  }

  // Fallback: try postgres syntax
  await knex.raw(
    `UPDATE ${t} AS c
     SET ${parentIdCol} = p.id
     FROM ${t} AS p
     WHERE c.${parentCodeCol} = p.${codeCol}`
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

    const rows = flattenOkpd2Tree(tree);
    console.log(`[okpd2] nodes to import: ${rows.length}`);

    const meta = strapi.db.metadata.get(UID_OKPD2);
    const table = meta.tableName;
    const cols = buildAttrToColumn(meta);
    const knex = strapi.db.connection;
    const client = String(strapi.db?.config?.connection?.client || '').toLowerCase();
    const parentRel = meta.attributes?.parent;
    const parentJoinTableName = parentRel?.joinTable?.name;

    // SQLite has a low max variables limit; keep batches smaller there.
    const batchSize =
      args.batchSize ||
      (client.includes('sqlite') ? 200 : 1000);

    if (!args.noTruncate) {
      console.log(`[okpd2] truncating ${table} ...`);
      // Break relation links first (если relation хранится в joinTable), затем чистим основную таблицу.
      if (parentJoinTableName) {
        await knex(parentJoinTableName).del();
      } else if (cols.parent) {
        // Break self-FK chain first, then delete.
        await knex(table).update({ [cols.parent]: null });
      }
      await knex(table).del();
    } else {
      console.log(`[okpd2] --no-truncate enabled: appending (may fail on duplicate codes)`);
    }

    console.log(`[okpd2] inserting in batches (size=${batchSize}) ...`);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const mapped = batch.map((r) => ({
        [cols.code]: r.code,
        [cols.name]: r.name,
        [cols.level]: r.level,
        [cols.hasChildren]: r.hasChildren,
        [cols.parentCode]: r.parentCode,
      }));
      await knex(table).insert(mapped);
      inserted += batch.length;
      if (inserted % (batchSize * 20) === 0) {
        console.log(`[okpd2] inserted ${inserted}/${rows.length}`);
      }
    }

    console.log('[okpd2] linking parents...');
    if (parentJoinTableName) {
      await setParentLinks(knex, table, client, {
        mode: 'joinTable',
        batchSize,
        joinTable: {
          name: parentJoinTableName,
          joinColumn: parentRel.joinTable.joinColumn.name,
          inverseJoinColumn: parentRel.joinTable.inverseJoinColumn.name,
          orderColumn: parentRel.joinTable.inverseOrderColumnName || null,
          parentCode: cols.parentCode,
          code: cols.code,
        },
      });
    } else {
      await setParentLinks(knex, table, client, {
        mode: 'fk',
        fk: {
          parentId: cols.parent,
          parentCode: cols.parentCode,
          code: cols.code,
        },
      });
    }

    console.log('[okpd2] done ✅');
  } catch (e) {
    console.error('[okpd2] seed failed:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main();
}



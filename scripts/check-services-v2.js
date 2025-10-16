'use strict';

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    console.log('\n=== Method 1: strapi.documents() ===');
    try {
      const services1 = await strapi
        .documents('api::service.service')
        .findMany({
          limit: 10000,
          locale: 'all',
          populate: { content: { populate: ['image'] } },
        });
      console.log(`Found: ${services1.length} services`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }

    console.log('\n=== Method 2: strapi.entityService ===');
    try {
      const services2 = await strapi.entityService.findMany('api::service.service', {
        populate: { content: { populate: ['image'] } },
      });
      console.log(`Found: ${services2.length} services`);
      if (services2.length > 0) {
        console.log('First service:', JSON.stringify(services2[0], null, 2));
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }

    console.log('\n=== Method 3: strapi.db.query() ===');
    try {
      const services3 = await strapi.db.query('api::service.service').findMany({
        populate: { content: { populate: ['image'] } },
      });
      console.log(`Found: ${services3.length} services`);
      if (services3.length > 0) {
        console.log('First service slug:', services3[0].slug);
        console.log('First service locale:', services3[0].locale);
        if (services3[0].content) {
          console.log('Content blocks:', services3[0].content.length);
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }

    console.log('\n=== Method 4: Direct DB query ===');
    try {
      const knex = strapi.db.connection;
      const count = await knex('services').count('* as count').first();
      console.log(`Total rows in services table: ${count.count}`);
      
      const rows = await knex('services').select('*').limit(5);
      console.log(`Sample rows:`, rows.length);
      if (rows.length > 0) {
        console.log('First row:', JSON.stringify(rows[0], null, 2));
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }

  } catch (e) {
    console.error('Main error:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main();
}


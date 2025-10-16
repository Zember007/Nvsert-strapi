'use strict';

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const services = await strapi
      .documents('api::service.service')
      .findMany({
        limit: 10000,
        locale: 'all',
        populate: { content: { populate: ['image'] } },
      });

    console.log(`\nTotal services found: ${services.length}\n`);

    for (const doc of services) {
      console.log(`Service: ${doc.slug} (locale: ${doc.locale}, id: ${doc.documentId || doc.id})`);
      if (doc.content && doc.content.length) {
        console.log(`  Content blocks: ${doc.content.length}`);
        doc.content.forEach((block, i) => {
          console.log(`    ${i + 1}. type: ${block.blockType}, order: ${block.order || 'N/A'}, hasImage: ${!!block.image}`);
        });
      } else {
        console.log(`  No content blocks`);
      }
      console.log('');
    }
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main();
}


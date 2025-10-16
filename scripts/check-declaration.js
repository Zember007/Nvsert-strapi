'use strict';

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const services = await strapi.entityService.findMany('api::service.service', {
      filters: { slug: 'declaration-gost-r' },
      populate: { content: { populate: ['image'] } },
    });

    console.log(`\nFound ${services.length} service(s) with slug "declaration-gost-r"\n`);

    for (const service of services) {
      console.log(`Service: ${service.title}`);
      console.log(`  Slug: ${service.slug}`);
      console.log(`  Locale: ${service.locale}`);
      console.log(`  Published: ${service.publishedAt ? 'Yes' : 'No (draft)'}`);
      console.log(`  Content blocks: ${service.content ? service.content.length : 0}`);
      
      if (service.content && service.content.length > 0) {
        service.content.forEach((block, i) => {
          console.log(`    Block ${i + 1}:`);
          console.log(`      blockType: ${block.blockType}`);
          console.log(`      order: ${block.order}`);
          console.log(`      heading: ${block.heading || 'N/A'}`);
          console.log(`      hasImage: ${!!block.image}`);
        });
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


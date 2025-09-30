'use strict';

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

function transliterateToSlug(input) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    '«': '', '»': '', '–': '-', '—': '-', ' ': '-', '’': '', '“': '', '”': ''
  };
  return input
    .toString()
    .toLowerCase()
    .replace(/[а-яё«»–—\s'“”]/g, ch => map[ch] ?? ch)
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function getFileData(fileName) {
  const filePath = path.join('data', 'uploads', fileName);
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split('.').pop();
  const mimeType = mime.lookup(ext || '') || '';
  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `Feedback image ${name}`,
          caption: name,
          name,
        },
      },
    });
}

async function checkFileExistsBeforeUpload(fileName) {
  const baseName = fileName.replace(/\..*$/, '');
  const existing = await strapi.query('plugin::upload.file').findOne({ where: { name: baseName } });
  if (existing) return existing;
  const fileData = getFileData(fileName);
  const nameNoExt = fileName.split('.').shift();
  const [file] = await uploadFile(fileData, nameNoExt);
  return file;
}

async function upsertBySlug(modelUid, slug, data) {
  const existing = await strapi.documents(modelUid).findFirst({ filters: { slug: { $eq: slug } } });
  if (existing) {
    return strapi.documents(modelUid).update({ documentId: existing.id || existing.documentId, data, status: 'published' });
  }
  return strapi.documents(modelUid).create({ data, status: 'published' });
}

async function setPublicPermissions() {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  const actions = [
    'api::feedback.feedback.find',
    'api::feedback.feedback.findOne',
    'api::feedback-category.feedback-category.find',
    'api::feedback-category.feedback-category.findOne',
  ];
  for (const action of actions) {
    const exists = await strapi.query('plugin::users-permissions.permission').findOne({ where: { action, role: publicRole.id } });
    if (!exists) {
      await strapi.query('plugin::users-permissions.permission').create({ data: { action, role: publicRole.id } });
    }
  }
}

async function seedFeedback() {
  const file = path.resolve(__dirname, '../data/feedback.json');
  if (!fs.existsSync(file)) {
    throw new Error(`data/feedback.json not found at ${file}`);
  }
  const { categories = [], feedbacks = [] } = JSON.parse(fs.readFileSync(file, 'utf8'));

  const categoryIdBySlug = {};
  for (const c of categories) {
    const title = c.title?.trim();
    if (!title) continue;
    const slug = transliterateToSlug(title);
    const payload = {
      name: title,
      title: title,
      slug,
      description: c.description || '',
      order: Number.isFinite(c.order) ? c.order : 0,
      seo: c.seo || null,
      publishedAt: Date.now(),
    };
    const saved = await upsertBySlug('api::feedback-category.feedback-category', slug, payload);
    categoryIdBySlug[slug] = saved.id || saved.documentId;
  }

  for (const f of feedbacks) {
    const title = f.title?.trim();
    if (!title) continue;
    const slug = transliterateToSlug(title);
    const categoryTitle = f.categoryTitle?.trim() || title;
    const categorySlug = transliterateToSlug(categoryTitle);
    const categoryId = categoryIdBySlug[categorySlug];

    let photo = null;
    if (f.photoFile) {
      const uploaded = await checkFileExistsBeforeUpload(f.photoFile);
      photo = uploaded;
    }

    const payload = {
      title,
      slug,
      order: Number.isFinite(f.order) ? f.order : 0,
      photo: photo || null,
      content: f.content ? { body: f.content } : null,
      seo: f.seo || null,
      publishedAt: Date.now(),
    };

    if (categoryId) {
      payload.category = { connect: [categoryId] };
    }

    await upsertBySlug('api::feedback.feedback', slug, payload);
  }

  await setPublicPermissions();
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';
  try {
    await seedFeedback();
    console.log('Feedback seeding completed.');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await app.destroy();
  }
}

main();



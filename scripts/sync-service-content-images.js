'use strict';

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Allowed extensions in order of preference
const PREFERRED_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png'];

// Roots to look for images. You can add more roots if needed.
const CONTENT_ROOTS = [
  path.resolve(__dirname, '../data/uploads/services-content'),
  path.resolve(__dirname, '../data/uploads'),
];

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function getFileDataFromPath(filePath) {
  const fileName = path.basename(filePath);
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

function tryPaths(root, locale, slug, num) {
  const candidates = [];
  if (locale) {
    candidates.push(path.join(root, locale, slug, String(num)));
  }
  candidates.push(path.join(root, slug, String(num)));
  candidates.push(path.join(root, `${slug}--${num}`));
  return candidates;
}

function resolveWithExtensions(baseNoExt) {
  for (const ext of PREFERRED_EXTS) {
    const full = `${baseNoExt}.${ext}`;
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function findImageForBlock({ slug, locale, number }) {
  for (const root of CONTENT_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const bases = tryPaths(root, locale, slug, number);
    for (const base of bases) {
      const found = resolveWithExtensions(base);
      if (found) return found;
    }
  }
  return null;
}

async function uploadFile(file, baseName) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: baseName,
          caption: baseName,
          name: baseName,
        },
      },
    });
}

function isLocalNewerThanAttached(localFilePath, attachedFile) {
  if (!attachedFile) return true;
  try {
    const localMtime = fs.statSync(localFilePath).mtimeMs;
    const remoteUpdatedAt = new Date(attachedFile.updatedAt || attachedFile.createdAt || 0).getTime();
    return localMtime > remoteUpdatedAt;
  } catch {
    return true;
  }
}

function blockNumber(block, index) {
  const n = Number.isFinite(block?.order) ? Number(block.order) : index + 1;
  return Math.max(1, n);
}

async function processServiceDocument(doc) {
  const slug = doc.slug;
  const locale = doc.locale;
  let changed = false;

  const blocks = Array.isArray(doc.content) ? [...doc.content] : [];
  if (!blocks.length) return false;

  for (let i = 0; i < blocks.length; i++) {
    const b = { ...blocks[i] };
    if (b.blockType !== 'image') continue;

    const n = blockNumber(b, i);
    const localPath = findImageForBlock({ slug, locale, number: n });
    if (!localPath) continue;

    const currentFile = b.image || null;
    if (!isLocalNewerThanAttached(localPath, currentFile)) continue;

    const fileData = getFileDataFromPath(localPath);
    const baseName = path.basename(localPath, path.extname(localPath));
    const [uploaded] = await uploadFile(fileData, baseName);

    b.image = uploaded;
    if (!b.imageCaption) {
      b.imageCaption = baseName;
    }

    blocks[i] = b;
    changed = true;
  }

  if (changed) {
    await strapi
      .documents('api::service.service')
      .update({
        documentId: doc.id || doc.documentId,
        data: { content: blocks },
        status: 'published',
      });
  }

  return changed;
}

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

    let updates = 0;
    for (const doc of services) {
      const changed = await processServiceDocument(doc);
      if (changed) updates++;
    }

    console.log(`Service content images sync done. Updated: ${updates}`);
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



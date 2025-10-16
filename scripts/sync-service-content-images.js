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

function blockNumber( index) {
  const n = index + 1;
  return Math.max(1, n);
}

async function processServiceDocument(doc) {
  const slug = doc.slug;
  const locale = doc.locale;
  let changed = false;

  const blocks = Array.isArray(doc.content) ? [...doc.content] : [];
  if (!blocks.length) {
    console.log(`  [${slug}] No content blocks found`);
    return false;
  }

  console.log(`\n[${slug}] Processing service (locale: ${locale})`);
  console.log(`  Total blocks: ${blocks.length}`);

  for (let i = 0; i < blocks.length; i++) {
    const b = { ...blocks[i] };
    console.log(`  Block ${i + 1}: type=${b.blockType}, order=${b.order}`);


    const n = blockNumber(i);
    console.log(`    -> Looking for image number: ${n}`);
    const localPath = findImageForBlock({ slug, locale, number: n });
    if (!localPath) {
      console.log(`    -> No local image found for number ${n}`);
      continue;
    }
    console.log(`    -> Found local image: ${localPath}`);

    const currentFile = b.image || null;
    if (!isLocalNewerThanAttached(localPath, currentFile)) continue;

    const fileData = getFileDataFromPath(localPath);
    const baseName = path.basename(localPath, path.extname(localPath));
    console.log(`    -> Uploading file: ${baseName}`);
    const [uploaded] = await uploadFile(fileData, baseName);
    console.log(`    -> Uploaded file ID: ${uploaded?.id}, URL: ${uploaded?.url}`);

    b.image = uploaded?.id || uploaded;
    if (!b.imageCaption) {
      b.imageCaption = baseName;
    }

    blocks[i] = b;
    changed = true;
    console.log(`    -> Updated block ${i + 1} with image`);
  }

  if (changed) {
    console.log(`  -> Updating service ${slug}...`);
    console.log(`  -> Blocks to update:`, JSON.stringify(blocks.map(b => ({
      id: b.id,
      blockType: b.blockType,
      order: b.order,
      hasImage: !!b.image,
      imageId: b.image?.id || b.image
    })), null, 2));
    
    await strapi.entityService.update('api::service.service', doc.id, {
      data: { content: blocks },
    });
    console.log(`  -> ✅ Updated successfully`);
    
    // Verify update
    const updated = await strapi.entityService.findOne('api::service.service', doc.id, {
      populate: { content: { populate: ['image'] } },
    });
    console.log(`  -> Verification - blocks after update:`, updated.content.map(b => ({
      blockType: b.blockType,
      hasImage: !!b.image
    })));
  }

  return changed;
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    // Use entityService instead of documents() for Strapi 5
    const services = await strapi.entityService.findMany('api::service.service', {
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



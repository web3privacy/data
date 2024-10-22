import { run } from "https://deno.land/x/run_simple@2.3.0/mod.ts";
import { join } from "jsr:@std/path@0.224.0";
import { exists } from "jsr:@std/fs@0.224.0";
import * as mod from "jsr:@epi/image-to-webp";
import { decode, encode } from "https://deno.land/x/imagescript@1.0.0/mod.ts";

// function to check the 'thumbs' directory exists within /_images
async function checkThumbs(dir) {
  const thumbsPath = join(dir, 'thumbs');
  if (!(await exists(thumbsPath))) {
    await Deno.mkdir(thumbsPath, { recursive: true });
  }
}

// function to resize images using imagescipt deno library
async function resize(imageBuffer, newWidth, newHeight) {
  const image = await decode(imageBuffer);
  const resizedImage = image.resize(newWidth, newHeight);
  return await encode(resizedImage);
}

// function to wrtie the thumbnails into the directory
async function writeThumbs(dir, sizes, name, format, width, height) {
  for (const size of Object.keys(sizes)) {
    const sizeConf = sizes[size];
    const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`);
    const imagePath = join(dir, name + '.' + format);
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} already exists, skipping ...`);
      continue;
    }
    const image = await Deno.readFile(imagePath);
    const resized = await resize(image, sizeConf.width, Math.round(height / (width / sizeConf.width)));
    const webp = await imageToWebP(resized);
    await Deno.writeFile(outputFn, webp);
    console.log(`thumbnail written: ${outputFn}`);
  }
}

// function to write the thumbnails into the directory
async function writeThumbs(dir, sizes, name, format, width, height) {
  for (const size of Object.keys(sizes)) {
    const sizeConf = sizes[size];
    const format = 'png' || 'jpg' || 'jpeg';
    const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`);
    const imagePath = join(dir, name + '.' + format);
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} already exists, skipping ...`);
      continue;
    }
    const image = await Deno.readFile(imagePath);
    const resized = await resize(image, sizeConf.width, Math.round(height / (width / sizeConf.width)));
    const webp = await ImagetoWebP(resized);
    await Deno.writeFile(outputFn, webp);
    console.log(`thumbnail written: ${outputFn}`);
  }
}

// function to optimize the sizes of thumnbails for people and events
async function optimizeDir(dir, sizes) {
  await checkThuniclazmbs(dir);

  for await (const f of Deno.readDir(dir)) {
    const [name, ext] = f.name.split('.');
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      continue;
    }

    const imagePath = join(dir, f.name);
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} already exists, skipping ...`);
      continue;
    }

    console.log(`processing: ${name}`);

    const explain = await run(`identify ${join(dir, f.name)}`);
    const [_, format, resolution] = explain.split(' ');
    const [width, height] = resolution.split('x').map(c => Number(c));

    await writeThumbs(dir, sizes, name, format, width, height);
  }
}

await optimizeDir('./src/people/_images', { '64px': { width: 64 }, '128px': { width: 128 }, '400px': { width: 400 } })

const eventSizes = { '128px': { width: 128 }, '360px': { width: 360 }, '640px': { width: 640 } }
await optimizeDir('./src/events/_images/2023', eventSizes)
await optimizeDir('./src/events/_images/2024', eventSizes)

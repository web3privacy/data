import { run } from "https://deno.land/x/run_simple@2.3.0/mod.ts";
import { join } from "jsr:@std/path@0.224.0";
import { exists } from "jsr:@std/fs@0.224.0";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// Function to check if the 'thumbs' directory exists within the specified directory
async function checkThumbs(dir) {
  const thumbsPath = join(dir, 'thumbs');
  if (!(await exists(thumbsPath))) {
    await Deno.mkdir(thumbsPath, { recursive: true });
  }
}

// Function to resize the image
async function resize(imageBuffer, newWidth, newHeight) {
  const image = await Image.decode(imageBuffer);
  const resizedImage = image.resize(newWidth, newHeight);
  return await resizedImage.encode('webp'); // Encode the resized image to WebP format
}

// Function to write the thumbnails into the directory
async function writeThumbs(dir, sizes, name, format, width, height) {
  for (const size of Object.keys(sizes)) {
    const sizeConf = sizes[size];
    const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`);
    const imagePath = join(dir, name + '.' + format);
    
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} does not exist, skipping ...`);
      continue;
    }

    const image = await Deno.readFile(imagePath);
    const imageData = await Image.decode(image);
    const resized = await resize(image, sizeConf.width, Math.round(imageData.height / (imageData.width / sizeConf.width)));
    await Deno.writeFile(outputFn, resized);
    console.log(`Thumbnail written: ${outputFn}`);
  }
}

// Function to optimize the sizes of thumbnails for events
async function optimizeDir(dir, sizes) {
  await checkThumbs(dir);

  for await (const f of Deno.readDir(dir)) {
    const [name, ext] = f.name.split('.');
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      continue;
    }

    const imagePath = join(dir, f.name);
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} does not exist, skipping ...`);
      continue;
    }

    console.log(`Processing: ${name}`);

    const image = await Deno.readFile(imagePath);
    const imageData = await Image.decode(image);
    const [width, height] = [imageData.width, imageData.height];

    await writeThumbs(dir, sizes, name, ext, width, height);
  }
}

// Define thumbnail sizes for events
const eventSizes = { '128px': { width: 128 }, '360px': { width: 360 }, '640px': { width: 640 } };

// Optimize thumbnails for the events directories
await optimizeDir('./src/events/_images/2023', eventSizes);
await optimizeDir('./src/events/_images/2024', eventSizes);
await optimizeDir('./src/events/_images/2025', eventSizes);

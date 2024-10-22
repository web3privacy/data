import { run } from "https://deno.land/x/run_simple@2.3.0/mod.ts";
import { join } from "jsr:@std/path@0.224.0";
import { exists } from "jsr:@std/fs@0.224.0";
import * as mod from "jsr:@epi/image-to-webp";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// Function to check the 'thumbs' directory exists within /_images
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
  return await resizedImage.encode(); // This will return the encoded image buffer
}

// Function to write the thumbnails into the directory
async function writeThumbs(dir, sizes, name, format, width, height) {
  for (const size of Object.keys(sizes)) {
    const sizeConf = sizes[size];
    const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`);
    const imagePath = join(dir, name + '.' + format);
    
    const image = await Deno.readFile(imagePath);
    const resized = await resize(image, sizeConf.width, Math.round(height / (width / sizeConf.width)));
    const webp = await mond.imageToWebP(resized); // Use the imageToWebP function of image-to-webp package
    
    await Deno.writeFile(outputFn, webp);
    console.log(`Thumbnail generated: ${outputFn}`); // Log the generated thumbnail
  }
}

// Function to optimize the sizes of thumbnails for people and events
async function optimizeDir(dir, sizes) {
  await checkThumbs(dir);

  for await (const f of Deno.readDir(dir)) {
    const [name] = f.name.split('.');
    const formats = ['jpg', 'jpeg', 'png'];
    let foundImage = false;

    for (const ext of formats) {
      const imagePath = join(dir, `${name}.${ext}`);
      if (await exists(imagePath)) {
        console.log(`Processing: ${name}.${ext}`);
        foundImage = true;

        const explain = await run(`identify ${imagePath}`);
        const [_, format, resolution] = explain.split(' ');
        const [width, height] = resolution.split('x').map(c => Number(c));

        await writeThumbs(dir, sizes, name, ext, width, height);
        break; // Exit the loop once the first found image is processed
      }
    }

    if (!foundImage) {
      console.log(`No valid image found for: ${name}, please upload it to /src/people/_images/ folder ...`);
    }
  }
}

// Example usage
await optimizeDir('./src/people/_images', { '64px': { width: 64 }, '128px': { width: 128 }, '400px': { width: 400 } });

const eventSizes = { '128px': { width: 128 }, '360px': { width: 360 }, '640px': { width: 640 } };
await optimizeDir('./src/events/_images/2023', eventSizes);
await optimizeDir('./src/events/_images/2024', eventSizes);

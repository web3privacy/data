import { run } from "https://deno.land/x/run_simple@2.3.0/mod.ts";
import { join } from "jsr:@std/path@0.224.0";
import { exists } from "jsr:@std/fs@0.224.0";

async function checkThumbs(dir) {
  const thumbsPath = join(dir, 'thumbs');
  if (!(await exists(thumbsPath))) {
    await Deno.mkdir(thumbsPath, { recursive: true });
  }
}

async function writeThumbs(dir, sizes, name, format, width, height) {
  for (const size of Object.keys(sizes)) {
    const sizeConf = sizes[size];
    const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`);

    let resize = `-resize ${sizeConf.width} ${Math.round(height / (width / sizeConf.width))}`;
    if (width <= sizeConf.width) {
      resize = '';
    }

    await run(`cwebp ${join(dir, f.name)} -o ${outputFn}${resize ? ' ' + resize : ''}`);
    console.log(`File written: ${outputFn}`);
  }
}

async function optimizeDir(dir, sizes) {
  await checkThumbs(dir);

  for await (const f of Deno.readDir(dir)) {
    const [name, ext] = f.name.split('.');
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      continue;
    }

    const imagePath = join(dir, f.name);
    if (!(await exists(imagePath))) {
      console.log(`${imagePath} does not exist, skipping ..`);
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

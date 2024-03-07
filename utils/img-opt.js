import { run } from "https://deno.land/x/run_simple/mod.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { emptyDir } from "https://deno.land/std@0.196.0/fs/empty_dir.ts";

async function optimizeDir (dir, sizes) {
    await emptyDir(join(dir, 'thumbs'))
    
    for await (const f of Deno.readDir(dir)) {
        const [ name, ext ] = f.name.split('.')
        if (!['jpg', 'jpeg', 'png'].includes(ext)) {
            continue;
        }
        console.log(`processing: ${name}`)

        const explain = await run(`identify ${join(dir, f.name)}`);
        const [ _, format, resolution ] = explain.split(' ')
        const [ width, height ] = resolution.split('x').map(c => Number(c))

        for (const size of Object.keys(sizes)) {
            const sizeConf = sizes[size];
            const outputFn = join(dir, 'thumbs', `${name}-${size}.webp`)

            let resize = `-resize ${sizeConf.width} ${Math.round(height/(width/sizeConf.width))}`;
            if (width <= sizeConf.width) {
                resize = '';
            }
            //console.log(outputFn, resolution, resize)
            await run(`cwebp ${join(dir, f.name)} -o ${outputFn}${resize ? ' '+resize : ''}`)
            console.log(`File writted: ${outputFn}`)
        }
    }
}

await optimizeDir('./src/people/_images', { '64px': { width: 64 }, '128px': { width: 128 }, '400px': { width: 400 } })

const eventSizes = { '128px': { width: 128 }, '360px': { width: 360 }, '640px': { width: 640 } }
await optimizeDir('./src/events/_images/2023', eventSizes)
await optimizeDir('./src/events/_images/2024', eventSizes)

//console.log(await run('ls'))
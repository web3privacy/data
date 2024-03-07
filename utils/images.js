import { Engine } from "./engine.js";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.213.0/fs/exists.ts";

const engine = new Engine();
await engine.init();

const FORMAT = 'png';

async function genImage (destFn, url, element) {

    console.log(`Getting ${url} (${element}) (dest=${destFn})`)
    const file = await fetch("https://html2svg.gwei.cz", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url,
            element,
            format: FORMAT,
            scale: 4,
            //quality: 100,
        })
    });

    if (file.body) {
        const fileOutput = await Deno.open(destFn, { write: true, create: true });
        await file.body.pipeTo(fileOutput.writable);
        console.log(`File written: ${destFn}`)
    }
}

// events
const DEST_DIR = './src/events/_images';
const eventFormats = [
    'square',
    'wide-square',
    'wide',
    'poster',
    'poster-simple'
]

for(const event of engine.rendered.events) {
    if (!event.design) {
        continue
    }
    const year = event.date.match(/^(\d{4})/)[1]
    const design = event.design
    for (const format of eventFormats) {

        const destFn = join(DEST_DIR, year, `${event.id}-${format}.${FORMAT}`);
        if (await exists(destFn)) {
            console.log(`${destFn} existing, skipping ..`)
            continue;
        }

        await genImage(
            destFn,
            `https://beta.web3privacy.info/gen/event?id=${event.id}&image=${design.image}`,
            `#img-${format}`
        );
    }
}
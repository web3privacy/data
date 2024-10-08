import { Engine } from "./engine.js";
import { join } from "jsr:@std/path@0.224.0";
import { exists } from "jsr:@std/fs@0.224.0";

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
            `https://web3privacy.info/gen/event?id=${event.id}&img=${design.image}`,
            `#img-${format}`
        );
    }
}

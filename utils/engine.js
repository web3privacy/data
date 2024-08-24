import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { emptyDir } from "https://deno.land/std@0.224.0/fs/empty_dir.ts";
import { parse, stringify } from "npm:yaml";
import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { copy } from "https://deno.land/std@0.224.0/fs/copy.ts";

const SRC_DIR = "./src";
const DEST_DIR = "./dist";
const SCHEMA_DIR = "./schema";

export class Engine {
  constructor() {
    this.index = {};
    this.db = {};
    this.schemas = {};
  }

  async init() {
    // load schemas
    for await (const dirEntry of Deno.readDir(SCHEMA_DIR)) {
      const [fn, _] = dirEntry.name.split(".");
      this.schemas[fn] = await readYamlFile(join(SCHEMA_DIR, dirEntry.name));
    }
    // load
    this.index = await readYamlFile(join(SRC_DIR, "index.yaml"));
    this.rendered = await this.render(this.index);
  }

  async loadDir(src, opts = {}, full = {}) {
    const out = {};
    const dir = join(SRC_DIR, src);
    console.log(`reading dir=${dir}`);

    if (await exists(join(dir, "index.yaml"))) {
      const out = await readYamlFile(join(dir, "index.yaml"));
      if (opts.loader === "events") {
        // check speaker connection & load event images
        for (const ev of out) {
          if (ev.speakers) {
            for (const spId of ev.speakers) {
              if (!full.people.find((p) => p.id === spId)) {
                throw new Error(`Speaker not exists: ${spId} (event ${ev.id})`);
              }
            }
          }
          // load events images
          const year = ev.date.match(/^(\d{4})/)[1];
          const yearDir = join(dir, '_images', year);
          if (!await exists(yearDir)) {
            continue
          }
          const images = {}
          for await (const ie of Deno.readDir(yearDir)) {
            const [id, ext] = ie.name.split(".");
            if (id.match(new RegExp(`^${ev.id}-`))) {
              const imgName = id.split('-').slice(1).join('-')
              images[imgName] = `https://data.web3privacy.info/img/events/${year}/${id}.${ext}`;
            }
          }
          ev.images = images

          ev.thumbs = {}
          // scan for thumbnails
          if (!await exists(join(yearDir, "thumbs"))) {
            continue
          }
          for await (const ti of Deno.readDir(join(yearDir, "thumbs"))) {
            const [name, ext] = ti.name.split('.')

            //console.log(name, `^${ev.id}-(.+)-(\\d+)px$`)
            const match = name.match(new RegExp(`^${ev.id}-([\\w\\d-]+)-(\\d+)px`));
            if (!match) {
              continue
            }
            const thumbKey = match[2]
            const imageKey = match[1]

            ev.thumbs[[ imageKey, thumbKey.replace('px', '')].join(':')] = `https://data.web3privacy.info/img/events/${year}/thumbs/${ev.id}-${imageKey}-${thumbKey}px.${ext}`
          }
        }
      }
      return out;
    }

    let images = [];
    if (await exists(join(dir, "_images"))) {
      for await (const ie of Deno.readDir(join(dir, "_images"))) {
        const [id, ext] = ie.name.split(".");
        images.push({ id, ext });
      }
    }

    const arr = [];
    for await (const dirEntry of Deno.readDir(dir)) {
      const [fn, ext] = dirEntry.name.split(".");

      if (!ext && !fn.startsWith("_")) {
        const obj = Object.assign(
          { id: fn },
          await this.loadDir(join(src, fn), opts, full),
        );
        arr.push(obj);
      }
      if (ext === "yaml" && fn !== "index") {
        const item = Object.assign(
          { id: fn },
          await readYamlFile(join(dir, dirEntry.name)),
        );
        if (opts.loader === "person") {
          // load image
          const img = images.find((i) => i.id === fn);
          if (img) {
            item.imageUrl =
              `https://data.web3privacy.info/img/people/${img.id}.${img.ext}`;

            item.thumbs = {}

            // scan for thumbnails
            for await (const ti of Deno.readDir(join(dir, "_images", "thumbs"))) {
              const [name, ext] = ti.name.split('.')
              const split = name.split('-')
              const thumbKey = split[split.length-1]
              const sid = split.slice(0, split.length-1).join('-')
              
              if (item.id === sid) {
                item.thumbs[thumbKey.replace('px', '')] = `https://data.web3privacy.info/img/people/thumbs/${img.id}-${thumbKey}.${ext}`
              }
            }
          }
        }
        arr.push(item);
      }
    }
    return arr;
  }

  async render(src) {
    const out = {};
    for (const key of Object.keys(src)) {
      const val = src[key];
      if (typeof val === "object" && val.$load) {
        out[key] = await this.loadDir(val.$load, val.$opts, out);
        continue;
      }

      out[key] = val;
    }
    return out;
  }

  async build() {
    await emptyDir(DEST_DIR);
    //await writeJSONFile(join(DEST_DIR, "index.json"), this.index);
    // copy images
    await emptyDir(join(DEST_DIR, "img"));
    await copy(
      join(SRC_DIR, "people", "_images"),
      join(DEST_DIR, "img", "people"),
    );

    // copy event images
    await copy(
      join(SRC_DIR, "events", "_images"),
      join(DEST_DIR, "img", "events"),
    );

    await writeJSONFile(
      join(DEST_DIR, "index.json"),
      Object.assign({}, this.rendered),
    );
    /*for (const col of Object.keys(this.db)) {
      await writeJSONFile(join(DEST_DIR, `${col}.json`), this.db[col]);
    }*/
  }
}

async function readYamlFile(fn) {
  return parse(await Deno.readTextFile(fn));
}

async function writeJSONFile(fn, data) {
  console.log(`File written: ${fn}`);
  return Deno.writeTextFile(fn, JSON.stringify(data, null, 2));
}

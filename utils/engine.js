import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { emptyDir } from "https://deno.land/std@0.196.0/fs/empty_dir.ts";
import { parse, stringify } from "npm:yaml";
import { exists } from "https://deno.land/std@0.213.0/fs/exists.ts";

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

  async loadDir(src) {
    const out = {}
    const dir = join(SRC_DIR, src)
    console.log(`reading dir=${dir}`)
    
    if (await exists(join(dir, "index.yaml"))) {
      const out = readYamlFile(join(dir, "index.yaml"));
      return out
    }

    for await (const dirEntry of Deno.readDir(dir)) {
      const [fn, ext] = dirEntry.name.split(".");

      if (!ext) {
        out[fn] = await this.loadDir(join(src, fn))
        continue;
      }
      if (ext === "yaml" && fn !== "index") {
        out[fn] = await readYamlFile(join(dir, dirEntry.name));
      }
    }
    return out
  }

  async render(src) {
    const out = {}
    for (const key of Object.keys(src)) {
      const val = src[key];
      if (typeof val === "object" && val.$load) {
        out[key] = await this.loadDir(val.$load);
        continue;
      }

      out[key] = val
    }
    return out
  }

  async build() {
    await emptyDir(DEST_DIR);
    //await writeJSONFile(join(DEST_DIR, "index.json"), this.index);
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

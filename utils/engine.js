import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { emptyDir } from "https://deno.land/std@0.196.0/fs/empty_dir.ts";
import { parse, stringify } from "npm:yaml";

const SRC_DIR = "./data";
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
    // load data
    this.index = await readYamlFile(join(SRC_DIR, "index.yaml"));
    for await (const dirEntry of Deno.readDir(SRC_DIR)) {
      const [fn, ext] = dirEntry.name.split(".");
      if (ext === "yaml" && fn !== "index") {
        this.db[fn] = await readYamlFile(join(SRC_DIR, dirEntry.name));
      }
    }
  }

  async build() {
    await emptyDir(DEST_DIR);
    await writeJSONFile(join(DEST_DIR, "index.json"), this.index);
    await writeJSONFile(
      join(DEST_DIR, "bundle.json"),
      Object.assign({}, this.index, this.db),
    );
    for (const col of Object.keys(this.db)) {
      await writeJSONFile(join(DEST_DIR, `${col}.json`), this.db[col]);
    }
  }
}

async function readYamlFile(fn) {
  return parse(await Deno.readTextFile(fn));
}

async function writeJSONFile(fn, data) {
  console.log(`File written: ${fn}`);
  return Deno.writeTextFile(fn, JSON.stringify(data, null, 2));
}

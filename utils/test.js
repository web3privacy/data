import Ajv from "npm:ajv@8.8.2";
import addFormats from "npm:ajv-formats@2.1.1";

import { Engine } from "./engine.js";

const engine = new Engine();
await engine.init();

const ajv = new Ajv({ strict: false });
addFormats(ajv);

function checkCollection (name, schema, data) {
    Deno.test(name, () => {
        const validator = ajv.compile(schema);
        if (!validator(data)) {
            throw validator.errors;
        }
    })
}

// check index
checkCollection("index", engine.schemas.index, engine.index)
for (const col of Object.keys(engine.db)) {
    checkCollection(`collection: ${col}`, engine.schemas[col], engine.db[col])   
}
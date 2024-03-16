import Ajv from "npm:ajv@8.8.2";
import addFormats from "npm:ajv-formats@2.1.1";

import { Engine } from "./engine.js";

const engine = new Engine();
await engine.init();

const ajv = new Ajv({ strict: false });
addFormats(ajv);

function checkCollection(name, schema, data) {
  Deno.test(name, () => {
    if (!schema) {
      return;
    }
    const validator = ajv.compile(schema);
    if (!validator(data)) {
      throw validator.errors;
    }
  });
}

// check index
checkCollection("index", engine.schemas.index, engine.rendered);

// check events
const eventTypes = {
  summit: { code: "s" },
  meetup: { code: "m" },
  hackathon: { code: "h" },
  "privacy-corner": { code: "c" },
  "online-summit": { code: "os" },
  'meta-hackathon': { code: "q" },
};
const usedIds = [];
for (const event of engine.rendered.events) {
  Deno.test(`event: ${event.id}`, () => {
    // check id duplicates
    if (usedIds.includes(event.id)) {
      throw `Duplicate ID: ${event.id}`;
    }
    usedIds.push(event.id);

    // check id
    const codes = Object.keys(eventTypes).map((et) => eventTypes[et].code);
    const match = event.id.match(
      new RegExp(`^(${codes.join("|")})(\\d{2})(\\w{2,3})$`),
    );
    if (!match) {
      throw `Bad event id: ${event.id}`;
    }
    const [_, type, year, location] = match;
    if (eventTypes[event.type].code !== type) {
      throw `ID doesnt reflect event type: id=${event.id} type=${event.type}`;
    }
    const eventYear = event.date.match(/^\d{2}(\d{2})/)[1];
    if (year !== eventYear) {
      throw `ID doesnt reflect event year: id=${event.id} date=${event.date}`;
    }
  });
}

import { Engine } from "./engine.js";

const engine = new Engine();
await engine.init();

await engine.build();

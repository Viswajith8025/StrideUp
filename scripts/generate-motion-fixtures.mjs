import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  synthesizeWalking,
  synthesizeStill,
  synthesizeScrolling,
  synthesizeVehicle,
  synthesizeStairs,
} from "../src/lib/steps/detection/synthesize.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/lib/steps/detection/__fixtures__");
fs.mkdirSync(outDir, { recursive: true });

const traces = [
  synthesizeWalking({
    name: "steady-walking",
    label: "Steady walking",
    steps: 40,
    stepsPerSec: 1.75,
    seed: 42,
  }),
  synthesizeWalking({
    name: "brisk-walking",
    label: "Brisk walking",
    steps: 50,
    stepsPerSec: 2.15,
    amplitude: 3.2,
    seed: 43,
  }),
  synthesizeWalking({
    name: "pocket-walking",
    label: "Phone in pocket",
    steps: 36,
    stepsPerSec: 1.7,
    phoneInPocket: true,
    seed: 44,
    tolerancePct: 0.25,
  }),
  synthesizeWalking({
    name: "hand-walking",
    label: "Phone in hand while walking",
    steps: 40,
    stepsPerSec: 1.8,
    amplitude: 2.6,
    seed: 45,
  }),
  synthesizeStairs(),
  synthesizeStill(),
  synthesizeScrolling(),
  synthesizeVehicle(),
];

for (const tr of traces) {
  const file = path.join(outDir, `${tr.name}.json`);
  fs.writeFileSync(file, JSON.stringify(tr));
  console.log("wrote", tr.name, "samples", tr.samples.length);
}

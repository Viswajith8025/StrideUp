# Motion fixtures

Committed traces for `createStepDetector` regression tests.

Current files are **synthetic** biomechanical traces (see `synthesize.ts`) with known ground-truth step counts. Replace them with device captures from `/settings/motion-debug` when available — set `trueSteps` and keep `expectNearZero` accurate.

Do not invent steps for gaps; traces must be continuous foreground recordings only.

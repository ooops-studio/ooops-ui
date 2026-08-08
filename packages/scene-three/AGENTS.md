# Scene Three Guidance

- Use WebGPURenderer and TSL/Node Materials for first-party scenes.
- Keep decoder paths explicit and project-local; never introduce CDN defaults.
- Dispose every GPU resource and test abort, backend fallback and device/context loss.
- Do not expose arbitrary shader editing or import Astro/application code.

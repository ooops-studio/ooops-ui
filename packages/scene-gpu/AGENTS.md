# Scene GPU Guidance

- Keep WebGPU and WebGL 2 negotiation native and dependency-free.
- Prepare WebGPU resources before committing the canvas context so startup failures can use WebGL 2.
- Dispose every GPU resource and test abort, backend fallback and device/context loss.
- Do not import Three.js, Astro, application code or project shaders.

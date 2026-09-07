# @ooopsstudio/scene-core

## 0.1.1

- Bound backing-store pixels by quality tier: 1 MP low, 2.25 MP auto and 4 MP high.
- Scale DPR below 1 when necessary so large and high-DPR viewports stay inside their pixel budget.

## 0.1.0

- Initial renderer-neutral interactive scene lifecycle and coordination API.
- Runtime scene definitions now use a local minimal manifest and no longer depend on visual-editor contracts.

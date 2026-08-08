<script lang="ts">
  import {Popover} from '@ooopsstudio/ui-svelte'
</script>

{#snippet bottomContent()}<div class="large-layer">Bottom collision content</div>{/snippet}
{#snippet topContent()}<div class="large-layer">Top collision content</div>{/snippet}

<h1>Layer collision fixture</h1>
<div class="edge edge-bottom-right">
  <Popover id="svelte-edge-bottom" triggerLabel="Bottom edge" placement="bottom" align="end" ariaLabel="Bottom edge panel" children={bottomContent} />
</div>
<div class="edge edge-top-left">
  <Popover id="svelte-edge-top" triggerLabel="Top edge" placement="top" align="start" ariaLabel="Top edge panel" children={topContent} />
</div>

<style>
  .edge { position: fixed; }
  .edge-bottom-right { right: 2px; bottom: 2px; }
  .edge-top-left { left: 2px; top: 4rem; }
  .large-layer { width: 280px; min-height: 160px; }
</style>

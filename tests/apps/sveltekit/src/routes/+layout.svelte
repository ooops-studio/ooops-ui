<script lang="ts">
  import '@ooopsstudio/ui-svelte/base.css'
  import '../styles.css'
  import type {Snippet} from 'svelte'

  let {children}: {children: Snippet} = $props()
</script>

<svelte:head><title>Ooops UI Svelte E2E</title></svelte:head>
<a class="skip-link" href="#main">Skip to content</a>
<main id="main">{@render children()}</main>

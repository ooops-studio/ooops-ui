<script lang="ts">
  import {onMount} from 'svelte'
  let cleanups = $state(0)
  let pending = $state(0)
  let aborted = $state(0)
  onMount(() => {
    const refresh = () => {
      pending = Number(sessionStorage.getItem('svelte-async-pending') ?? 0)
      aborted = Number(sessionStorage.getItem('svelte-async-aborted') ?? 0)
    }
    cleanups = Number(sessionStorage.getItem('svelte-lab-cleanups') ?? 0)
    refresh()
    const timer = window.setInterval(refresh, 25)
    return () => window.clearInterval(timer)
  })
</script>

<h1>Cleanup destination</h1>
<p id="cleanup-marker">The component laboratory was unmounted.</p>
<p id="cleanup-count">cleanups:{cleanups}</p>
<p id="async-pending">pending:{pending}</p>
<p id="async-aborted">aborted:{aborted}</p>
<a href="/">Return to components</a>

<script lang="ts">
  import {SearchableMultiSelect} from '@ooopsstudio/ui-svelte'
  const options = [{value: 'design', label: 'Design'}, {value: 'code', label: 'Code'}, {value: 'research', label: 'Research'}]
  let values = $state<string[]>([])
  let created = $state('')
</script>
<h1>Searchable multi select laboratory</h1>
<section aria-label="Searchable members">
  <SearchableMultiSelect id="svelte-searchable-multi" name="members" ariaLabel="Members" {options} bind:values hideSelected onCreate={query => { created = query }} />
  <output aria-label="Selected members">{values.join(',')}</output>
  <output aria-label="Created member">{created}</output>
</section>

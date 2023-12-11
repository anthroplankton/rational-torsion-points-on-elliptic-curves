<script lang="ts">
  import { onMount } from 'svelte'
  import plt from './plot'

  let root: HTMLElement
  onMount(() => plt.newPlot(root))
</script>

<div id="plot" class="d-block w-100 h-100 bg-dark-subtle" bind:this={root}></div>

<style>
  #plot {
    flex-grow: 1;
    flex-shrink: 3;
  }
</style>

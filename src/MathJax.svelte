<script lang="ts">
  import MathJax from 'MathJax'

  export let math: string
  export let block = false

  let container: HTMLElement | undefined
  $: if (container) MathJax.typesetPromise([container])
</script>

{#key [math, block]}
  {#if block}
    <div class="my-3 text-center" bind:this={container}>
      {`\u200b\u200b${math}\u200b\u200b`}
    </div>
  {:else}
    <span bind:this={container}>
      {`\u200b${math}\u200b`}
    </span>
  {/if}
{/key}

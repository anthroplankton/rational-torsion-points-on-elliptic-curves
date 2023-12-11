<script lang="ts">
  import { debounce } from 'lodash'
  import MathJax from './MathJax.svelte'

  export let name: string
  export let coefficient: bigint
  let input: string = new URL(window.location.href).searchParams.get(name) ?? ''

  function refreshCoefficient(input: string) {
    coefficient = /^([+-]|)$/.test(input) ? 0n : BigInt(input)
  }
  const debounced = debounce(refreshCoefficient, 100)
  $: debounced(input)

  const nonintegerRegex = /^0+(?!$)|[^0-9+-]|(?<!^)[+-]/g
  $: if (nonintegerRegex.test(input)) {
    input = input.replaceAll(nonintegerRegex, '')
  }

  export function clear() {
    input = ''
    coefficient = 0n
  }
</script>

<div class="input-group mb-3">
  <span class="input-group-text"><MathJax math={name + '='} /></span>
  <input class="form-control" type="text" bind:value={input} on:change={() => refreshCoefficient(input)} />
  <button type="button" class="input-group-text btn btn-outline-secondary" tabindex="-1" on:click={clear}>
    <MathJax math="\times" />
  </button>
</div>

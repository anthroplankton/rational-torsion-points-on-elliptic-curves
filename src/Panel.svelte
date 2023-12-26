<script lang="ts">
  import lo from 'lodash'
  import Coefficient from './Coefficient.svelte'
  import MathJax from './MathJax.svelte'
  import { EllipticCurve } from './elliptic-cruves'
  import { compute, plot, stop } from './panel'
  import { computingStatusStore, yCandidatesStore, integralPointsStore, torsionPointsStore } from './panel'
  import plt from './plot'

  let coefficients: Coefficient[] = []
  let a: bigint = 0n
  let b: bigint = 0n
  let c: bigint = 0n
  let curve: EllipticCurve | undefined
  let y: bigint | undefined
  let x: Set<bigint> | undefined
  let integralPointsElement: HTMLDivElement
  $: yCandidates = $yCandidatesStore
  $: integralPoints = $integralPointsStore
  $: torsionPoints = $torsionPointsStore
  $: x = y == undefined ? undefined : integralPoints.get(y)
  $: inputCurve = new EllipticCurve(c, b, a)
  $: if ($plt && (!curve || curve.equal(inputCurve))) {
    plot(inputCurve, {
      x: torsionPoints.map(([x]) => Number(x)),
      y: torsionPoints.map(([, y]) => Number(y)),
    })
  }
</script>

<div class="p-3 h-100 overflow-auto" id="panel">
  <div class="overflow-x-auto overflow-y-hidden mb-1"><MathJax math={inputCurve.toString()} block={true} /></div>
  <form
    on:submit|preventDefault={async () => {
      stop()
      curve = inputCurve
      await compute(curve)
    }}
  >
    <Coefficient name="a" bind:coefficient={a} bind:this={coefficients[0]} />
    <Coefficient name="b" bind:coefficient={b} bind:this={coefficients[1]} />
    <Coefficient name="c" bind:coefficient={c} bind:this={coefficients[2]} />
    <div class="container">
      <div class="row">
        {#if $computingStatusStore.finish}
          <button
            type="button"
            class="btn btn-danger me-2 col"
            on:click={() => {
              if (curve) {
                curve = undefined
                y = undefined
                yCandidates = []
                integralPoints = new Map()
                torsionPoints = []
              } else {
                for (const coefficient of coefficients) {
                  coefficient.clear()
                }
              }
            }}>Clear</button
          >
        {:else}
          <button type="button" class="btn btn-danger me-2 col" on:click={stop}>Stop</button>
        {/if}
        <button type="submit" class="btn btn-primary col" disabled={inputCurve.discriminant == 0n}>
          Compute
          {#if curve && !$computingStatusStore.finish}
            <div class="spinner-border spinner-border-sm"></div>
          {/if}
        </button>
      </div>
    </div>
  </form>
  <hr />
  {#if curve && !curve.equal(inputCurve)}
    <div class="overflow-x-auto overflow-y-hidden text-center mb-3"><MathJax math={curve.toString()} /></div>
  {/if}
  <div class="card mb-3">
    <div class="card-header">Discriminant <MathJax math="D" /></div>
    <div class="card-body overflow-auto">
      <MathJax math={`=${(curve || inputCurve).discriminant}`} />
    </div>
  </div>
  <div class="card mb-3">
    <div class="card-header"><MathJax math="y=0" /> or <MathJax math="y^2 \mid D" /></div>
    <div class="card-body">
      <div class="btn-group btn-group-sm d-flex flex-wrap">
        {#each yCandidates as factor, i}
          <input
            type="radio"
            class="btn-check"
            name="btnradio"
            id={`btnradio${i}`}
            bind:group={y}
            value={factor}
            on:focus={() => integralPointsElement.scrollIntoView()}
          />
          <label
            class:btn-outline-success={integralPoints.has(factor)}
            class:btn-outline-secondary={$computingStatusStore.integralPointsDone.has(factor)}
            class="btn btn-outline-primary rounded-0"
            for={`btnradio${i}`}
          >
            {factor}
            <!-- <MathJax math={String(factor)} /> -->
          </label>
        {/each}
        {#if curve && !$computingStatusStore.yCandidatesDone}
          <input type="radio" class="btn-check" name="btnradio" id="btnradio-spinner" />
          <label class="btn btn-outline-primary rounded-0" for="btnradio-spinner">
            <div class="spinner-border spinner-border-sm"></div>
          </label>
        {/if}
      </div>
    </div>
  </div>
  <div class="card mb-3">
    <div class="card-header"><MathJax math={`(x, ${y ?? 'y'})`} /> are Integer Points on Curve</div>
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-cente" bind:this={integralPointsElement}>
        {#if y != undefined}
          {#if x}
            {#each x as x}
              <ul class="list-group m-1">
                <li class:list-group-item-success={lo(torsionPoints).find(([t]) => t == x)} class="list-group-item">
                  <MathJax math={`(${x}, ${y})`} />
                </li>
              </ul>
            {/each}
          {:else if $computingStatusStore.integralPointsDone.has(y)}
            <MathJax math="\varnothing" />
          {/if}
          {#if curve && !$computingStatusStore.integralPointsDone.has(y)}
            <div class="spinner-border spinner-border-sm"></div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  #panel {
    flex-shrink: 1;
    flex-basis: 420px;
  }
  li {
    font-size: small;
  }
</style>

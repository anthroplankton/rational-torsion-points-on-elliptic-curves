import { readonly, writable } from 'svelte/store'
import NagellLutzFactorsWorker from 'worker:nagell-lutz'
import RationalZerosWorker from 'worker:rational-zeros'
import plt from './plot'
import { WorkerPool, type PostMessage } from './worker'
import type { EllipticCurve } from './elliptic-cruves'
import type { Polynomial } from './polynomials'
import { abs } from './math'

let computeNagellLutzFactorsWorkerPool: WorkerPool<EllipticCurve, bigint, bigint>
let computeRationalZerosWorkerPool: WorkerPool<bigint, Polynomial, bigint>

const computingStatus = writable({
  yCandidatesDone: true,
  integralPointsDone: new Set<bigint>(),
  allDone: true,
})
export const computingStatusStore = readonly(computingStatus)

const yCandidates = writable<bigint[]>([])
export const yCandidatesStore = readonly(yCandidates)

const integralPoints = writable(new Map<bigint, bigint[]>())
export const integralPointsStore = readonly(integralPoints)

export function stop() {
  computeNagellLutzFactorsWorkerPool?.terminate()
  computeRationalZerosWorkerPool?.terminate()
  computingStatus.update(s => ((s.allDone = true), s))
}

async function computeNagellLutzFactors(curve: EllipticCurve, postMessage: PostMessage<bigint, bigint>) {
  await postMessage(abs(curve.discriminant), factor => {
    yCandidates.update(y => (y.push(factor), y))
    computeRationalZerosWorkerPool.put(factor)
  })
  computingStatus.update(s => ((s.yCandidatesDone = true), s))
}

async function computeRationalZeros(curve: EllipticCurve, y: bigint, postMessage: PostMessage<Polynomial, bigint>) {
  await postMessage(curve.f.add(-y * y), x => {
    integralPoints.update(map => {
      const xs = map.get(y) ?? []
      xs.push(x)
      map.set(y, xs)
      return map
    })
  })
  computingStatus.update(s => (s.integralPointsDone.add(y), s))
}

export async function compute(curve: EllipticCurve) {
  computingStatus.set({ yCandidatesDone: false, integralPointsDone: new Set(), allDone: false })
  yCandidates.set([0n])
  integralPoints.set(new Map())
  computeNagellLutzFactorsWorkerPool = new WorkerPool(NagellLutzFactorsWorker, computeNagellLutzFactors)
  computeRationalZerosWorkerPool = new WorkerPool(
    RationalZerosWorker,
    async (y, postMessage) => await computeRationalZeros(curve, y, postMessage),
    16
  )
  computeRationalZerosWorkerPool.put(0n)
  computeNagellLutzFactorsWorkerPool.put(curve)
  await computeNagellLutzFactorsWorkerPool.drain()
  await computeRationalZerosWorkerPool.drain()
  computingStatus.update(c => ((c.allDone = true), c))
}

export async function plot(curve: EllipticCurve, points: { x: number[]; y: number[] } = { x: [], y: [] }) {
  const range = [curve.f.zeros(), curve.f.criticals(), curve.f.inflections(), points.x].flat()
  const start = Math.min(...range)
  const end = Math.max(...range)
  const delta = Math.max(end - start, 1)
  return plt.plot(
    [
      {
        mode: 'lines',
        range: [start - delta / 40, end + delta],
        hoverinfo: 'x+y',
        uid: 'elliptic-curve',
        x: t => {
          const y = t.map(t => Math.sqrt(curve.f.apply(t)))
          const broke = t
            .filter((_, i) => {
              const [a, b, c] = [y[i - 1], y[i], y[i + 1]].map(Number.isNaN)
              return (a && !b) || (!b && c)
            })
            .map(t => [null, t, t])
            .flat()
          return [...t, null, ...t, ...broke]
        },
        y: t => {
          const y = t.map(t => Math.sqrt(curve.f.apply(t)))
          const broke = y
            .filter((_, i) => {
              const [a, b, c] = [y[i - 1], y[i], y[i + 1]].map(Number.isNaN)
              return (a && !b) || (!b && c)
            })
            .map(y => [null, y, -y])
            .flat()
          return [...y, null, ...y.map(y => -y), ...broke]
        },
      },
      { mode: 'markers', hoverinfo: 'x+y', marker: { size: 8 }, uid: 'points', ...points },
    ],
    { relayout: true, reset: true }
  )
}

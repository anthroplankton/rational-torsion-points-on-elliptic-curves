import lo from 'lodash'
import { get, readonly, writable } from 'svelte/store'
import NagellLutzFactorsWorker from 'worker:nagell-lutz'
import RationalZerosWorker from 'worker:rational-zeros'
import plt from './plot'
import { WorkerPool, type PostMessage } from './worker'
import { origin, Point, type EllipticCurve } from './elliptic-cruves'
import type { Cubic } from './polynomials'
import { abs } from './math'

let computeNagellLutzFactorsWorkerPool: WorkerPool<EllipticCurve, bigint, bigint>
let computeRationalZerosWorkerPool: WorkerPool<bigint, Cubic<bigint>, bigint>

function inplaced<T>(updater: (value: T) => void) {
  return (value: T) => {
    updater(value)
    return value
  }
}

const computingStatus = writable({
  yCandidatesDone: true,
  integralPointsDone: new Set<bigint>(),
  finish: true,
})
export const computingStatusStore = readonly(computingStatus)

const yCandidates = writable<bigint[]>([])
export const yCandidatesStore = readonly(yCandidates)

const integralPoints = writable(new Map<bigint, Set<bigint>>())
export const integralPointsStore = readonly(integralPoints)

const xTorsionPoints = new Set<bigint>()
const torsionPoints = writable<[bigint, bigint][]>([])
export const torsionPointsStore = readonly(torsionPoints)

export function stop() {
  computeNagellLutzFactorsWorkerPool?.terminate()
  computeRationalZerosWorkerPool?.terminate()
  computingStatus.update(inplaced(s => (s.finish = true)))
}

async function computeNagellLutzFactors(curve: EllipticCurve, postMessage: PostMessage<bigint, bigint>) {
  await postMessage(abs(curve.discriminant), factor => {
    yCandidates.update(inplaced(y => y.push(factor)))
    computeRationalZerosWorkerPool.put(factor)
  })
  computingStatus.update(inplaced(s => (s.yCandidatesDone = true)))
}

async function computeRationalZeros(curve: EllipticCurve, y: bigint, postMessage: PostMessage<Cubic<bigint>, bigint>) {
  await postMessage(curve.f.sub(y * y), x => {
    integralPoints.update(map => {
      const xs = map.get(y) ?? new Set()
      xs.add(x)
      map.set(y, xs)
      return map
    })
    computeTorsionPoints(curve, x, y)
  })
  computingStatus.update(inplaced(s => s.integralPointsDone.add(y)))
}

function computeTorsionPoints(curve: EllipticCurve, x: bigint, y: bigint) {
  const p = new Point(x, y)
  const points: Point[] = [p]
  for (let i = 1; i < 12; ++i) {
    const q = points[i - 1]
    // if (xTorsionPoints.has(x)) break
    const [df, y2] = curve.slope(p, q)
    if (y2 != 0n && df % y2 != 0n) return
    const r = curve.sum(p, q)
    if (r == origin) break
    points.push(r)
  }
  if (points.length < 12) {
    torsionPoints.update(arr => {
      for (const q of points) {
        xTorsionPoints.add(x)
        arr.push([q.x, q.y])
        // arr.push([q.x, -q.y])
      }
      return lo(arr).uniqWith(lo.isEqual).value()
    })
  }
  if (get(torsionPoints).length >= 15 || points.length >= 8) {
    stop()
  }
}

export async function compute(curve: EllipticCurve) {
  computingStatus.set({ yCandidatesDone: false, integralPointsDone: new Set(), finish: false })
  yCandidates.set([0n])
  integralPoints.set(new Map())
  torsionPoints.set([])
  computeNagellLutzFactorsWorkerPool = new WorkerPool(NagellLutzFactorsWorker, computeNagellLutzFactors)
  computeRationalZerosWorkerPool = new WorkerPool(
    RationalZerosWorker,
    async (y, postMessage) => await computeRationalZeros(curve, y, postMessage),
    16
  )
  await computeRationalZerosWorkerPool.put(0n)
  await computeNagellLutzFactorsWorkerPool.put(curve)
  await computeNagellLutzFactorsWorkerPool.drain()
  await computeRationalZerosWorkerPool.drain()
  computingStatus.update(inplaced(c => (c.finish = true)))
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
      {
        mode: 'markers',
        hoverinfo: 'x+y',
        xhoverformat: 'd',
        yhoverformat: 'd',
        marker: { size: 8 },
        uid: 'points',
        ...points,
      },
    ],
    { relayout: true, reset: true }
  )
}

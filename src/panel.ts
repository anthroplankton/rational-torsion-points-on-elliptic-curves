import { readonly, writable } from 'svelte/store'
import nagellLutzFactorsWorker from 'worker:nagell-lutz'
import RationalZerosWorker from 'worker:rational-zeros'
import { EllipticCurve } from './elliptic-cruves'
import { abs } from './math'
import plt from './plot'
import { queue, type QueueObject } from 'async'

const workers: { worker: Worker; reject: (reason?: string) => void }[] = []

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
  computeIntegralPointTasks?.kill()
  for (const { reject, worker } of workers) {
    worker.terminate()
    reject('stop')
  }
  computingStatus.update(s => ((s.allDone = true), s))
}

let computeIntegralPointTasks: QueueObject<bigint>
async function computeIntegralPoints(curve: EllipticCurve, y: bigint) {
  const worker = new RationalZerosWorker()
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      workers.push({ worker, reject })
      worker.onmessage = event => {
        const data: bigint | null = event.data
        if (data == null) {
          worker.terminate()
          resolve()
          return
        }
        integralPoints.update(m => {
          if (!m.has(y)) {
            m.set(y, [])
            m.set(-y, [])
          }
          m.get(y)!.push(data)
          if (y != 0n) m.get(-y)!.push(data)
          return m
        })
      }
    }),
    worker.postMessage(curve.f.add(-y * y)),
  ])
  computingStatus.update(s => (s.integralPointsDone.add(y), s))
}

async function computeSquarableFactor(curve: EllipticCurve) {
  const worker = new nagellLutzFactorsWorker()
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      workers.push({ worker, reject })
      worker.onmessage = event => {
        const data: bigint | null = event.data
        if (data == null) {
          worker.terminate()
          resolve()
          return
        }
        yCandidates.update(y => (y.push(data), y))
        computeIntegralPointTasks.push(data)
      }
    }),
    worker.postMessage(abs(curve.discriminant)),
  ])
  computingStatus.update(s => ((s.yCandidatesDone = true), s))
}

export async function compute(curve: EllipticCurve) {
  computingStatus.set({ yCandidatesDone: false, integralPointsDone: new Set(), allDone: false })
  yCandidates.set([0n])
  integralPoints.set(new Map())
  computeIntegralPointTasks = queue(async (y: bigint) => await computeIntegralPoints(curve, y), 16)
  computeIntegralPointTasks.push(0n)
  await computeSquarableFactor(curve)
  await computeIntegralPointTasks.drain()
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
        range: [start - delta / 100, end + delta / 10],
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

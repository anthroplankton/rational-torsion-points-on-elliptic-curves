import { nagellLutzFactors } from '../math'

self.onmessage = (event: MessageEvent) => {
  const n: bigint = event.data
  for (const d of nagellLutzFactors(n)) {
    postMessage(d)
  }
  postMessage(null)
}

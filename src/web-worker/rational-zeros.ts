import { Cubic } from '../polynomials'

self.onmessage = (event: MessageEvent) => {
  const cubic: bigint[] = event.data
  for (const x of new Cubic(...cubic).rationalZeros()) {
    postMessage(x)
  }
  postMessage(null)
}

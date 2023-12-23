import { Cubic } from '../polynomials'

onmessage = (event: MessageEvent) => {
  const cubic: bigint[] = event.data
  for (const x of new Cubic(...cubic).rationalZeros()) {
    postMessage(x)
  }
  postMessage(null)
}

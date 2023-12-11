import fs from 'node:fs/promises'
import { format } from 'prettier'
import logger from '../src/logger'

const path = './public/primes.json'
const bound = 1000_0000

class Bitset {
  private arr: Uint8Array

  constructor(size: number) {
    this.arr = new Uint8Array((size >> 3) + 1)
  }

  get(index: number) {
    const shift = index & 7
    index >>= 3
    return this.arr[index] & (1 << shift)
  }

  set(index: number) {
    const shift = index & 7
    index >>= 3
    return (this.arr[index] |= 1 << shift)
  }
}

function linearSieve(bound: number) {
  const primes = [2]
  const sieve = new Bitset(bound >> 1)
  for (let i = 3; i < bound; i += 2) {
    if (!sieve.get(i >> 1)) {
      primes.push(i)
    }
    for (let j = 1; i * primes[j] < bound; ++j) {
      sieve.set((i * primes[j]) >> 1)
      if (i % primes[j] == 0) break
    }
  }
  return primes
}

export async function generateJSON() {
  logger.debug('generate primes to json file')
  try {
    await fs.access(path, fs.constants.R_OK)
    logger.debug('json file already exists')
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code != 'ENOENT') {
      logger.error('cannot access json file')
      return
    }
    const primes = linearSieve(bound)
    await fs.writeFile(path, await format(JSON.stringify(primes), { parser: 'json' }))
  }
}

export function abs(n: bigint) {
  return n > 0n ? n : -n
}

export function* factors(n: bigint) {
  n = abs(n)
  const m = isqrt(n)
  for (let d = 1n; d <= m; d += 1n) {
    if (n % d == 0n) {
      yield d
      yield -d
      if (d == n / d) return
      yield n / d
      yield -n / d
    }
  }
}

export function isclose(a: number, b: number, atol = 1e-8, rtol = 1e-5) {
  return Math.abs(a - b) <= atol + rtol * Math.abs(b)
}

export function isqrt(n: bigint) {
  if (n < 0n) return 0n
  let left = 0n
  let right = n + 1n
  while (left != right - 1n) {
    const m = (left + right) >> 1n
    if (m * m < n) left = m
    else if (m * m > n) right = m
    else return m
  }
  return left
}

export function* nagellLutzFactors(n: bigint) {
  for (let d0 = 1n, d1 = 1n; d0 <= n; d0 += d1 += 2n) {
    if (n % d0 == 0n) {
      yield (d1 + 1n) >> 1n
    }
  }
}

const primesJSONPath = '/primes.json'
let prinms: number[]
export const prime = {
  async list() {
    const resp = await fetch(primesJSONPath)
    prinms = await resp.json()
    return prinms
  },
}

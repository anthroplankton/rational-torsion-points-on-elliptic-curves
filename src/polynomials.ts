import { chain } from 'lodash'
import { factors, isclose, solve_quadratic } from './math'

export class Polynomial extends Array<bigint> {
  add(other: bigint): Polynomial
  add(other: Polynomial): Polynomial
  add(other: Polynomial | bigint) {
    if (typeof other == 'object') {
      const [shorter, longer] = Polynomial.sort(this, other)
      return new Polynomial(...longer.map((longer, i) => (i < shorter.length ? longer + shorter[i] : longer)))
    } else {
      return new Polynomial(this[0] + other, ...this.slice(1))
    }
  }

  apply(x: bigint): bigint
  apply(x: number): number
  apply<T extends bigint | number>(x: T) {
    if (typeof x == 'bigint') {
      let p = 0n
      for (let i = this.length - 1; i > -1; --i) {
        p = p * x + this[i]
      }
      return p
    } else {
      let p = 0
      for (let i = this.length - 1; i > -1; --i) {
        p = p * x + Number(this[i])
      }
      return p
    }
  }

  equal(other: Polynomial) {
    const [shorter, longer] = Polynomial.sort(this, other)
    return chain(longer)
      .map((c, i) => (i < shorter.length ? c == shorter[i] : c == 0n))
      .every()
      .value()
  }

  *rationalZeros() {
    let i
    for (i = 0; i < this.length; ++i) {
      if (this[i] != 0n) break
    }
    if (i == this.length) return
    if (i != 0) yield 0n
    for (const d of factors(this[i])) {
      if (this.apply(d) == 0n) yield d
    }
  }

  horner(x: number) {
    let df = 0
    let f = Number(this[this.length - 1])
    for (let i = this.length - 2; i > -1; --i) {
      df = x * df + f
      f = x * f + Number(this[i])
    }
    return [f, df]
  }

  newton(x: number, iteration = 1 << 12) {
    for (let i = 0; i < iteration; ++i) {
      const [f, df] = this.horner(x)
      if (isclose(f, 0)) return x
      if (isclose(df, 0, 1e-8)) break
      const dx = f / df
      if (isclose(dx, 0)) return x
      x -= dx
    }
    throw TypeError(`bad initial approximation ${x} for ${this}`)
  }

  toString() {
    const str = this.map((c, i) =>
      c == 0n ? '' : `${c > 0n ? '+' : ''}${`${c == 1n && i > 0 ? '' : c}`}${i > 1 ? `x^{${i}}` : i > 0 ? 'x' : ''}`
    )
      .reverse()
      .join('')
      .substring(1)
    return str || '0'
  }

  static sort(...polynomials: Polynomial[]) {
    return polynomials.sort((a, b) => a.length - b.length)
  }
}

export class Cubic extends Polynomial {
  zeros() {
    const [d, c, b, a] = this.map(Number)
    let x0
    try {
      const x = b / -3 / a
      x0 = this.newton(x)
    } catch {
      const x = Math.abs(d) ** 0.3 / a
      x0 = this.newton(x)
    }
    const aa = a
    const bb = aa * x0 + b
    const cc = bb * x0 + c
    return [x0, ...solve_quadratic(cc, bb, aa)]
  }

  criticals() {
    const [, c, b, a] = this.map(Number)
    return solve_quadratic(c, 2 * b, 3 * a)
  }

  inflections() {
    const [, , b, a] = this.map(Number)
    return b / -3 / a
  }
}

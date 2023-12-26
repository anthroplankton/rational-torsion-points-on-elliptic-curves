import lo from 'lodash'
import { factors, isclose } from './math'

export class Polynomial<T extends bigint | number> extends Array<T> {
  add(other: T): Polynomial<T>
  add(other: T[]): Polynomial<T>
  add(other: T[] | T) {
    const coefficients = lo(this)
      .zipWith(other instanceof Array ? other : [other], (t, o) => {
        t = t ?? 0n
        o = o ?? 0n
        return typeof t == 'bigint' && typeof o == 'bigint' ? t + o : Number(t) + Number(o)
      })
      .value()
    return new Polynomial(...coefficients)
  }

  sub(other: T): Polynomial<T>
  sub(other: T[]): Polynomial<T>
  sub(other: T[] | T) {
    const coefficients = lo(this)
      .zipWith(typeof other == 'object' ? other : [other], (t, o) => {
        t = t ?? 0n
        o = o ?? 0n
        return typeof t == 'bigint' && typeof o == 'bigint' ? t - o : Number(t) - Number(o)
      })
      .value()
    return new Polynomial(...coefficients)
  }

  private isWithBigintCoefficients(): this is Polynomial<bigint> {
    return lo(this).every(c => typeof c == 'bigint')
  }

  apply(x: bigint): T
  apply(x: number): number
  apply(x: bigint | number) {
    if (typeof x == 'bigint' && this.isWithBigintCoefficients()) {
      let p = 0n
      for (let i = this.length - 1; i > -1; --i) {
        p = p * x + this[i]
      }
      return p
    } else {
      let p = 0
      for (let i = this.length - 1; i > -1; --i) {
        p = p * Number(x) + Number(this[i])
      }
      return p
    }
  }
  equal(other: Polynomial<T>) {
    return lo(this)
      .zipWith(other, (t, o) => (t ?? 0n) == (o ?? 0n))
      .every()
  }

  *rationalZeros() {
    if (!this.isWithBigintCoefficients()) return
    let i = 0
    for (; i < this.length; ++i) {
      if (this[i] != 0n) break
    }
    if (i == this.length) return
    if (i != 0) yield 0n
    for (const d of factors(BigInt(this[i]))) {
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
      if (isclose(df, 0, 1e-12)) break
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
}

export class Cubic<T extends bigint | number> extends Polynomial<T> {
  constructor(...coefficients: [T, T, T, T]) {
    super(...coefficients)
  }

  override add(other: T): Cubic<T>
  override add(other: Cubic<T>): Cubic<T>
  override add(other: T[]): Polynomial<T>
  override add(other: T[] | T) {
    return super.add(other instanceof Array ? other : [other])
  }

  override sub(other: T): Cubic<T>
  override sub(other: Cubic<T>): Cubic<T>
  override sub(other: T[]): Polynomial<T>
  override sub(other: T[] | T) {
    return super.sub(other instanceof Array ? other : [other])
  }

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
    return [x0, ...new Quadratic(cc, bb, aa).zeros()]
  }

  criticals() {
    const [, c, b, a] = this.map(Number)
    return new Quadratic(c, 2 * b, 3 * a).zeros()
  }

  inflections() {
    const [, , b, a] = this.map(Number)
    return b / -3 / a
  }
}

export class Quadratic<T extends bigint | number> extends Polynomial<T> {
  constructor(...coefficients: [T, T, T]) {
    super(...coefficients)
  }

  zeros() {
    const [c, b, a] = this.map(Number)
    const d = b * b - 4 * a * c
    if (d < 0) return []
    const s0 = b + Math.sqrt(d)
    const s1 = b - Math.sqrt(d)
    const x0 = isclose(s0, 0) ? s1 / -2 / a : (-2 * c) / s0
    const x1 = isclose(s1, 0) ? s0 / -2 / a : (-2 * c) / s1
    return [x0, x1]
  }
}

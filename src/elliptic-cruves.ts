import { Cubic, Quadratic } from './polynomials'

export class EllipticCurve {
  readonly a: bigint
  readonly b: bigint
  readonly c: bigint
  readonly f: Cubic<bigint>
  readonly df: Quadratic<bigint>

  constructor(c: bigint, b: bigint, a: bigint) {
    this.a = a
    this.b = b
    this.c = c
    this.f = new Cubic(c, b, a, 1n)
    this.df = new Quadratic(b, a + a, 3n)
  }

  get discriminant() {
    const { a, b, c } = this
    return -4n * a ** 3n * c + a * a * b * b + 18n * a * b * c - 4n * b ** 3n - 27n * c * c
  }

  slope(p: Point, q: Point) {
    const { a, b } = this
    const [y0, y1] = [p.y, q.y]
    const y2 = y0 + y1
    const [x0, x1] = [p.x, q.x]
    const [x2, x3] = [x0 + x1, x0 * x1]
    const df = (x2 + a) * x2 + b - x3
    return [df, y2]
  }

  sum(p: ExtendedPoint, q: ExtendedPoint): ExtendedPoint {
    if (p == origin) {
      return q
    }
    if (q == origin) {
      return p
    }
    const [y0, y1] = [p.y, q.y]
    const y2 = y0 + y1
    if (y2 == 0n) {
      return origin
    }
    const { a, b, c } = this
    const [x0, x1] = [p.x, q.x]
    const [x2, x3] = [x0 + x1, x0 * x1]
    const df = (x2 + a) * x2 + b - x3
    const m = df / y2
    const x = m * m - a - x2
    const y = ((x2 + a) * x3 - y0 * y1 - c) / y2 - m * x
    return new Point(x, y)
  }

  equal(other: EllipticCurve) {
    return this.f.equal(other.f)
  }

  toString() {
    return `y^2=${this.f}`
  }
}

export class Point {
  readonly x: bigint
  readonly y: bigint
  constructor(x: bigint, y: bigint) {
    this.x = x
    this.y = y
  }
}

export const origin = Symbol('O')
export type Origin = typeof origin
export type ExtendedPoint = Point | Origin

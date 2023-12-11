import { Cubic } from './polynomials'

export class EllipticCurve {
  readonly a: bigint
  readonly b: bigint
  readonly c: bigint
  readonly f: Cubic

  constructor(c: bigint, b: bigint, a: bigint) {
    this.a = a
    this.b = b
    this.c = c
    this.f = new Cubic(c, b, a, 1n)
  }

  get discriminant() {
    const { a, b, c } = this
    return -4n * a * a * a * c + a * a * b * b + 18n * a * b * c - 4n * b * b * b - 27n * c * c
  }

  equal(other: EllipticCurve) {
    return this.f.equal(other.f)
  }

  toString() {
    return `y^2=${this.f}`
  }
}

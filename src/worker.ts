import { reject } from 'lodash'

export type Item<T> = {
  value: T
  next: Item<T> | null
}

export class Queue<T> {
  private head: Item<T> | null = null
  private tail: Item<T> | null = null
  #length: number = 0
  get length() {
    return this.#length
  }
  push(value: T) {
    const next = {
      value,
      next: null,
    }
    if (this.tail) {
      this.tail = this.tail.next = next
    } else {
      this.tail = this.head = next
    }
    return (this.#length += 1)
  }
  shift() {
    if (this.head) {
      const value = this.head.value
      this.head = this.head.next
      this.#length -= 1
      return value
    }
  }
}

export class Chan<T> {
  private queue = new Queue<T>()
  private resolverQueue = new Queue<(value: T) => void>()
  private rejectionQueue = new Queue<(reason: string) => void>()
  #isClose = false
  get isClose() {
    return this.#isClose
  }
  put(value: T) {
    const resolve = this.resolverQueue.shift()
    this.rejectionQueue.shift()
    if (resolve) {
      resolve(value)
    } else if (this.#isClose) {
      throw TypeError('cannot put value to close channel')
    } else {
      this.queue.push(value)
    }
  }
  get() {
    const value = this.queue.shift()
    if (value) {
      return Promise.resolve(value)
    } else if (this.#isClose) {
      throw TypeError('cannot get value from close channel')
    } else {
      return new Promise<T>((res, rej) => {
        this.resolverQueue.push(res)
        this.rejectionQueue.push(rej)
      })
    }
  }
  close() {
    this.#isClose = true
    do {
      const reject = this.rejectionQueue.shift()
      this.resolverQueue.shift()
      reject && reject('channel is close')
    } while (reject)
  }
  async *[Symbol.asyncIterator]() {
    while (this.queue.length || !this.#isClose) {
      try {
        yield await this.get()
      } catch (err) {
        console.debug(err)
        return
      }
    }
  }
}

export class WorkerCluster<T, TResult> {
  readonly resultChan: Chan<TResult>
  readonly concurrency: number
  private taskChan = new Chan<T>()
  private workers: Worker[]
  private rejections: ((reason?: string) => void)[] = []
  constructor(Worker: new () => Worker, resultChan: Chan<TResult>, concurrency: number = 1) {
    this.resultChan = resultChan
    this.concurrency = concurrency
    this.workers = new Array(concurrency).map(() => new Worker())
  }
  process() {
    this.workers.forEach(async (worker, i) => {
      for await (const data of this.taskChan) {
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            this.rejections[i] = reject
            worker.onmessage = async event => {
              const data: TResult | null = event.data
              if (data == null) {
                resolve()
                return
              }
              this.resultChan.put(data)
            }
          }),
          worker.postMessage(data),
        ])
      }
    })
  }
  put(data: T) {
    this.taskChan.put(data)
  }
}

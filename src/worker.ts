import { queue, type QueueObject } from 'async'
import { range, times } from 'lodash'

export type PostMessage<TMessage, TResult> = (message: TMessage, callback: (result: TResult) => void) => Promise<void>
export type Executor<T, TMessage, TResult> = (task: T, execute: PostMessage<TMessage, TResult>) => Promise<void>

export class WorkerPool<T, TMessage, TResult> {
  private queue: QueueObject<T>
  private workers: Worker[]
  private rejections: ((reason?: string) => void)[]
  private idelWorkerIndexes: number[]
  constructor(Worker: new () => Worker, executor: Executor<T, TMessage, TResult>, concurrency: number = 1) {
    this.workers = times(concurrency, () => new Worker())
    this.rejections = times(concurrency, () => () => {})
    this.idelWorkerIndexes = range(concurrency)
    this.queue = queue(
      async (task: T) =>
        await executor(task, async (message, callback) => {
          const index = this.idelWorkerIndexes.pop()!
          const worker = this.workers[index]
          await Promise.all([
            new Promise<void>((resolve, reject) => {
              this.rejections[index] = reject
              worker.onmessage = event => {
                const result = event.data
                if (event.data == null) {
                  resolve()
                } else {
                  callback(result)
                }
              }
            }),
            worker.postMessage(message),
          ])
          this.idelWorkerIndexes.push(index)
        }),
      concurrency
    )
  }
  async drain() {
    if (this.queue.workersList.length != 0) {
      await this.queue.drain()
    }
  }
  async put(task: T) {
    await this.queue.push(task)
  }
  terminate() {
    this.queue.kill()
    for (const worker of this.workers) {
      worker.terminate()
    }
    for (const reject of this.rejections) {
      reject('stop')
    }
  }
}

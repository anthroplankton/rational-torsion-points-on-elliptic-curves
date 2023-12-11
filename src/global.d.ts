declare module 'MathJax' {
  const MathJax: { typesetPromise(elements?: HTMLElement[]): Promise<void> }
  export default MathJax
}

declare module 'worker:*' {
  const WorkerFactory: new () => Worker
  export default WorkerFactory
}

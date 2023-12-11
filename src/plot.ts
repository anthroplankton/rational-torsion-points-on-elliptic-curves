import { findIndex, map, omit, pick, range } from 'lodash'
import Plotly from 'plotly.js'
import { get, readonly, writable } from 'svelte/store'
import type { PlotlyHTMLElement } from 'plotly.js'

const style = getComputedStyle(document.body)
export const theme = {
  transparent: 'rgba(0,0,0,0)',
  body: style.getPropertyValue('--bs-body-color'),
  secondary: style.getPropertyValue('--bs-secondary-color'),
  tertiary: style.getPropertyValue('--bs-tertiary-color'),
  bodybg: style.getPropertyValue('--bs-body-bg'),
  secondarybg: style.getPropertyValue('--bs-secondary-bg'),
  tertiarybg: style.getPropertyValue('--bs-tertiary-bg'),
}

export const plotStore = writable<PlotlyHTMLElement>()

const nPoints = 600

const layout: Partial<Plotly.Layout> = {
  dragmode: 'pan',
  margin: { t: 0, r: 0, b: 0, l: 0 },
  modebar: { orientation: 'v' },
  showlegend: false,
  plot_bgcolor: theme.transparent,
  paper_bgcolor: theme.transparent,
  xaxis: {
    // automargin: true,
    color: theme.body,
    exponentformat: 'e',
    gridcolor: theme.tertiarybg,
    zerolinecolor: theme.secondary,
  },
  yaxis: {
    // automargin: true,
    color: theme.body,
    exponentformat: 'e',
    gridcolor: theme.tertiarybg,
    zerolinecolor: theme.secondary,
  },
}

const config: Partial<Plotly.Config> = { responsive: true, scrollZoom: true }

type PlotlyData = Plotly.Data & { uid?: string }
type ResponsiveData = {
  range?: [start: number, end: number]
  x: (linspace: number[]) => Plotly.Datum[]
  y: (linspace: number[]) => Plotly.Datum[]
} & {
  [k in keyof Plotly.PlotData as Exclude<k, 'x' | 'y'>]?: Plotly.PlotData[k]
}
type Data = PlotlyData | ResponsiveData

async function newPlot(root: HTMLElement) {
  plotStore.set(await Plotly.newPlot(root, [], layout, config))
  const xaxislayer = root.querySelector('.xaxislayer-above')
  const yaxislayer = root.querySelector('.yaxislayer-above')
  if (xaxislayer) {
    new ResizeObserver(entries => {
      const { height } = entries[0].contentRect
      xaxislayer.setAttribute('transform', `translate(0, ${-height})`)
    }).observe(xaxislayer)
  }
  if (yaxislayer) {
    new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      yaxislayer.setAttribute('transform', `translate(${width}, 0)`)
    }).observe(yaxislayer)
  }
  return get(plotStore)
}

function isResponsiveData(trace: Data): trace is ResponsiveData {
  return 'y' in trace && typeof trace.y == 'function'
}

async function plot(
  traces: Data | Data[],
  options: { relayout?: boolean; reset?: boolean } = { relayout: false, reset: false }
) {
  traces = traces instanceof Array ? traces : [traces]
  const responsives = traces.filter(isResponsiveData).map(t => pick(t, 'x', 'y', 'uid'))
  const nomrals = traces.map(trace => {
    if (!isResponsiveData(trace)) return trace
    if (!trace.range) return omit(trace, 'x', 'y')
    const [start, end] = trace.range
    const t = range(start, end, (end - start) / nPoints)
    const x = trace.x(t)
    const y = trace.y(t)
    return Object.assign({}, trace, { x, y })
  })
  const plot = get(plotStore)
  if (options.reset) {
    plot.removeAllListeners('plotly_relayout')
    await Plotly.react(plot, nomrals, layout, config)
  } else {
    await Plotly.addTraces(plot, nomrals)
  }
  if (options.relayout) {
    await Plotly.relayout(plot, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    })
  }
  plot.on('plotly_relayout', async event => {
    const start = event['xaxis.range[0]']
    const end = event['xaxis.range[1]']
    if (!start || !end) return
    const nomrals = responsives.map(trace => {
      const uid = trace.uid
      const t = range(start, end, (end - start) / nPoints)
      const x = trace.x(t)
      const y = trace.y(t)
      return { x, y, uid }
    })
    await update(nomrals)
  })
  return plot
}

async function update(traces: PlotlyData | PlotlyData[]) {
  traces = traces instanceof Array ? traces : [traces]
  const plot = get(plotStore)
  const traceIndices = traces.map(t => findIndex(plot.data, { uid: t.uid }))
  const update = { x: map(traces, 'x'), y: map(traces, 'y') }
  await Plotly.update(plot, update, {}, traceIndices)
}

export default Object.assign(readonly(plotStore), { newPlot, plot, update })

"use client"

import dynamic from "next/dynamic"
import type { PlotParams } from "react-plotly.js"

const Plot = dynamic(() => import("@/components/plots/plotly-client"), { ssr: false })

export type PlotlyChartProps = PlotParams

export function PlotlyChart(props: PlotlyChartProps) {
  return <Plot {...props} />
}

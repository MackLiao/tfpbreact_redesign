"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import type { Config, Data, Layout, ModeBarDefaultButtons } from "plotly.js"
import type { CorrelationMatrixResponse } from "@/lib/types"

const Plot = dynamic(() => import("@/components/plots/plotly-client"), { ssr: false })

const HEATMAP_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "lasso2d", "autoScale2d"] as ModeBarDefaultButtons[],
}

// Blues color scale matching the Python implementation (plotly Blues)
const BLUES_SCALE: [number, string][] = [
  [0, "#f7fbff"],
  [0.125, "#deebf7"],
  [0.25, "#c6dbef"],
  [0.375, "#9ecae1"],
  [0.5, "#6baed6"],
  [0.625, "#4292c6"],
  [0.75, "#2171b5"],
  [0.875, "#08519c"],
  [1, "#08306b"],
]

interface CorrelationHeatmapProps {
  correlationData: CorrelationMatrixResponse | null
  title?: string
  minHeight?: string
}

export function CorrelationHeatmap({
  correlationData,
  title = "Clustered TF Correlation Matrix",
  minHeight = "520px",
}: CorrelationHeatmapProps) {
  const heatmapData = useMemo<Data[] | null>(() => {
    if (!correlationData || !correlationData.matrix.length || !correlationData.labels.length) {
      return null
    }

    const zmin = 0
    const zmax = 1

    const heatmap: Data = {
      type: "heatmap",
      z: correlationData.matrix,
      x: correlationData.labels,
      y: correlationData.labels,
      colorscale: BLUES_SCALE,
      zmin,
      zmax,
      hovertemplate: "<b>%{y}</b> vs <b>%{x}</b><br>Correlation: %{z:.2f}<extra></extra>",
      showscale: true,
      colorbar: {
        title: {
          text: "Correlation",
          font: {
            size: 12,
          },
        },
        tickformat: ".2f",
        tickvals: [0.0, 0.25, 0.5, 0.75, 1.0],
        ticks: "outside",
        len: 0.8,
        thickness: 15,
        x: 1.02,
      },
    }
    return [heatmap]
  }, [correlationData])

  const heatmapLayout = useMemo<Partial<Layout> | undefined>(() => {
    if (!correlationData) return undefined
    return {
      title: {
        text: title,
        font: {
          size: 16,
          color: "#1f2937",
        },
        x: 0.5,
        xanchor: "center",
      },
      xaxis: {
        tickangle: 45,
        automargin: true,
        showgrid: false,
        side: "bottom",
        tickfont: {
          size: 8,
        },
      },
      yaxis: {
        automargin: true,
        showgrid: false,
        tickfont: {
          size: 8,
        },
      },
      margin: { l: 60, r: 60, t: 50, b: 60 },
      height: 520,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    }
  }, [correlationData, title])

  if (!heatmapData || !heatmapLayout) {
    return null
  }

  return (
    <Plot
      data={heatmapData}
      layout={heatmapLayout}
      config={HEATMAP_CONFIG}
      style={{ width: "100%", height: "100%", minHeight }}
      useResizeHandler
    />
  )
}

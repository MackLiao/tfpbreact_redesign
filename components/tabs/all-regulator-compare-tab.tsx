"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import type { Data, Layout, Config, ModeBarDefaultButtons } from "plotly.js"
import { PlotlyChart } from "@/components/plots/plotly-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react"

import type { RankResponseMetadataRow } from "@/lib/types"
import {
  BINDING_SOURCE_MAP,
  PERTURBATION_SOURCE_MAP,
  getBindingSourceLabel,
  getPerturbationSourceLabel,
  negLog10Transform,

} from "@/lib/utils"
import { useRankResponseMetadata } from "@/lib/hooks/use-rank-response-metadata"

const COLOR_PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
]

type DistributionFigure = { data: Data[]; layout: Partial<Layout> }

interface DistributionOptions {
  valueSelector: (row: RankResponseMetadataRow) => number | null
  yAxisTitle: string
  valueFormat?: string
  tickFormat?: string
}

const buildDistributionFigure = (
  rows: RankResponseMetadataRow[],
  { valueSelector, yAxisTitle, valueFormat = ".3f", tickFormat }: DistributionOptions,
): DistributionFigure | null => {
  const prepared = rows
    .map((row) => ({ row, value: valueSelector(row) }))
    .filter((entry): entry is { row: RankResponseMetadataRow; value: number } => {
      return entry.value !== null && Number.isFinite(entry.value)
    })

  if (!prepared.length) {
    return null
  }

  const bindingLabels = Array.from(
    new Set(
      prepared.map(({ row }) => row.bindingSourceLabel ?? getBindingSourceLabel(row.bindingSource) ?? row.bindingSource),
    ),
  )

  const colorMap = new Map(
    bindingLabels.map((label, index) => [label, COLOR_PALETTE[index % COLOR_PALETTE.length]]),
  )

  const expressionGroups = new Map<string, { label: string; rows: typeof prepared }>()
  prepared.forEach((entry) => {
    const label =
      entry.row.expressionSourceLabel ??
      getPerturbationSourceLabel(entry.row.expressionSource) ??
      entry.row.expressionSource

    const stored = expressionGroups.get(entry.row.expressionSource)
    if (stored) {
      stored.rows.push(entry)
    } else {
      expressionGroups.set(entry.row.expressionSource, { label, rows: [entry] })
    }
  })

  const traces: Data[] = []
  const annotations: NonNullable<Layout["annotations"]> = []
  const columns = Math.max(1, expressionGroups.size)

  const layout: Partial<Layout> & Record<string, unknown> = {
    boxmode: "group",
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    height: 520,
    margin: { l: 70, r: 36, t: 86, b: 64 },
    font: { family: "Inter, system-ui, sans-serif", size: 12, color: "#111827" },
    legend: { orientation: "h", x: 0, y: 1.1 },
    hovermode: "closest",
    grid: { rows: 1, columns, pattern: "independent" },
  }

  let columnIndex = 0
  expressionGroups.forEach(({ label, rows: groupRows }) => {
    const axisSuffix = columnIndex === 0 ? "" : columnIndex + 1
    const xAxisRef = columnIndex === 0 ? "x" : `x${columnIndex + 1}`
    const yAxisRef = columnIndex === 0 ? "y" : `y${columnIndex + 1}`
    const xAxisKey = columnIndex === 0 ? "xaxis" : `xaxis${columnIndex + 1}`
    const yAxisKey = columnIndex === 0 ? "yaxis" : `yaxis${columnIndex + 1}`

    bindingLabels.forEach((bindingLabel) => {
      const series = groupRows
        .filter(({ row }) => (row.bindingSourceLabel ?? getBindingSourceLabel(row.bindingSource) ?? row.bindingSource) === bindingLabel)
        .map(({ value }) => value)

      if (!series.length) return

      traces.push({
        type: "box",
        y: series,
        name: bindingLabel,
        boxpoints: "outliers",
        marker: { color: colorMap.get(bindingLabel) },
        legendgroup: bindingLabel,
        showlegend: columnIndex === 0,
        xaxis: xAxisRef,
        yaxis: yAxisRef,
        hovertemplate: `${bindingLabel}<br>%{y:${valueFormat}}<extra></extra>`,
      })
    })

    const sharedAxisConfig = {
      showgrid: true,
      gridcolor: "#E5E7EB",
      zeroline: false,
      automargin: true,
      linecolor: "#111827",
      linewidth: 1,
      mirror: true,
    }

    ;(layout as Record<string, unknown>)[xAxisKey] = {
      ...sharedAxisConfig,
      title: columnIndex === 0 ? "Binding Data Source" : undefined,
      tickangle: bindingLabels.length > 3 ? -30 : 0,
    }

    ;(layout as Record<string, unknown>)[yAxisKey] = {
      ...sharedAxisConfig,
      title: columnIndex === 0 ? yAxisTitle : undefined,
      tickformat: tickFormat ?? undefined,
    }

    const columnWidth = 1 / columns
    annotations.push({
      text: label,
      x: columnIndex * columnWidth + columnWidth / 2,
      xref: "paper",
      y: 1.06,
      yref: "paper",
      showarrow: false,
      font: { size: 13, color: "#111827" },
    })

    columnIndex += 1
  })

  layout.annotations = annotations

  return { data: traces, layout }
}

const DEFAULT_PLOT_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["select2d", "lasso2d"] as ModeBarDefaultButtons[],
}

const MessageState = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) => (
  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2 text-center">
    <div className="p-3 rounded-full bg-muted/60 text-muted-foreground/80">{icon}</div>
    <p className="text-sm font-medium text-foreground/80">{title}</p>
    {description ? <p className="text-xs max-w-sm leading-relaxed">{description}</p> : null}
  </div>
)

export default function AllRegulatorCompareTab() {
  const { data: metadata, isLoading, error } = useRankResponseMetadata()
  const [onlySharedRegulators, setOnlySharedRegulators] = useState(true)
  const [selectedBindingSources, setSelectedBindingSources] = useState<string[]>([])
  const [selectedPerturbationSources, setSelectedPerturbationSources] = useState<string[]>([])
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  useEffect(() => {
    if (!metadata.length) return

    setSelectedBindingSources((prev) => {
      if (prev.length) return prev
      const ids = Array.from(new Set(metadata.map((row) => row.bindingSource))).filter(Boolean)
      return ids
    })

    setSelectedPerturbationSources((prev) => {
      if (prev.length) return prev
      const ids = Array.from(new Set(metadata.map((row) => row.expressionSource))).filter(Boolean)
      return ids
    })
  }, [metadata])

  const bindingOptions = useMemo(() => {
    if (!metadata.length) {
      return Object.entries(BINDING_SOURCE_MAP)
    }
    const map = new Map<string, string>()
    metadata.forEach((row) => {
      if (!row.bindingSource) return
      const label = row.bindingSourceLabel ?? getBindingSourceLabel(row.bindingSource) ?? row.bindingSource
      map.set(row.bindingSource, label)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [metadata])

  const perturbationOptions = useMemo(() => {
    if (!metadata.length) {
      return Object.entries(PERTURBATION_SOURCE_MAP)
    }
    const map = new Map<string, string>()
    metadata.forEach((row) => {
      if (!row.expressionSource) return
      const label =
        row.expressionSourceLabel ??
        getPerturbationSourceLabel(row.expressionSource) ??
        row.expressionSource
      map.set(row.expressionSource, label)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [metadata])

  const hasSelections = selectedBindingSources.length > 0 && selectedPerturbationSources.length > 0

  const filteredMetadata = useMemo(() => {
    if (!metadata.length || !hasSelections) return []

    let rows = metadata.filter(
      (row) =>
        selectedBindingSources.includes(row.bindingSource) &&
        selectedPerturbationSources.includes(row.expressionSource),
    )

    if (!rows.length) return []

    if (onlySharedRegulators) {
      const combinationMap = new Map<string, Set<string>>()
      rows.forEach((row) => {
        const key = `${row.bindingSource}__${row.expressionSource}`
        const set = combinationMap.get(key)
        if (set) {
          set.add(row.regulatorSymbol)
        } else {
          combinationMap.set(key, new Set([row.regulatorSymbol]))
        }
      })

      if (combinationMap.size) {
        let shared: Set<string> | null = null
        combinationMap.forEach((set) => {
          shared = shared
            ? new Set(Array.from(shared).filter((symbol) => set.has(symbol)))
            : new Set(set)
        })

        const sharedArray = shared ? Array.from(shared) : []
        if (sharedArray.length === 0) {
          rows = []
        } else {
          rows = rows.filter((row) => sharedArray.includes(row.regulatorSymbol))
        }
      }
    }

    return rows
  }, [
    metadata,
    hasSelections,
    selectedBindingSources,
    selectedPerturbationSources,
    onlySharedRegulators,
  ])

  const rankFigure = useMemo(() => {
    if (!filteredMetadata.length) return null
    return buildDistributionFigure(filteredMetadata, {
      valueSelector: (row) => (typeof row.rank25 === "number" ? row.rank25 : null),
      yAxisTitle: "Responsive Fraction (Top 25 Targets)",
      valueFormat: ".0%",
      tickFormat: ".0%",
    })
  }, [filteredMetadata])

  const dtoFigure = useMemo(() => {
    if (!filteredMetadata.length) return null
    const dtoRows = filteredMetadata.filter((row) => typeof row.dtoEmpiricalPvalue === "number")
    if (!dtoRows.length) return null

    const transformed = negLog10Transform(dtoRows.map((row) => row.dtoEmpiricalPvalue as number))
    type DtoRow = RankResponseMetadataRow & { dtoTransformed: number | null }
    const augmented: DtoRow[] = dtoRows.map((row, index) => ({
      ...row,
      dtoTransformed: transformed[index] ?? null,
    }))

    return buildDistributionFigure(augmented, {
      valueSelector: (row) => (row as DtoRow).dtoTransformed ?? null,
      yAxisTitle: "-log10(DTO Empirical P-value)",
      valueFormat: ".2f",
      tickFormat: ".2f",
    })
  }, [filteredMetadata])

  const univariateFigure = useMemo(() => {
    if (!filteredMetadata.length) return null
    return buildDistributionFigure(filteredMetadata, {
      valueSelector: (row) => (typeof row.univariatePvalue === "number" ? row.univariatePvalue : null),
      yAxisTitle: "Univariate P-value",
      valueFormat: ".2e",
      tickFormat: ".2e",
    })
  }, [filteredMetadata])

  const renderPlotContent = (figure: DistributionFigure | null, emptyMessage: string) => {
    if (isLoading) {
      return (
        <MessageState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading metadata"
          description="Fetching rank response distributions from the API."
        />
      )
    }

    if (error) {
      return (
        <MessageState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Unable to load data"
          description={error}
        />
      )
    }

    if (!hasSelections) {
      return (
        <MessageState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Select at least one binding and perturbation source"
          description="Use the sidebar filters to choose the datasets you would like to compare."
        />
      )
    }

    if (!filteredMetadata.length || !figure) {
      return (
        <MessageState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="No matching records"
          description={emptyMessage}
        />
      )
    }

    return (
      <PlotlyChart
        data={figure.data}
        layout={figure.layout}
        config={DEFAULT_PLOT_CONFIG}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    )
  }

  return (
    <div className="flex gap-6 h-full">
      <aside
        className={`shrink-0 transition-all duration-300 ease-in-out ${isPanelCollapsed ? "w-12" : "w-80"} relative`}
      >
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-4 z-10 h-7 w-7 rounded-full bg-white shadow-md border-border hover:bg-secondary"
          onClick={() => setIsPanelCollapsed((prev) => !prev)}
        >
          {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className={`${isPanelCollapsed ? "hidden" : "block"}`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="multiple" defaultValue={["general", "binding", "perturbation"]}>
              <AccordionItem value="general" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">General</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <Switch
                      id="shared-regulators"
                      checked={onlySharedRegulators}
                      onCheckedChange={(checked) => setOnlySharedRegulators(Boolean(checked))}
                    />
                    <Label htmlFor="shared-regulators" className="cursor-pointer text-sm font-medium leading-relaxed">
                      Only Show Shared Regulators
                    </Label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="binding" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Binding Data Sources</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">Select binding sources:</p>
                  <div className="space-y-2">
                    {bindingOptions.map(([id, label]) => (
                      <div
                        key={id}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`binding-${id}`}
                          checked={selectedBindingSources.includes(id)}
                          onCheckedChange={(checked) => {
                            setSelectedBindingSources((prev) => {
                              if (checked) {
                                if (prev.includes(id)) return prev
                                return [...prev, id]
                              }
                              return prev.filter((value) => value !== id)
                            })
                          }}
                        />
                        <Label htmlFor={`binding-${id}`} className="text-sm cursor-pointer font-medium">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="perturbation" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Perturbation Response Sources</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">Select perturbation sources:</p>
                  <div className="space-y-2">
                    {perturbationOptions.map(([id, label]) => (
                      <div
                        key={id}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`perturbation-${id}`}
                          checked={selectedPerturbationSources.includes(id)}
                          onCheckedChange={(checked) => {
                            setSelectedPerturbationSources((prev) => {
                              if (checked) {
                                if (prev.includes(id)) return prev
                                return [...prev, id]
                              }
                              return prev.filter((value) => value !== id)
                            })
                          }}
                        />
                        <Label htmlFor={`perturbation-${id}`} className="text-sm cursor-pointer font-medium">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        {isPanelCollapsed && (
          <div className="flex items-center justify-center h-32 bg-card rounded-lg border border-border/60 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
              Filters
            </span>
          </div>
        )}
      </aside>

      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">All Regulator Comparison</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              This page displays distribution plots for Rank Response, Dual Threshold Optimization (DTO) empirical
              p-value, and Univariate p-value. Use the sidebar to select binding and perturbation response data sources,
              and optionally restrict the view to regulators shared across all selected datasets.
            </p>
          </div>

          <ul className="space-y-4 text-sm">
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">Rank Response:</strong>
              <span className="text-muted-foreground ml-1">
                Target genes are ranked by binding strength, and perturbation response is binarized into
                response/non-response. The distribution shows the proportion of genes labeled as responsive among the
                top 25 most strongly bound.
              </span>
            </li>
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">DTO empirical p-value:</strong>
              <span className="text-muted-foreground ml-1">
                DTO compares two ranked lists—typically binding and response—to find thresholds that minimize the
                hypergeometric p-value of their overlap. The empirical p-value reflects the rank overlap&apos;s extremity
                relative to a null distribution generated via permutation.
              </span>
            </li>
            <li className="leading-relaxed">
              <strong className="text-foreground font-semibold">Univariate p-value:</strong>
              <span className="text-muted-foreground ml-1">
                The p-value from an ordinary least squares (OLS) regression model that predicts perturbation response
                based on the binding score of a regulator.
              </span>
            </li>
          </ul>
        </div>

        <Tabs defaultValue="rank-response" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
            <TabsTrigger value="rank-response" className="text-sm font-medium">
              Rank Response
            </TabsTrigger>
            <TabsTrigger value="dto" className="text-sm font-medium">
              DTO
            </TabsTrigger>
            <TabsTrigger value="univariate" className="text-sm font-medium">
              Univariate P-value
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rank-response" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                {renderPlotContent(
                  rankFigure,
                  "No rank response values matched the selected datasets. Try broadening your filters.",
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dto" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                {renderPlotContent(
                  dtoFigure,
                  "No DTO empirical p-values are available for the current selection.",
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="univariate" className="mt-6">
            <Card className="shadow-sm border-border/60">
              <CardContent className="min-h-[500px] flex items-center justify-center pt-6">
                {renderPlotContent(
                  univariateFigure,
                  "No univariate p-values matched the selected datasets. Adjust filters to see more results.",
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

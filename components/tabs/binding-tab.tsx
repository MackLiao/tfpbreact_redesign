"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { useRankResponseMetadata } from "@/lib/hooks/use-rank-response-metadata"
import type { CorrelationMatrixResponse } from "@/lib/types"
import { getBindingSourceLabel } from "@/lib/utils"
import { CorrelationHeatmap } from "@/components/plots/correlation-heatmap"

const BINDING_SOURCES = [
  { id: "chipexo_pugh_allevents", label: "ChIP-exo (Pugh Lab)" },
  { id: "harbison_chip", label: "ChIP-chip (Young Lab)" },
  { id: "brent_nf_cc", label: "Calling Cards (Brent/Mitra Labs)" },
] as const

export default function BindingTab() {
  const { data: metadata, isLoading, error, sourceTimestamp, refresh } = useRankResponseMetadata()
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [correlationData, setCorrelationData] = useState<CorrelationMatrixResponse | null>(null)
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(true)
  const [correlationError, setCorrelationError] = useState<string | null>(null)

  const formattedTimestamp = useMemo(() => {
    if (!sourceTimestamp) return null
    const parsed = new Date(sourceTimestamp)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleString()
  }, [sourceTimestamp])

  const bindingSourceMap = useMemo(() => {
    const map = new Map<string, { label: string; regulators: Set<string> }>()
    metadata.forEach((row) => {
      if (!row.bindingSource) return
      const descriptiveLabel =
        row.bindingSourceLabel ??
        BINDING_SOURCES.find((source) => source.id === row.bindingSource)?.label ??
        getBindingSourceLabel(row.bindingSource) ??
        row.bindingSource
      const entry = map.get(row.bindingSource)
      if (entry) {
        entry.regulators.add(row.regulatorSymbol)
      } else {
        const regulators = new Set<string>()
        if (row.regulatorSymbol) {
          regulators.add(row.regulatorSymbol)
        }
        map.set(row.bindingSource, { label: descriptiveLabel, regulators })
      }
    })
    return map
  }, [metadata])

  const bindingOptions = useMemo(() => {
    if (bindingSourceMap.size === 0) {
      return BINDING_SOURCES.map((source) => ({ ...source }))
    }
    return Array.from(bindingSourceMap.entries())
      .map(([id, value]) => ({ id, label: value.label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [bindingSourceMap])

  const selectedSummaries = useMemo(() => {
    return selectedSources.map((id) => {
      const entry = bindingSourceMap.get(id)
      const fallbackLabel =
        entry?.label ??
        BINDING_SOURCES.find((source) => source.id === id)?.label ??
        getBindingSourceLabel(id) ??
        id
      const regulators = entry?.regulators ?? new Set<string>()
      return {
        id,
        label: fallbackLabel,
        regulators,
        regulatorCount: regulators.size,
      }
    })
  }, [selectedSources, bindingSourceMap])

  const intersectionSummaries = useMemo(() => {
    if (selectedSummaries.length < 2) return []

    const intersections: Array<{ label: string; count: number }> = []

    for (let i = 0; i < selectedSummaries.length - 1; i += 1) {
      for (let j = i + 1; j < selectedSummaries.length; j += 1) {
        const first = selectedSummaries[i]
        const second = selectedSummaries[j]
        let count = 0
        first.regulators.forEach((symbol) => {
          if (second.regulators.has(symbol)) {
            count += 1
          }
        })
        intersections.push({
          label: `${first.label} ∩ ${second.label}`,
          count,
        })
      }
    }

    if (selectedSummaries.length === 3) {
      const [a, b, c] = selectedSummaries
      let tripleCount = 0
      a.regulators.forEach((symbol) => {
        if (b.regulators.has(symbol) && c.regulators.has(symbol)) {
          tripleCount += 1
        }
      })
      intersections.push({
        label: `${a.label} ∩ ${b.label} ∩ ${c.label}`,
        count: tripleCount,
      })
    }

    return intersections
  }, [selectedSummaries])

  const combinedRegulatorCount = useMemo(() => {
    if (selectedSummaries.length === 0) return 0
    const union = new Set<string>()
    selectedSummaries.forEach((summary) => {
      summary.regulators.forEach((symbol) => union.add(symbol))
    })
    return union.size
  }, [selectedSummaries])

  const hasSelectedData = selectedSummaries.some((summary) => summary.regulatorCount > 0)

  const fetchCorrelationMatrix = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsCorrelationLoading(true)
        setCorrelationError(null)
        const response = await fetch("/api/correlation/binding", { signal })
        if (!response.ok) {
          const detail = await response.text()
          throw new Error(
            `Failed to load binding correlation matrix (status ${response.status}): ${detail.slice(0, 200)}`,
          )
        }
        const payload = (await response.json()) as CorrelationMatrixResponse
        if (!signal?.aborted) {
          setCorrelationData(payload)
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError" || signal?.aborted) return
        console.error("Unable to load binding correlation matrix", fetchError)
        setCorrelationError((fetchError as Error).message || "Unable to load correlation matrix")
        setCorrelationData(null)
      } finally {
        if (!signal?.aborted) {
          setIsCorrelationLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchCorrelationMatrix(controller.signal)
    return () => {
      controller.abort()
    }
  }, [fetchCorrelationMatrix])

  const handleCorrelationRetry = useCallback(() => {
    void fetchCorrelationMatrix()
  }, [fetchCorrelationMatrix])

  const handleSourceToggle = (source: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        return prev.filter((s) => s !== source)
      } else if (prev.length < 3) {
        return [...prev, source]
      }
      return prev
    })
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
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        >
          {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className={`${isPanelCollapsed ? "hidden" : "block"}`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="single" collapsible defaultValue="sources">
              <AccordionItem value="sources" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 rounded-t-lg transition-colors">
                  <span className="font-semibold text-base">Source Selection</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">Select up to 3 binding sources:</p>
                    <div className="space-y-3">
                      {bindingOptions.map(({ id, label }) => {
                        const summary = bindingSourceMap.get(id)
                        const regulatorCount = summary?.regulators.size ?? 0
                        return (
                          <div
                            key={id}
                            className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              id={id}
                              checked={selectedSources.includes(id)}
                              onCheckedChange={() => handleSourceToggle(id)}
                              disabled={
                                isLoading ||
                                (!selectedSources.includes(id) && selectedSources.length >= 3)
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label htmlFor={id} className="text-sm cursor-pointer leading-relaxed font-medium">
                                {label}
                              </Label>
                              {bindingSourceMap.size > 0 ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {regulatorCount.toLocaleString()} regulators
                                </p>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
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
            <h2 className="text-2xl font-semibold text-foreground mb-3">Binding Data Overview</h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              Explore TF binding datasets from multiple experimental sources. Each technique provides genome-wide
              measurements with different resolution and noise profiles.
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <AlertDescription className="space-y-4 text-sm">
              <div className="space-y-4">
                <div>
                  <strong className="text-foreground font-semibold">ChIP-chip (Young Lab):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    Chromatin immunoprecipitation followed by microarray hybridization. Available at{" "}
                    <a
                      href="https://younglab.wi.mit.edu/regulatory_code/GWLD.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      The Young Lab
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <strong className="text-foreground font-semibold">ChIP-exo (Pugh Lab):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    High-resolution footprints with base-pair precision via exonuclease digestion and sequencing.
                    Available at{" "}
                    <a
                      href="http://yeastepigenome.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium underline-offset-2"
                    >
                      yeastepigenome.org
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <strong className="text-foreground font-semibold">Calling Cards (Brent/Mitra Labs):</strong>
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    In vivo transposon-based TF method enabling insertion events near TF binding sites.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Source Selection Summary</CardTitle>
              <CardDescription className="text-sm">Regulator counts and intersections</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Loading binding metadata…</p>
                </div>
              ) : error ? (
                <div className="text-center space-y-4 p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-foreground">Unable to load data</h4>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => void refresh()}>
                      Retry
                    </Button>
                  </div>
                </div>
              ) : selectedSources.length === 0 ? (
                <div className="text-center space-y-4 p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                    <Info className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">Select Sources to Begin</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Choose 1-3 binding sources from the sidebar to visualize regulator counts and dataset
                      intersections.
                    </p>
                  </div>
                </div>
              ) : !hasSelectedData ? (
                <div className="text-center space-y-4 p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/40 mx-auto">
                    <Info className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">No overlapping regulators found</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      The selected datasets do not share regulators. Try adding another source or adjusting your
                      selection.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full p-6">
                  <div className="space-y-2 text-center">
                    <h4 className="font-semibold text-lg">
                      {selectedSources.length === 1
                        ? "Single Source Selected"
                        : selectedSources.length === 2
                          ? "Two-Way Comparison"
                          : "Three-Way Comparison"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Combined unique regulators across selection: {combinedRegulatorCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedSummaries.map((summary) => (
                      <div
                        key={summary.id}
                        className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{summary.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{summary.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-foreground">
                            {summary.regulatorCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">regulators</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {intersectionSummaries.length > 0 ? (
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-foreground">Intersections</h5>
                      <div className="space-y-2">
                        {intersectionSummaries.map((intersection) => (
                          <div
                            key={intersection.label}
                            className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-4 py-2"
                          >
                            <span className="text-xs font-medium text-foreground">{intersection.label}</span>
                            <span className="text-sm font-semibold text-foreground">
                              {intersection.count.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {formattedTimestamp ? (
                    <p className="text-[11px] text-muted-foreground">
                      Source last updated: {formattedTimestamp}
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="min-h-[540px] p-4">
              {isCorrelationLoading ? (
                <div className="flex h-full min-h-[540px] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Loading correlation matrix…</p>
                </div>
              ) : correlationError ? (
                <div className="flex h-full min-h-[540px] w-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm">{correlationError}</p>
                  <Button variant="outline" size="sm" onClick={handleCorrelationRetry}>
                    Retry
                  </Button>
                </div>
              ) : correlationData ? (
                <CorrelationHeatmap
                  correlationData={correlationData}
                  title="Clustered TF Correlation Matrix"
                  minHeight="520px"
                />
              ) : (
                <div className="flex h-full min-h-[540px] w-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">Correlation data unavailable</p>
                  <p className="text-xs">No binding correlation matrix data is available at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

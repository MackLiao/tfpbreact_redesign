"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Config, Data, Layout } from "plotly.js"
import { PlotlyChart } from "@/components/plots/plotly-chart"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Loader2, RefreshCw, X } from "lucide-react"

import { useRankResponseMetadata } from "@/lib/hooks/use-rank-response-metadata"
import { useRankResponseRegulator } from "@/lib/hooks/use-rank-response-regulator"
import type {
  RankResponseExpressionGroup,
  RankResponseMetadataRow,
  RankResponseRegulatorPayload,
  RankResponseReplicateTrace,
} from "@/lib/types"
import { getPerturbationSourceLabel } from "@/lib/utils"

const PLOT_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["select2d", "lasso2d"],
}

const EXPRESSION_TAB_ORDER: string[] = ["kemmeren_tfko", "mcisaac_oe", "hahn_degron"]
const EXPRESSION_TAB_LABELS: Record<string, string> = {
  kemmeren_tfko: "TFKO",
  mcisaac_oe: "Overexpression",
  hahn_degron: "Degron",
}

interface RegulatorOption {
  id: string
  symbol: string
  locusTag: string | null
}

interface ReplicateTableRow {
  promotersetsig: string
  bindingSourceLabel: string
  rankResponseStatus: string | null
  dtoStatus: string | null
  genomicInserts: number | null
  mitoInserts: number | null
  plasmidInserts: number | null
}

interface SummaryTableRow {
  id: string
  bindingSourceLabel: string
  promotersetsig: string
  expressionId: string | null
  expressionSourceLabel: string
  expressionTime: number | null
  randomExpectation: number | null
  rank25: number | null
  rank50: number | null
  dtoEmpiricalPvalue: number | null
  dtoFdr: number | null
  univariateRsquared: number | null
  univariatePvalue: number | null
  bindingRankThreshold: number | null
  perturbationRankThreshold: number | null
  bindingSetSize: number | null
  perturbationSetSize: number | null
  singleBinding: number | null
  compositeBinding: number | null
  passing: boolean | null
}

const formatPercentage = (value?: number | null, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

const formatTime = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A"
  return `${value} min`
}

const formatPValue = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  if (value === 0) return "<1e-12"
  return value < 0.001 ? value.toExponential(2) : value.toFixed(3)
}

const formatNumber = (value?: number | null, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return value.toFixed(digits)
}

const formatInteger = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return Math.round(value).toLocaleString()
}

type ColumnDef<T> = {
  key: string
  label: string
  description?: string
  render: (row: T) => ReactNode
}

const REPLICATE_BASE_COLUMN_DEFS: ColumnDef<ReplicateTableRow>[] = [
  {
    key: "promotersetsig",
    label: "Promoterset",
    description: "Primary identifier for a binding replicate",
    render: (row) => <span className="font-medium text-foreground">{row.promotersetsig}</span>,
  },
]

const REPLICATE_GENERAL_QC_COLUMN_DEFS: ColumnDef<ReplicateTableRow>[] = [
  {
    key: "bindingSourceLabel",
    label: "Binding Source",
    description: "Source of the calling cards binding data",
    render: (row) => <span className="font-medium text-foreground">{row.bindingSourceLabel}</span>,
  },
  {
    key: "rankResponseStatus",
    label: "Rank Response Status",
    description: "QC flag for rank-response analysis",
    render: (row) => row.rankResponseStatus ?? "—",
  },
  {
    key: "dtoStatus",
    label: "DTO Status",
    description: "QC flag for Dual Threshold Optimization",
    render: (row) => row.dtoStatus ?? "—",
  },
]

const REPLICATE_CALLING_CARD_COLUMN_DEFS: ColumnDef<ReplicateTableRow>[] = [
  {
    key: "genomicInserts",
    label: "Genomic insertions",
    description: "Number of genomic calling cards inserts",
    render: (row) => formatInteger(row.genomicInserts),
  },
  {
    key: "mitoInserts",
    label: "Mitochondrial insertions",
    description: "Number of mitochondrial calling cards inserts",
    render: (row) => formatInteger(row.mitoInserts),
  },
  {
    key: "plasmidInserts",
    label: "Plasmid insertions",
    description: "Number of plasmid calling cards inserts",
    render: (row) => formatInteger(row.plasmidInserts),
  },
]

const SUMMARY_BASE_COLUMN_DEFS: ColumnDef<SummaryTableRow>[] = [
  {
    key: "bindingSourceLabel",
    label: "Binding Source",
    description: "Calling cards replicate used in the comparison",
    render: (row) => <span className="font-medium text-foreground">{row.bindingSourceLabel}</span>,
  },
  {
    key: "promotersetsig",
    label: "Promoterset",
    description: "Promoterset identifier for the replicate",
    render: (row) => <span className="font-medium text-foreground">{row.promotersetsig}</span>,
  },
  {
    key: "expressionId",
    label: "Expression ID",
    description: "Perturbation experiment identifier",
    render: (row) => row.expressionId ?? "—",
  },
  {
    key: "randomExpectation",
    label: "Random Exp.",
    description: "Random expectation for responsive fraction",
    render: (row) => formatPercentage(row.randomExpectation, 2),
  },
]

const SUMMARY_METRIC_COLUMN_DEFS: ColumnDef<SummaryTableRow>[] = [
  {
    key: "expressionTime",
    label: "Time Since Perturbation",
    description: "Time point of perturbation assay (minutes)",
    render: (row) => formatTime(row.expressionTime),
  },
  {
    key: "univariateRsquared",
    label: "Linear Model R²",
    description: "R² of model perturbed ~ binding",
    render: (row) => formatNumber(row.univariateRsquared, 3),
  },
  {
    key: "univariatePvalue",
    label: "Linear Model P-value",
    description: "P-value of model perturbed ~ binding",
    render: (row) => formatPValue(row.univariatePvalue),
  },
  {
    key: "dtoEmpiricalPvalue",
    label: "DTO Empirical P-value",
    description: "Empirical p-value from Dual Threshold Optimization",
    render: (row) => formatPValue(row.dtoEmpiricalPvalue),
  },
  {
    key: "dtoFdr",
    label: "DTO Minimum FDR",
    description: "False discovery rate from DTO",
    render: (row) => formatPValue(row.dtoFdr),
  },
  {
    key: "bindingRankThreshold",
    label: "DTO Rank Threshold (binding)",
    description: "Binding rank with most significant DTO overlap",
    render: (row) => formatInteger(row.bindingRankThreshold),
  },
  {
    key: "perturbationRankThreshold",
    label: "DTO Rank Threshold (perturbation)",
    description: "Perturbation rank with most significant DTO overlap",
    render: (row) => formatInteger(row.perturbationRankThreshold),
  },
  {
    key: "bindingSetSize",
    label: "Binding Set Size",
    description: "Gene count in binding set at DTO overlap",
    render: (row) => formatInteger(row.bindingSetSize),
  },
  {
    key: "perturbationSetSize",
    label: "Perturbation Set Size",
    description: "Gene count in perturbation set at DTO overlap",
    render: (row) => formatInteger(row.perturbationSetSize),
  },
  {
    key: "rank25",
    label: "Percent responsive: Top 25 Binding Targets",
    description: "Responsive fraction in the 25 most bound genes",
    render: (row) => formatPercentage(row.rank25, 2),
  },
]

const SUMMARY_IDENTIFIER_COLUMN_DEFS: ColumnDef<SummaryTableRow>[] = [
  {
    key: "singleBinding",
    label: "Single binding",
    description: "Number of single binding identifiers",
    render: (row) => formatInteger(row.singleBinding),
  },
  {
    key: "compositeBinding",
    label: "Composite binding",
    description: "Number of composite binding identifiers",
    render: (row) => formatInteger(row.compositeBinding),
  },
]

const DEFAULT_REPLICATE_GENERAL_COLUMNS: string[] = ["bindingSourceLabel", "rankResponseStatus", "dtoStatus"]
const DEFAULT_REPLICATE_CALLING_CARD_COLUMNS: string[] = []
const DEFAULT_SUMMARY_METRIC_COLUMNS: string[] = ["univariateRsquared", "dtoEmpiricalPvalue", "rank25"]
const DEFAULT_SUMMARY_IDENTIFIER_COLUMNS: string[] = []

const buildPlotFigure = (
  group: RankResponseExpressionGroup,
  selectedIds: Set<string>,
): { data: Data[]; layout: Partial<Layout> } => {
  const traces: Data[] = []

  const referenceTrace = group.traces[0]
  if (referenceTrace) {
    const { data } = referenceTrace
    traces.push({
      type: "scatter",
      mode: "lines",
      name: "Random expectation",
      x: data.x,
      y: data.random,
      line: { dash: "dash", color: "#4b5563" },
      hovertemplate: "Random expectation<br>%{y:.2%}<extra></extra>",
    })

    if (data.ciLower.length && data.ciUpper.length) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "95% CI lower",
        x: data.x,
        y: data.ciLower,
        line: { width: 0 },
        showlegend: false,
        hoverinfo: "skip",
      })
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "95% CI upper",
        x: data.x,
        y: data.ciUpper,
        fill: "tonexty",
        fillcolor: "rgba(148, 163, 184, 0.25)",
        line: { width: 0 },
        showlegend: false,
        hoverinfo: "skip",
      })
    }
  }

  const groupHasSelection = selectedIds.size === 0 || group.traces.some((trace) => selectedIds.has(trace.promotersetsig))

  group.traces.forEach((trace) => {
    const shouldHighlight = groupHasSelection
      ? selectedIds.size === 0 || selectedIds.has(trace.promotersetsig)
      : true
    traces.push({
      type: "scatter",
      mode: "lines",
      name: `${trace.bindingSourceLabel}; ${trace.promotersetsig}`,
      x: trace.data.x,
      y: trace.data.y,
      legendgroup: trace.promotersetsig,
      hovertemplate: `${trace.bindingSourceLabel}; ${trace.promotersetsig}<br># Responsive / # Genes: %{y:.2%}<extra></extra>`,
      line: {
        width: shouldHighlight ? 2.5 : 1,
        color: shouldHighlight ? undefined : "#d1d5db",
      },
      opacity: shouldHighlight ? 1 : 0.25,
    })
  })

  const timeLabel = group.expressionTime !== null && group.expressionTime !== undefined ? ` · ${group.expressionTime} min` : ""

  const layout: Partial<Layout> = {
    title: {
      text: `Expression ${group.expressionId}${timeLabel}`,
      x: 0.02,
      y: 0.98,
      xanchor: "left",
    },
    margin: { l: 60, r: 20, t: 70, b: 55 },
    xaxis: {
      title: { text: "Number of Genes (ranked by binding score)" },
      tick0: 0,
      dtick: 5,
      range: [0, 150],
      zeroline: false,
      gridcolor: "#e5e7eb",
    },
    yaxis: {
      title: { text: "# Responsive / # Genes" },
      tick0: 0,
      dtick: 0.1,
      range: [0, 1],
      zeroline: false,
      gridcolor: "#e5e7eb",
    },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "left",
      x: 0,
    },
    hovermode: "closest",
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
  }

  return { data: traces, layout }
}

const deriveRegulatorOptions = (metadata: RankResponseMetadataRow[]): RegulatorOption[] => {
  const map = new Map<string, RegulatorOption>()
  metadata.forEach((row) => {
    if (row.regulatorId === null || row.regulatorId === undefined) return
    const id = String(row.regulatorId)
    if (!map.has(id)) {
      map.set(id, {
        id,
        symbol: row.regulatorSymbol ?? "Unknown",
        locusTag: row.regulatorLocusTag ?? null,
      })
    }
  })
  return Array.from(map.values())
}

const normalizeQcStatus = (value?: string | null): string | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes("fail") || normalized.includes("invalid") || normalized.includes("remove")) return "Fail"
  if (normalized.includes("pass") || normalized.includes("ok") || normalized.includes("good")) return "Pass"
  if (normalized.includes("mixed")) return "Mixed"
  return value
}

const summarizeStatus = (values: Set<string>): string | null => {
  if (!values.size) return null
  if (values.has("Fail")) return "Fail"
  if (values.has("Pass")) return "Pass"
  if (values.size === 1) return values.values().next().value ?? null
  return values.values().next().value ?? null
}

const buildReplicateRows = (payload: RankResponseRegulatorPayload | null): ReplicateTableRow[] => {
  if (!payload) return []

  type Accumulator = {
    promotersetsig: string
    bindingSourceLabel: string
    rankStatuses: Set<string>
    dtoStatuses: Set<string>
    genomicInserts: number | null
    mitoInserts: number | null
    plasmidInserts: number | null
  }

  const map = new Map<string, Accumulator>()

  payload.metadata.forEach((row) => {
    const promotersetsig = row.promotersetsig ?? row.id
    const bindingSourceLabel = row.bindingSourceLabel ?? row.bindingSource
    let accumulator = map.get(promotersetsig)
    if (!accumulator) {
      accumulator = {
        promotersetsig,
        bindingSourceLabel,
        rankStatuses: new Set<string>(),
        dtoStatuses: new Set<string>(),
        genomicInserts: null,
        mitoInserts: null,
        plasmidInserts: null,
      }
      map.set(promotersetsig, accumulator)
    }

    const normalizedRankStatus = normalizeQcStatus(row.rankResponseStatus)
    if (normalizedRankStatus) {
      accumulator.rankStatuses.add(normalizedRankStatus)
    }
    const normalizedDtoStatus = normalizeQcStatus(row.dtoStatus)
    if (normalizedDtoStatus) {
      accumulator.dtoStatuses.add(normalizedDtoStatus)
    }
    if (accumulator.genomicInserts === null && row.genomicInserts !== null && row.genomicInserts !== undefined) {
      accumulator.genomicInserts = row.genomicInserts
    }
    if (accumulator.mitoInserts === null && row.mitoInserts !== null && row.mitoInserts !== undefined) {
      accumulator.mitoInserts = row.mitoInserts
    }
    if (accumulator.plasmidInserts === null && row.plasmidInserts !== null && row.plasmidInserts !== undefined) {
      accumulator.plasmidInserts = row.plasmidInserts
    }
  })

  return Array.from(map.values())
    .map((acc) => ({
      promotersetsig: acc.promotersetsig,
      bindingSourceLabel: acc.bindingSourceLabel,
      rankResponseStatus: summarizeStatus(acc.rankStatuses),
      dtoStatus: summarizeStatus(acc.dtoStatuses),
      genomicInserts: acc.genomicInserts,
      mitoInserts: acc.mitoInserts,
      plasmidInserts: acc.plasmidInserts,
    }))
    .sort((a, b) => {
      if (a.bindingSourceLabel === b.bindingSourceLabel) {
        return a.promotersetsig.localeCompare(b.promotersetsig)
      }
      return a.bindingSourceLabel.localeCompare(b.bindingSourceLabel)
    })
}

export default function IndividualRegulatorCompareTab() {
  const { data: metadata, isLoading: isMetadataLoading, error: metadataError } = useRankResponseMetadata()

  const regulatorOptions = useMemo(() => deriveRegulatorOptions(metadata), [metadata])
  const [useSystematicNames, setUseSystematicNames] = useState(false)
  const [selectedRegulatorId, setSelectedRegulatorId] = useState<string | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [selectedReplicateIds, setSelectedReplicateIds] = useState<Set<string>>(new Set())
  const [replicateGeneralColumns, setReplicateGeneralColumns] = useState<string[]>(DEFAULT_REPLICATE_GENERAL_COLUMNS)
  const [replicateCallingCardColumns, setReplicateCallingCardColumns] = useState<string[]>(
    DEFAULT_REPLICATE_CALLING_CARD_COLUMNS,
  )
  const [summaryMetricColumns, setSummaryMetricColumns] = useState<string[]>(DEFAULT_SUMMARY_METRIC_COLUMNS)
  const [summaryIdentifierColumns, setSummaryIdentifierColumns] = useState<string[]>(
    DEFAULT_SUMMARY_IDENTIFIER_COLUMNS,
  )
  const [isSummaryDescriptionOpen, setIsSummaryDescriptionOpen] = useState(false)

  const {
    data: regulatorData,
    isLoading: isRegulatorLoading,
    error: regulatorError,
    refresh: refreshRegulator,
  } = useRankResponseRegulator(selectedRegulatorId)

  useEffect(() => {
    setSelectedReplicateIds(new Set())
  }, [regulatorData?.regulator.id])

  useEffect(() => {
    setIsSummaryDescriptionOpen(false)
  }, [selectedRegulatorId])

  const displayedOptions = useMemo(() => {
    const labelFromOption = (option: RegulatorOption) => {
      if (useSystematicNames) {
        return option.locusTag ?? option.symbol
      }
      return option.symbol ?? option.locusTag ?? "Unknown"
    }
    return regulatorOptions
      .map((option) => ({
        value: option.id,
        label: labelFromOption(option),
        secondary: useSystematicNames ? option.symbol : option.locusTag,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [regulatorOptions, useSystematicNames])

  useEffect(() => {
    if (!selectedRegulatorId && displayedOptions.length > 0) {
      const first = displayedOptions[0]
      if (first.value !== "__empty") {
        setSelectedRegulatorId(first.value)
      }
    }
  }, [displayedOptions, selectedRegulatorId])

  const replicateRows = useMemo(() => buildReplicateRows(regulatorData), [regulatorData])
  const allSelectionIds = useMemo(() => replicateRows.map((row) => row.promotersetsig), [replicateRows])

  const expressionGroups = regulatorData?.expressionGroups ?? {}

  const replicateColumnDefs = useMemo(() => {
    const generalSet = new Set(replicateGeneralColumns)
    const callingCardSet = new Set(replicateCallingCardColumns)
    const generalDefs = REPLICATE_GENERAL_QC_COLUMN_DEFS.filter((def) => generalSet.has(def.key))
    const callingCardDefs = REPLICATE_CALLING_CARD_COLUMN_DEFS.filter((def) => callingCardSet.has(def.key))
    return [...REPLICATE_BASE_COLUMN_DEFS, ...generalDefs, ...callingCardDefs]
  }, [replicateGeneralColumns, replicateCallingCardColumns])

  const summaryMetricColumnDefs = useMemo(() => {
    const selectedSet = new Set(summaryMetricColumns)
    return SUMMARY_METRIC_COLUMN_DEFS.filter((def) => selectedSet.has(def.key))
  }, [summaryMetricColumns])

  const summaryIdentifierColumnDefs = useMemo(() => {
    const selectedSet = new Set(summaryIdentifierColumns)
    return SUMMARY_IDENTIFIER_COLUMN_DEFS.filter((def) => selectedSet.has(def.key))
  }, [summaryIdentifierColumns])

  const summaryColumnDefs = useMemo(
    () => [...SUMMARY_BASE_COLUMN_DEFS, ...summaryMetricColumnDefs, ...summaryIdentifierColumnDefs],
    [summaryMetricColumnDefs, summaryIdentifierColumnDefs],
  )

  const metadataByExpressionSource = useMemo(() => {
    const map = new Map<string, SummaryTableRow[]>()
    regulatorData?.metadata.forEach((row) => {
      const collection = map.get(row.expressionSource) ?? []
      collection.push({
        id: row.id,
        bindingSourceLabel: row.bindingSourceLabel ?? row.bindingSource,
        promotersetsig: row.promotersetsig ?? row.id,
        expressionId: row.expressionId ?? null,
        expressionSourceLabel: row.expressionSourceLabel ?? row.expressionSource,
        expressionTime: row.expressionTime ?? null,
        randomExpectation: row.randomExpectation ?? null,
        rank25: row.rank25 ?? null,
        rank50: row.rank50 ?? null,
        dtoEmpiricalPvalue: row.dtoEmpiricalPvalue ?? null,
        dtoFdr: row.dtoFdr ?? null,
        univariateRsquared: row.univariateRsquared ?? null,
        univariatePvalue: row.univariatePvalue ?? null,
        bindingRankThreshold: row.bindingRankThreshold ?? null,
        perturbationRankThreshold: row.perturbationRankThreshold ?? null,
        bindingSetSize: row.bindingSetSize ?? null,
        perturbationSetSize: row.perturbationSetSize ?? null,
        singleBinding: row.singleBinding ?? null,
        compositeBinding: row.compositeBinding ?? null,
        passing: row.passing ?? null,
      })
      map.set(row.expressionSource, collection)
    })
    map.forEach((list, key) => {
      list.sort((a, b) => {
        if (a.bindingSourceLabel === b.bindingSourceLabel) {
          if (a.promotersetsig === b.promotersetsig) {
            return (a.expressionId ?? "").localeCompare(b.expressionId ?? "")
          }
          return a.promotersetsig.localeCompare(b.promotersetsig)
        }
        return a.bindingSourceLabel.localeCompare(b.bindingSourceLabel)
      })
      map.set(key, list)
    })
    return map
  }, [regulatorData])

  useEffect(() => {
    setSelectedReplicateIds((prev) => {
      const validValues = new Set(replicateRows.map((row) => row.promotersetsig))
      let changed = false
      prev.forEach((value) => {
        if (!validValues.has(value)) {
          changed = true
        }
      })
      if (!changed) return prev
      const next = new Set<string>()
      prev.forEach((value) => {
        if (validValues.has(value)) {
          next.add(value)
        }
      })
      return next
    })
  }, [replicateRows])

  const selectedReplicateCount = useMemo(() => {
    let count = 0
    replicateRows.forEach((row) => {
      if (selectedReplicateIds.has(row.promotersetsig)) {
        count += 1
      }
    })
    return count
  }, [replicateRows, selectedReplicateIds])

  const headerCheckboxState = useMemo(() => {
    if (!replicateRows.length || selectedReplicateCount === 0) {
      return false
    }
    if (selectedReplicateCount === replicateRows.length) {
      return true
    }
    return "indeterminate" as const
  }, [replicateRows.length, selectedReplicateCount])

  const toggleReplicateId = (id: string) => {
    setSelectedReplicateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const setReplicateIdState = (id: string, checked: boolean | "indeterminate") => {
    setSelectedReplicateIds((prev) => {
      const next = new Set(prev)
      if (checked === true || checked === "indeterminate") {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleHeaderCheckboxChange = (checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return
    if (checked) {
      setSelectedReplicateIds(new Set(allSelectionIds))
    } else {
      setSelectedReplicateIds(new Set())
    }
  }

  const handleRegulatorChange = (value: string) => {
    if (value === "__empty") return
    setSelectedRegulatorId(value)
  }

  const handleReplicateGeneralToggle = (key: string, checked: boolean | "indeterminate") => {
    setReplicateGeneralColumns((prev) => {
      const set = new Set(prev)
      if (checked) {
        set.add(key)
      } else {
        set.delete(key)
      }
      return Array.from(set)
    })
  }

  const handleReplicateCallingCardToggle = (key: string, checked: boolean | "indeterminate") => {
    setReplicateCallingCardColumns((prev) => {
      const set = new Set(prev)
      if (checked) {
        set.add(key)
      } else {
        set.delete(key)
      }
      return Array.from(set)
    })
  }

  const handleSummaryMetricToggle = (key: string, checked: boolean | "indeterminate") => {
    setSummaryMetricColumns((prev) => {
      const set = new Set(prev)
      if (checked) {
        set.add(key)
      } else {
        set.delete(key)
      }
      return Array.from(set)
    })
  }

  const handleSummaryIdentifierToggle = (key: string, checked: boolean | "indeterminate") => {
    setSummaryIdentifierColumns((prev) => {
      const set = new Set(prev)
      if (checked) {
        set.add(key)
      } else {
        set.delete(key)
      }
      return Array.from(set)
    })
  }

  const collapseButton = (
    <Button
      variant="outline"
      size="icon"
      className="absolute -right-3 top-4 z-10 h-7 w-7 rounded-full bg-white shadow-md border-border hover:bg-secondary"
      onClick={() => setIsPanelCollapsed((prev) => !prev)}
    >
      {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </Button>
  )

  return (
    <div className="flex gap-6 h-full">
      <aside
        className={`shrink-0 transition-all duration-300 ease-in-out ${isPanelCollapsed ? "w-12" : "w-80"} relative`}
      >
        {collapseButton}
        <div className={`${isPanelCollapsed ? "hidden" : "block"} space-y-4`}>
          <Card className="shadow-sm border-border/60">
            <Accordion type="multiple" defaultValue={["general"]}>
              <AccordionItem value="general" className="border-b border-border/60">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">General</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <Switch id="systematic-names" checked={useSystematicNames} onCheckedChange={setUseSystematicNames} />
                    <Label htmlFor="systematic-names" className="cursor-pointer text-sm font-medium leading-relaxed">
                      Use Systematic Gene Names
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regulator-select" className="text-sm font-semibold">
                      Select Regulator
                    </Label>
                    <Select value={selectedRegulatorId ?? undefined} onValueChange={handleRegulatorChange}>
                      <SelectTrigger id="regulator-select" className="h-10">
                        <SelectValue
                          placeholder={
                            isMetadataLoading ? "Loading regulators..." : metadataError ? "Failed to load" : "Choose..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {displayedOptions.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            {isMetadataLoading ? "Loading regulators..." : "No regulators available"}
                          </SelectItem>
                        ) : (
                          displayedOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                {option.secondary ? (
                                  <span className="text-xs text-muted-foreground">{option.secondary}</span>
                                ) : null}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <Card className="shadow-sm border-border/60">
            <Accordion type="single" collapsible defaultValue="replicate-columns">
              <AccordionItem value="replicate-columns" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Replicate Table Columns</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      General QC Metrics
                    </span>
                    <div className="mt-3 space-y-3">
                      {REPLICATE_GENERAL_QC_COLUMN_DEFS.map((column) => {
                        const checkboxId = `replicate-general-${column.key}`
                        const descriptionId = column.description ? `${checkboxId}-description` : undefined
                        return (
                          <div
                            key={column.key}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-muted/50"
                            title={column.description ?? undefined}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={replicateGeneralColumns.includes(column.key)}
                              onCheckedChange={(checked) => handleReplicateGeneralToggle(column.key, checked)}
                              aria-describedby={descriptionId}
                            />
                            <div>
                              <Label
                                htmlFor={checkboxId}
                                className="text-sm font-medium leading-tight cursor-pointer"
                                title={column.description ?? undefined}
                              >
                                {column.label}
                              </Label>
                              {descriptionId ? (
                                <span id={descriptionId} className="sr-only">
                                  {column.description}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Calling Cards QC Metrics
                    </span>
                    <div className="mt-3 space-y-3">
                      {REPLICATE_CALLING_CARD_COLUMN_DEFS.map((column) => {
                        const checkboxId = `replicate-calling-card-${column.key}`
                        const descriptionId = column.description ? `${checkboxId}-description` : undefined
                        return (
                          <div
                            key={column.key}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-muted/50"
                            title={column.description ?? undefined}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={replicateCallingCardColumns.includes(column.key)}
                              onCheckedChange={(checked) => handleReplicateCallingCardToggle(column.key, checked)}
                              aria-describedby={descriptionId}
                            />
                            <div>
                              <Label
                                htmlFor={checkboxId}
                                className="text-sm font-medium leading-tight cursor-pointer"
                                title={column.description ?? undefined}
                              >
                                {column.label}
                              </Label>
                              {descriptionId ? (
                                <span id={descriptionId} className="sr-only">
                                  {column.description}
                                </span>
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

          <Card className="shadow-sm border-border/60">
            <Accordion type="single" collapsible defaultValue="summary-columns">
              <AccordionItem value="summary-columns" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-base">Summary Table Columns</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 pt-2 space-y-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comparison Metrics
                    </span>
                    <div className="mt-3 space-y-3">
                      {SUMMARY_METRIC_COLUMN_DEFS.map((column) => {
                        const checkboxId = `summary-metric-${column.key}`
                        const descriptionId = column.description ? `${checkboxId}-description` : undefined
                        return (
                          <div
                            key={column.key}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-muted/50"
                            title={column.description ?? undefined}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={summaryMetricColumns.includes(column.key)}
                              onCheckedChange={(checked) => handleSummaryMetricToggle(column.key, checked)}
                              aria-describedby={descriptionId}
                            />
                            <div>
                              <Label
                                htmlFor={checkboxId}
                                className="text-sm font-medium leading-tight cursor-pointer"
                                title={column.description ?? undefined}
                              >
                                {column.label}
                              </Label>
                              {descriptionId ? (
                                <span id={descriptionId} className="sr-only">
                                  {column.description}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Database Identifier Columns
                    </span>
                    <div className="mt-3 space-y-3">
                      {SUMMARY_IDENTIFIER_COLUMN_DEFS.map((column) => {
                        const checkboxId = `summary-identifier-${column.key}`
                        const descriptionId = column.description ? `${checkboxId}-description` : undefined
                        return (
                          <div
                            key={column.key}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-muted/50"
                            title={column.description ?? undefined}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={summaryIdentifierColumns.includes(column.key)}
                              onCheckedChange={(checked) => handleSummaryIdentifierToggle(column.key, checked)}
                              aria-describedby={descriptionId}
                            />
                            <div>
                              <Label
                                htmlFor={checkboxId}
                                className="text-sm font-medium leading-tight cursor-pointer"
                                title={column.description ?? undefined}
                              >
                                {column.label}
                              </Label>
                              {descriptionId ? (
                                <span id={descriptionId} className="sr-only">
                                  {column.description}
                                </span>
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

      <div className="flex-1 space-y-6 pb-10">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Individual Regulator Comparisons</h2>
              <p className="text-muted-foreground leading-relaxed text-base max-w-3xl">
                Explore rank-response relationships for a selected regulator across binding datasets. Use the replicate
                table to highlight specific experiments in the plots and examine how binding strength relates to
                perturbation responsiveness.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshRegulator()}
              disabled={!selectedRegulatorId || isRegulatorLoading}
              className="self-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegulatorLoading ? "animate-spin" : ""}`} />
              Refresh data
            </Button>
          </div>

          {regulatorError ? (
            <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="text-sm">
                Unable to load regulator data: {regulatorError}. Try refreshing or choose a different regulator.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-lg font-semibold">Rank Response Plots</CardTitle>
            <p className="text-sm text-muted-foreground">
              Each solid line compares one binding dataset to a perturbation dataset. The vertical axis shows the
              fraction of strongly bound genes that are responsive; the horizontal axis is the number of genes ranked by
              binding strength. The dashed line and shaded band represent the random expectation and its 95% confidence
              interval.
            </p>
          </CardHeader>
          <CardContent>
            {isRegulatorLoading ? (
              <div className="min-h-[320px] flex items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading regulator plots…</span>
              </div>
            ) : !regulatorData || !Object.keys(expressionGroups).length ? (
              <div className="min-h-[320px] flex items-center justify-center text-muted-foreground">
                Select a regulator to view rank response plots.
              </div>
            ) : (
              <Tabs defaultValue={EXPRESSION_TAB_ORDER.find((key) => expressionGroups[key]?.length) ?? "kemmeren_tfko"}>
                <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50">
                  {EXPRESSION_TAB_ORDER.map((key) => (
                    <TabsTrigger key={key} value={key} className="text-sm font-medium">
                      {EXPRESSION_TAB_LABELS[key] ?? getPerturbationSourceLabel(key) ?? key}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {EXPRESSION_TAB_ORDER.map((key) => {
                  const groups = expressionGroups[key] ?? []
                  const summaryRows = metadataByExpressionSource.get(key) ?? []
                  const summaryDescriptionTitleId = `summary-description-title-${key}`
                  const summaryDescriptionBodyId = `summary-description-body-${key}`
                  return (
                    <TabsContent key={key} value={key} className="mt-6">
                      <div className="lg:grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                          {!groups.length ? (
                            <div className="min-h-[280px] flex items-center justify-center border border-dashed border-muted rounded-lg bg-muted/20">
                              <span className="text-sm text-muted-foreground">No plots available for this condition.</span>
                            </div>
                          ) : (
                            groups.map((group) => {
                              const figure = buildPlotFigure(group, selectedReplicateIds)
                              return (
                                <Card key={group.expressionId} className="shadow-sm border-border/60">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold">
                                      {group.expressionSourceLabel} · Expression {group.expressionId}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                      Time point: {formatTime(group.expressionTime)}
                                    </p>
                                  </CardHeader>
                                  <CardContent>
                                    <PlotlyChart
                                      data={figure.data}
                                      layout={figure.layout}
                                      config={PLOT_CONFIG}
                                      className="w-full h-[360px]"
                                    />
                                  </CardContent>
                                </Card>
                              )
                            })
                          )}
                        </div>

                        <div className="lg:col-span-1">
                          <Card className="relative shadow-sm border-border/60">
                            {isSummaryDescriptionOpen ? (
                              <div
                                role="dialog"
                                aria-modal="false"
                                aria-labelledby={summaryDescriptionTitleId}
                                aria-describedby={summaryDescriptionBodyId}
                                className="absolute right-4 top-16 z-30 w-80 rounded-lg border border-border/60 bg-card p-4 shadow-xl"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p id={summaryDescriptionTitleId} className="text-sm font-semibold text-foreground">
                                    Summary Table Overview
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Close summary description"
                                    onClick={() => setIsSummaryDescriptionOpen(false)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div
                                  id={summaryDescriptionBodyId}
                                  className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed"
                                >
                                  <p>
                                    <strong className="text-foreground">Overview:</strong> Each row shows summary
                                    statistics for comparing one binding dataset (or replicate) to one
                                    perturbation-response dataset.
                                  </p>
                                  <p>
                                    <strong className="text-foreground">Navigation:</strong> Tabs switch between
                                    perturbation datasets. Use the sidebar to control visible columns.
                                  </p>
                                  <p>
                                    <strong className="text-foreground">Analysis Methods:</strong> Metrics combine the
                                    responsive fraction among top bound genes, linear modeling of response versus
                                    binding, and Dual Threshold Optimization (DTO).
                                  </p>
                                </div>
                              </div>
                            ) : null}
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <CardTitle className="text-lg font-semibold">Summary Statistics</CardTitle>
                                  <p className="text-xs text-muted-foreground">
                                    Metrics for {EXPRESSION_TAB_LABELS[key] ?? key} replicates.
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="mt-1 h-8 w-8"
                                  aria-label="Show summary description"
                                  aria-expanded={isSummaryDescriptionOpen}
                                  aria-controls={summaryDescriptionBodyId}
                                  onClick={() => setIsSummaryDescriptionOpen((prev) => !prev)}
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                              {summaryRows.length ? (
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50">
                                    <tr className="text-left">
                                      {summaryColumnDefs.map((column) => (
                                        <th key={column.key} className="px-4 py-2 font-semibold">
                                          {column.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {summaryRows.map((row) => {
                                      const isSelected = selectedReplicateIds.has(row.promotersetsig)
                                      return (
                                        <tr
                                          key={row.id}
                                          className={`border-b border-border/30 transition-colors ${
                                            isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                                          }`}
                                        >
                                          {summaryColumnDefs.map((column) => (
                                            <td key={column.key} className="px-4 py-2">
                                              {column.render(row)}
                                            </td>
                                          ))}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                                  No summary statistics available for this condition.
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="shadow-sm border-border/60 lg:col-span-5 xl:col-span-5">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-lg font-semibold">Replicate Selection Table</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select rows to highlight specific replicates in the plots. Multiple rows can be selected. Clear the
                selection to view all traces.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isRegulatorLoading ? (
                <div className="min-h-[280px] flex items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading replicates…</span>
                </div>
              ) : replicateRows.length === 0 ? (
                <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Select a regulator to view replicate metadata.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 w-12">
                        <Checkbox
                          checked={headerCheckboxState}
                          onCheckedChange={handleHeaderCheckboxChange}
                          aria-label="Select all replicates"
                        />
                      </th>
                      {replicateColumnDefs.map((column) => (
                        <th key={column.key} className="px-4 py-3 font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {replicateRows.map((row) => {
                      const isSelected = selectedReplicateIds.has(row.promotersetsig)
                      return (
                        <tr
                          key={row.promotersetsig}
                          className={`border-b border-border/40 transition-colors ${
                            isSelected ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/40"
                          }`}
                          onClick={() => toggleReplicateId(row.promotersetsig)}
                        >
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => setReplicateIdState(row.promotersetsig, checked)}
                              aria-label={`Toggle ${row.promotersetsig}`}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </td>
                          {replicateColumnDefs.map((column) => (
                            <td key={column.key} className="px-4 py-3">
                              {column.render(row)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground border-t pt-4 leading-relaxed">
              <div>
                <strong>Selection:</strong>{" "}
                {selectedReplicateIds.size
                  ? `${selectedReplicateIds.size} of ${replicateRows.length} replicates highlighted`
                  : "All replicates visible"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReplicateIds(new Set())}
                  disabled={!selectedReplicateIds.size}
                >
                  Clear selection
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-6">
          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <AlertDescription className="text-sm leading-relaxed">
              <strong className="text-foreground">How to Use:</strong> Select rows in the replicate table to control
              which traces are emphasized in the plots. Tabs above the plots switch between perturbation conditions. The
              table above includes rank-response metrics that correspond to the plotted datasets.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}

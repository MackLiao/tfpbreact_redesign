// Data types for the application

export interface BindingSource {
  id: string
  name: string
  description: string
}

export interface PerturbationSource {
  id: string
  name: string
  description: string
  type: "overexpression" | "deletion" | "degron"
}

export interface Regulator {
  id: number
  symbol: string
  locusTag: string
}

export interface RankResponseMetadataRow {
  id: string
  regulatorSymbol: string
  regulatorLocusTag?: string | null
  regulatorId?: number | null
  bindingSource: string
  bindingSourceLabel: string
  expressionSource: string
  expressionSourceLabel: string
  expressionId?: string | null
  promotersetsig?: string | null
  expressionMechanism?: string | null
  rank25?: number | null
  rank50?: number | null
  dtoEmpiricalPvalue?: number | null
  dtoFdr?: number | null
  univariatePvalue?: number | null
  univariateRsquared?: number | null
  randomExpectation?: number | null
  expressionTime?: number | null
  bindingRankThreshold?: number | null
  perturbationRankThreshold?: number | null
  bindingSetSize?: number | null
  perturbationSetSize?: number | null
  rankResponseStatus?: string | null
  dtoStatus?: string | null
  passing?: boolean | null
  singleBinding?: number | null
  compositeBinding?: number | null
  genomicInserts?: number | null
  mitoInserts?: number | null
  plasmidInserts?: number | null
}

export interface RankResponseMetadataResponse {
  metadata: RankResponseMetadataRow[]
  sourceTimestamp?: string
}

export interface RankResponseReplicateTrace {
  id: string
  promotersetsig: string
  bindingSource: string
  bindingSourceLabel: string
  expressionId: string | null
  data: {
    x: number[]
    y: number[]
    random: number[]
    ciLower: number[]
    ciUpper: number[]
  }
}

export interface RankResponseExpressionGroup {
  expressionId: string
  expressionSource: string
  expressionSourceLabel: string
  expressionTime: number | null
  random: number
  traces: RankResponseReplicateTrace[]
}

export interface RankResponseRegulatorPayload {
  regulator: {
    id: string
    symbol: string
    locusTag: string | null
    label: string
  }
  metadata: RankResponseMetadataRow[]
  expressionGroups: Record<string, RankResponseExpressionGroup[]>
}

export interface BindingData {
  targetSymbol: string
  [key: string]: number | string
}

export interface PerturbationResponseData {
  targetSymbol: string
  [key: string]: number | string
}

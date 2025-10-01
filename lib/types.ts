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

export interface RankResponseMetadata {
  regulatorId: number
  regulatorSymbol: string
  regulatorLocusTag: string
  bindingSource: string
  expressionSource: string
  rankResponse: number
  dtoPvalue: number
  univariatePvalue: number
}

export interface BindingData {
  targetSymbol: string
  [key: string]: number | string
}

export interface PerturbationResponseData {
  targetSymbol: string
  [key: string]: number | string
}

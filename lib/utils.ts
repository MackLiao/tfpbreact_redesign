import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BINDING_SOURCE_MAP = {
  harbison_chip: 'ChIP-chip',
  chipexo_pugh_allevents: 'ChIP-exo',
  brent_nf_cc: 'Calling Cards',
} as const

export const PERTURBATION_SOURCE_MAP = {
  mcisaac_oe: 'Overexpression',
  kemmeren_tfko: '2014 TFKO',
  hu_reimann_tfko: '2007 TFKO',
  hahn_degron: 'Degron',
} as const

type BindingSourceId = keyof typeof BINDING_SOURCE_MAP
type PerturbationSourceId = keyof typeof PERTURBATION_SOURCE_MAP
type SourceType = 'binding' | 'perturbation_response'

export function getSourceNameDict(
  datatype?: SourceType,
  reverse = false,
): Record<string, string> {
  const maps: Record<SourceType, Record<string, string>> = {
    binding: { ...BINDING_SOURCE_MAP },
    perturbation_response: { ...PERTURBATION_SOURCE_MAP },
  }

  if (!datatype) {
    const merged = { ...maps.binding, ...maps.perturbation_response }
    return reverse
      ? Object.fromEntries(Object.entries(merged).map(([k, v]) => [v, k]))
      : merged
  }

  if (!(datatype in maps)) {
    throw new Error(`Invalid datatype: ${datatype}`)
  }

  const mapping = maps[datatype]
  return reverse
    ? Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]))
    : mapping
}

export function getBindingSourceLabel(id: string | null | undefined): string | undefined {
  if (!id) return id ?? undefined
  return BINDING_SOURCE_MAP[id as BindingSourceId] ?? id
}

export function getPerturbationSourceLabel(id: string | null | undefined): string | undefined {
  if (!id) return id ?? undefined
  return PERTURBATION_SOURCE_MAP[id as PerturbationSourceId] ?? id
}

interface WithSources {
  bindingSource?: string | null
  expressionSource?: string | null
}

export function renameDataSources<T extends WithSources>(rows: T[]): Array<
  T & { bindingSourceLabel?: string; expressionSourceLabel?: string }
> {
  return rows.map((row) => ({
    ...row,
    bindingSourceLabel: getBindingSourceLabel(row.bindingSource),
    expressionSourceLabel: getPerturbationSourceLabel(row.expressionSource),
  }))
}

const isMissing = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))

export function safeSciNotation<T>(value: T): T | string {
  if (isMissing(value)) return value

  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return value

  if (!Number.isFinite(num)) return value

  return num.toExponential(2)
}

export function safePercentageFormat<T>(value: T): T | string {
  if (isMissing(value)) return value

  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return value

  return `${Math.round(num * 100)}%`
}

export function negLog10Transform(
  values: Array<number | null | undefined>,
  epsilon = 1e-300,
): Array<number | null> {
  if (!Array.isArray(values)) {
    throw new TypeError('Input must be an array.')
  }
  if (typeof epsilon !== 'number' || Number.isNaN(epsilon) || epsilon <= 0) {
    throw new TypeError('Epsilon must be a positive numeric value.')
  }

  let adjustedCount = 0

  const transformed = values.map((value) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError('Input array must contain numeric values or null/undefined.')
    }
    if (value < 0) {
      throw new RangeError('Input array contains negative values.')
    }

    const clipped = value <= epsilon ? epsilon : value
    if (clipped !== value) {
      adjustedCount += 1
    }
    return -Math.log10(clipped)
  })

  if (adjustedCount > 0) {
    console.warn(
      `${adjustedCount} values were ≤ ${epsilon.toExponential(2)} and adjusted for log10 scale.`,
    )
  }

  return transformed
}

export function applyColumnNames(
  rows: Array<Record<string, unknown>>,
  metadata: Record<string, [string, string]>,
  promotersetsigName = 'id',
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const renamed: Record<string, unknown> = {}

    Object.entries(row).forEach(([key, value]) => {
      if (key === 'promotersetsig') {
        renamed[promotersetsigName] = value
        return
      }

      if (metadata[key]) {
        renamed[metadata[key][0]] = value
        return
      }

      renamed[key] = value
    })

    return renamed
  })
}

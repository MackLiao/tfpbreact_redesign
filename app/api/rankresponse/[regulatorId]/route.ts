import { gunzipSync } from 'node:zlib'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import tar from 'tar-stream'

import { RANKRESPONSE_URL, TFBP_API_TOKEN } from '@/lib/env'
import type {
  RankResponseExpressionGroup,
  RankResponseMetadataRow,
  RankResponseRegulatorPayload,
  RankResponseReplicateTrace,
} from '@/lib/types'
import { getBindingSourceLabel, getPerturbationSourceLabel } from '@/lib/utils'

const CACHE_TTL_MS = 5 * 60 * 1000
const EXPRESSION_CONDITIONS =
  'expression_source=kemmeren_tfko;expression_source=mcisaac_oe,time=15;expression_source=hahn_degron'

interface CachedEntry {
  timestamp: number
  payload: RankResponseRegulatorPayload
}

interface InFlightEntry {
  promise: Promise<RankResponseRegulatorPayload>
  bypassCache: boolean
}

type Nullable<T> = T | null | undefined

const regulatorCache = new Map<string, CachedEntry>()
const inFlightRequests = new Map<string, InFlightEntry>()

const NULL_LIKE_VALUES = new Set(['', 'na', 'nan', 'none', 'null'])

const logFactorialCache: number[] = [0]

const safeGunzip = (buffer: Buffer): Buffer => {
  try {
    // Convert Node.js Buffer to Uint8Array for gunzipSync compatibility
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    const result = gunzipSync(uint8)
    // If gunzipSync returns a Buffer, just return it; if it returns Uint8Array, convert to Buffer
    return Buffer.isBuffer(result) ? result : Buffer.from(result)
  } catch {
    return buffer
  }
}

const safeGunzipToString = (buffer: Buffer): string => safeGunzip(buffer).toString('utf-8')

const ensureString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (NULL_LIKE_VALUES.has(trimmed.toLowerCase())) return null
  const numeric = Number(trimmed)
  return Number.isNaN(numeric) ? null : numeric
}

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value !== 'string') return null
  const lowered = value.trim().toLowerCase()
  if (!lowered) return null
  if (['true', '1', 'yes', 'y', 't'].includes(lowered)) return true
  if (['false', '0', 'no', 'n', 'f'].includes(lowered)) return false
  return null
}

const logFactorial = (n: number): number => {
  if (n < 0) throw new RangeError('n must be non-negative')
  if (logFactorialCache[n] !== undefined) return logFactorialCache[n]
  for (let i = logFactorialCache.length; i <= n; i += 1) {
    logFactorialCache[i] = logFactorialCache[i - 1] + Math.log(i)
  }
  return logFactorialCache[n]
}

const logBinomialCoefficient = (n: number, k: number): number => {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

const binomialPmf = (k: number, n: number, p: number): number => {
  if (p <= 0) {
    return k === 0 ? 1 : 0
  }
  if (p >= 1) {
    return k === n ? 1 : 0
  }
  const logProb = logBinomialCoefficient(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)
  return Math.exp(logProb)
}

const binomialCdf = (k: number, n: number, p: number): number => {
  let cumulative = 0
  for (let i = 0; i <= k; i += 1) {
    cumulative += binomialPmf(i, n, p)
  }
  return Math.min(1, cumulative)
}

const binomialInv = (target: number, n: number, p: number): number => {
  if (target <= 0) return 0
  if (target >= 1) return n
  for (let k = 0; k <= n; k += 1) {
    if (binomialCdf(k, n, p) >= target) {
      return k
    }
  }
  return n
}

const binomialConfidenceInterval = (trials: number, probability: number, alpha = 0.05): [number, number] => {
  if (trials <= 0) return [0, 0]
  const lower = binomialInv(alpha / 2, trials, probability) / trials
  const upper = binomialInv(1 - alpha / 2, trials, probability) / trials
  return [lower, upper]
}

const extractCsvFromTarGz = async (archive: Buffer, recordId: string): Promise<string> => {
  const decompressed = safeGunzip(archive)
  const extract = tar.extract()

  return new Promise<string>((resolve, reject) => {
    let resolved = false
    let collectedCsv: string | null = null

    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []

      stream.on('data', (chunk) => {
        chunks.push(chunk as Buffer)
      })

      stream.on('end', () => {
        if (resolved) {
          next()
          return
        }

        const name = header.name.replace(/^\.\/+/, '')
        const targetBase = `${recordId}.csv`
        const targetCompressed = `${targetBase}.gz`

        if (name === targetBase || name.endsWith(`/${targetBase}`)) {
          collectedCsv = Buffer.concat(chunks as readonly Uint8Array[]).toString('utf-8')
        } else if (name === targetCompressed || name.endsWith(`/${targetCompressed}`)) {
          try {
            collectedCsv = safeGunzip(Buffer.concat(chunks as readonly Uint8Array[])).toString('utf-8')
          } catch (error) {
            reject(error)
            return
          }
        }

        next()
      })

      stream.on('error', reject)
    })

    extract.on('finish', () => {
      if (resolved) return
      if (collectedCsv === null) {
        reject(new Error(`CSV for record ${recordId} was not found in archive`))
        return
      }
      resolved = true
      resolve(collectedCsv)
    })

    extract.on('error', reject)
    extract.end(decompressed)
  })
}

interface RawReplicateRow {
  rank_bin: Nullable<number>
  responsive: Nullable<boolean | string | number>
  random: Nullable<number>
}

const parseReplicateCsv = (csv: string, nBins = 150): RawReplicateRow[] => {
  const parsed = Papa.parse<RawReplicateRow>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors.length) {
    console.warn('Replicate CSV parse errors detected', parsed.errors.slice(0, 3))
  }

  return parsed.data.filter((row) => {
    const rank = parseNumber(row.rank_bin)
    return typeof rank === 'number' && rank > 0 && rank <= nBins
  })
}

interface ProcessedPlotData {
  x: number[]
  y: number[]
  random: number[]
  ciLower: number[]
  ciUpper: number[]
}

const processPlotData = (rows: RawReplicateRow[]): ProcessedPlotData | null => {
  if (!rows.length) return null

  const grouped = new Map<
    number,
    {
      successes: number
      random: number
    }
  >()

  rows.forEach((row) => {
    const rankBin = parseNumber(row.rank_bin)
    if (rankBin === null || rankBin <= 0) return

    const responsiveValue = parseBoolean(row.responsive)
    const randomValue = parseNumber(row.random)
    const existing = grouped.get(rankBin) ?? { successes: 0, random: randomValue ?? 0 }
    if (responsiveValue) {
      existing.successes += 1
    }
    if (typeof randomValue === 'number' && Number.isFinite(randomValue)) {
      existing.random = randomValue
    }
    grouped.set(rankBin, existing)
  })

  if (!grouped.size) return null

  const sortedRanks = Array.from(grouped.keys()).sort((a, b) => a - b)
  let cumulativeSuccesses = 0
  const x: number[] = []
  const y: number[] = []
  const randomValues: number[] = []
  const ciLower: number[] = []
  const ciUpper: number[] = []

  const baselineRandom = grouped.get(sortedRanks[0])?.random ?? 0

  sortedRanks.forEach((rank) => {
    const stats = grouped.get(rank)
    if (!stats) return
    cumulativeSuccesses += stats.successes
    const ratio = rank > 0 ? cumulativeSuccesses / rank : 0
    const [lower, upper] = binomialConfidenceInterval(rank, baselineRandom)

    x.push(rank)
    y.push(ratio)
    randomValues.push(baselineRandom)
    ciLower.push(lower)
    ciUpper.push(upper)
  })

  return { x, y, random: randomValues, ciLower, ciUpper }
}

const buildTrace = (
  metadata: RankResponseMetadataRow,
  plotData: ProcessedPlotData,
): RankResponseReplicateTrace => {
  const promotersetsig = metadata.promotersetsig ?? metadata.id
  const bindingSourceLabel =
    metadata.bindingSourceLabel ??
    getBindingSourceLabel(metadata.bindingSource) ??
    metadata.bindingSource
  return {
    id: metadata.id,
    promotersetsig: promotersetsig ?? metadata.id,
    bindingSource: metadata.bindingSource,
    bindingSourceLabel,
    expressionId: metadata.expressionId ?? null,
    data: {
      x: plotData.x,
      y: plotData.y,
      random: plotData.random,
      ciLower: plotData.ciLower,
      ciUpper: plotData.ciUpper,
    },
  }
}

const fetchWithAuth = async (url: string, init?: RequestInit): Promise<Response> => {
  if (!TFBP_API_TOKEN) {
    throw new Error('TFBP API token is not configured')
  }
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Token ${TFBP_API_TOKEN}`,
    },
    cache: 'no-store',
  })
  return response
}

const parseMetadataRow = (row: Record<string, unknown>): RankResponseMetadataRow | null => {
  const id = ensureString(row.id)
  const bindingSource = ensureString(row.binding_source)
  const expressionSource = ensureString(row.expression_source)
  if (!id || !bindingSource || !expressionSource) {
    return null
  }

  const bindingSourceLabel = getBindingSourceLabel(bindingSource) ?? bindingSource
  const expressionSourceLabel = getPerturbationSourceLabel(expressionSource) ?? expressionSource

  return {
    id,
    bindingSource,
    bindingSourceLabel,
    expressionSource,
    expressionSourceLabel,
    promotersetsig: ensureString(row.promotersetsig) ?? null,
    expressionId: ensureString(row.expression) ?? null,
    expressionTime: parseNumber(row.expression_time),
    expressionMechanism: ensureString(row.expression_mechanism) ?? null,
    regulatorId: parseNumber(row.regulator_id),
    regulatorSymbol: ensureString(row.regulator_symbol) ?? 'Unknown',
    regulatorLocusTag: ensureString(row.regulator_locus_tag) ?? null,
    randomExpectation: parseNumber(row.random_expectation),
    rank25: parseNumber(row.rank_25),
    rank50: parseNumber(row.rank_50),
    dtoEmpiricalPvalue: parseNumber(row.dto_empirical_pvalue),
    dtoFdr: parseNumber(row.dto_fdr),
    univariatePvalue: parseNumber(row.univariate_pvalue),
    univariateRsquared: parseNumber(row.univariate_rsquared),
    bindingRankThreshold: parseNumber(row.binding_rank_threshold),
    perturbationRankThreshold: parseNumber(row.perturbation_rank_threshold),
    dtoStatus: ensureString(row.dto_status) ?? null,
    rankResponseStatus: ensureString(row.rank_response_status) ?? null,
    passing: parseBoolean(row.passing),
    singleBinding: parseNumber(row.single_binding),
    compositeBinding: parseNumber(row.composite_binding),
    genomicInserts: parseNumber(row.genomic_inserts),
    mitoInserts: parseNumber(row.mito_inserts),
    plasmidInserts: parseNumber(row.plasmid_inserts),
  }
}

const fetchMetadataForRegulator = async (regulatorId: string): Promise<RankResponseMetadataRow[]> => {
  if (!RANKRESPONSE_URL) {
    throw new Error('RANKRESPONSE_URL environment variable is not configured.')
  }
  const url = `${RANKRESPONSE_URL}export/?regulator_id=${encodeURIComponent(
    regulatorId,
  )}&expression_conditions=${encodeURIComponent(EXPRESSION_CONDITIONS)}`

  const response = await fetchWithAuth(url)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Rank response metadata fetch failed (${response.status}): ${detail.slice(0, 200)}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const csv = safeGunzipToString(buffer)
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length) {
    console.warn('Rank response metadata parse errors', parsed.errors.slice(0, 3))
  }

  return parsed.data
    .map((row) => parseMetadataRow(row))
    .filter((row): row is RankResponseMetadataRow => row !== null)
}

const fetchReplicateData = async (
  metadata: RankResponseMetadataRow[],
): Promise<Map<string, ProcessedPlotData>> => {
  if (!RANKRESPONSE_URL) {
    throw new Error('RANKRESPONSE_URL environment variable is not configured.')
  }

  const results = new Map<string, ProcessedPlotData>()

  const uniqueRows = Array.from(
    new Map(metadata.map((row) => [row.id, row])).values(),
  )

  const queue = [...uniqueRows]
  const concurrency = Math.min(4, queue.length) || 1

  const worker = async () => {
    while (queue.length) {
      const row = queue.shift()
      if (!row) break

      const url = `${RANKRESPONSE_URL}record_table_and_files/?id=${encodeURIComponent(row.id)}`
      let response: Response
      try {
        response = await fetchWithAuth(url)
      } catch (error) {
        console.warn(`Failed to reach replicate endpoint for ${row.id}`, error)
        continue
      }

      if (!response.ok) {
        const detail = await response.text()
        console.warn(`Failed to fetch replicate data for ${row.id}: ${response.status} ${detail.slice(0, 120)}`)
        continue
      }

      try {
        const archiveBuffer = Buffer.from(await response.arrayBuffer())
        const csv = await extractCsvFromTarGz(archiveBuffer, row.id)
        const parsedRows = parseReplicateCsv(csv)
        const processed = processPlotData(parsedRows)
        if (processed) {
          results.set(row.id, processed)
        }
      } catch (error) {
        console.error(`Failed to process replicate data for ${row.id}`, error)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))

  return results
}

const groupByExpressionSource = (
  metadata: RankResponseMetadataRow[],
  plots: Map<string, ProcessedPlotData>,
): Record<string, RankResponseExpressionGroup[]> => {
  const grouped: Record<string, RankResponseExpressionGroup[]> = {}

  metadata.forEach((row) => {
    if (!row.expressionId) return
    const plotData = plots.get(row.id)
    if (!plotData) return

    const trace = buildTrace(row, plotData)
    const collections = grouped[row.expressionSource] ?? []

    let existing = collections.find((group) => group.expressionId === row.expressionId)
    if (!existing) {
      existing = {
        expressionId: row.expressionId,
        expressionSource: row.expressionSource,
        expressionSourceLabel: row.expressionSourceLabel ?? row.expressionSource,
        expressionTime: row.expressionTime ?? null,
        traces: [],
        random: plotData.random.length ? plotData.random[0] : 0,
      }
      collections.push(existing)
    }

    existing.traces.push(trace)
    grouped[row.expressionSource] = collections
  })

  return grouped
}

const buildPayload = (
  regulatorId: string,
  metadata: RankResponseMetadataRow[],
  plots: Map<string, ProcessedPlotData>,
): RankResponseRegulatorPayload => {
  if (!metadata.length) {
    return {
      regulator: {
        id: regulatorId,
        symbol: 'Unknown',
        locusTag: null,
        label: 'Unknown',
      },
      metadata: [],
      expressionGroups: {},
    }
  }

  const representative = metadata[0]
  const regulator = {
    id: regulatorId,
    symbol: representative.regulatorSymbol ?? 'Unknown',
    locusTag: representative.regulatorLocusTag ?? null,
    label:
      representative.regulatorSymbol && representative.regulatorLocusTag
        ? `${representative.regulatorSymbol} (${representative.regulatorLocusTag})`
        : representative.regulatorSymbol ?? representative.regulatorLocusTag ?? 'Unknown',
  }

  const groups = groupByExpressionSource(metadata, plots)

  return {
    regulator,
    metadata,
    expressionGroups: groups,
  }
}

const loadRegulatorData = async (regulatorId: string): Promise<RankResponseRegulatorPayload> => {
  const metadata = await fetchMetadataForRegulator(regulatorId)
  if (!metadata.length) {
    return buildPayload(regulatorId, [], new Map())
  }
  const plotDataMap = await fetchReplicateData(metadata)
  return buildPayload(regulatorId, metadata, plotDataMap)
}

export async function GET(request: NextRequest, { params }: { params: { regulatorId?: string } }) {
  const regulatorIdParam = params.regulatorId ?? request.nextUrl.searchParams.get('regulatorId')

  if (!regulatorIdParam) {
    return NextResponse.json({ error: 'regulatorId parameter is required' }, { status: 400 })
  }

  if (!TFBP_API_TOKEN) {
    return NextResponse.json(
      { error: 'TFBP API token is not configured. Set TOKEN or TFBP_API_TOKEN.' },
      { status: 500 },
    )
  }

  const regulatorId = regulatorIdParam.trim()
  const refresh = request.nextUrl.searchParams.get('refresh')
  const bypassCache =
    refresh === '1' || refresh === 'true' || refresh === 'force' || refresh === 'refresh'

  const cached = regulatorCache.get(regulatorId)
  const now = Date.now()
  if (!bypassCache && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, {
      headers: { 'x-cache-status': 'hit', 'x-cache-age': String(now - cached.timestamp) },
    })
  }

  const existingInFlight = inFlightRequests.get(regulatorId)
  if (existingInFlight && (!bypassCache || !existingInFlight.bypassCache)) {
    try {
      const payload = await existingInFlight.promise
      return NextResponse.json(payload, {
        headers: { 'x-cache-status': 'busy', 'x-cache-age': '0' },
      })
    } catch (error) {
      inFlightRequests.delete(regulatorId)
      throw error
    }
  }

  const promise = loadRegulatorData(regulatorId)
    .then((payload) => {
      regulatorCache.set(regulatorId, { payload, timestamp: Date.now() })
      return payload
    })
    .finally(() => {
      inFlightRequests.delete(regulatorId)
    })

  inFlightRequests.set(regulatorId, { promise, bypassCache })

  try {
    const payload = await promise
    return NextResponse.json(payload, {
      headers: {
        'x-cache-status': cached ? 'miss' : 'warm',
        'x-cache-age': '0',
      },
    })
  } catch (error) {
    console.error('Failed to load regulator rank response data', error)
    return NextResponse.json(
      {
        error: 'Failed to load regulator rank response data',
        detail: (error as Error).message,
      },
      { status: 502 },
    )
  }
}

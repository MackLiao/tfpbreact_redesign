import { type NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { gunzipSync } from "zlib"
import { performance } from "node:perf_hooks"

import { RANKRESPONSE_URL, TFBP_API_TOKEN } from "@/lib/env"
import type { RankResponseMetadataRow, RankResponseMetadataResponse } from "@/lib/types"
import { getBindingSourceLabel, getPerturbationSourceLabel } from "@/lib/utils"

const NULL_LIKE_VALUES = new Set(["", "na", "nan", "none", "null"])

const CACHE_TTL_MS = 5 * 60 * 1000

class ApiError extends Error {
  status: number
  payload: Record<string, unknown>

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

let cachedPayload: RankResponseMetadataResponse | null = null
let cacheTimestamp = 0
let inFlightRequest: Promise<RankResponseMetadataResponse> | null = null

const shouldLogTiming = process.env.NODE_ENV !== "production"

const logTiming = (label: string, start: number) => {
  if (!shouldLogTiming) return
  const duration = performance.now() - start
  console.log(`[rankresponse] ${label} in ${duration.toFixed(1)}ms`)
}

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) return null
  if (NULL_LIKE_VALUES.has(trimmed.toLowerCase())) return null

  const numeric = Number(trimmed)
  return Number.isNaN(numeric) ? null : numeric
}

const ensureString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  return undefined
}

const normaliseRow = (row: Record<string, unknown>): RankResponseMetadataRow | null => {
  const bindingSource = ensureString(row.binding_source) ?? ensureString(row.bindingSource)
  const expressionSource = ensureString(row.expression_source) ?? ensureString(row.expressionSource)

  if (!bindingSource || !expressionSource) {
    return null
  }

  const regulatorSymbol = ensureString(row.regulator_symbol) ?? ensureString(row.regulatorSymbol) ?? "Unknown"

  const mapped: RankResponseMetadataRow = {
    id: ensureString(row.id) ?? ensureString(row.pk) ?? `${regulatorSymbol}-${bindingSource}`,
    bindingSource,
    bindingSourceLabel: getBindingSourceLabel(bindingSource) ?? bindingSource,
    expressionSource,
    expressionSourceLabel: getPerturbationSourceLabel(expressionSource) ?? expressionSource,
    regulatorSymbol,
    regulatorLocusTag: ensureString(row.regulator_locus_tag) ?? ensureString(row.regulatorLocusTag) ?? null,
    regulatorId: parseNumber(row.regulator_id ?? row.regulatorId),
    expressionId: ensureString(row.expression) ?? ensureString(row.expression_id) ?? null,
    promotersetsig: ensureString(row.promotersetsig) ?? null,
    rank25: parseNumber(row.rank_25 ?? row.rank25),
    rank50: parseNumber(row.rank_50 ?? row.rank50),
    dtoEmpiricalPvalue: parseNumber(row.dto_empirical_pvalue ?? row.dtoEmpiricalPvalue),
    dtoFdr: parseNumber(row.dto_fdr ?? row.dtoFdr),
    univariatePvalue: parseNumber(row.univariate_pvalue ?? row.univariatePvalue),
    univariateRsquared: parseNumber(row.univariate_rsquared ?? row.univariateRsquared),
    randomExpectation: parseNumber(row.random_expectation ?? row.randomExpectation),
    expressionTime: parseNumber(row.expression_time ?? row.expressionTime),
    bindingRankThreshold: parseNumber(row.binding_rank_threshold ?? row.bindingRankThreshold),
    perturbationRankThreshold: parseNumber(row.perturbation_rank_threshold ?? row.perturbationRankThreshold),
  }

  return mapped
}

const fetchRankResponseMetadata = async (): Promise<RankResponseMetadataResponse> => {
  console.log("[v0] Attempting to fetch rank response metadata...")
  console.log("[v0] RANKRESPONSE_URL:", RANKRESPONSE_URL ? "SET" : "NOT SET")
  console.log("[v0] TFBP_API_TOKEN:", TFBP_API_TOKEN ? "SET" : "NOT SET")

  if (!RANKRESPONSE_URL) {
    throw new ApiError(
      "RANKRESPONSE_URL environment variable is not configured. Please set RANKRESPONSE_URL or NEXT_PUBLIC_RANKRESPONSE_URL in the Vars section.",
      500,
    )
  }

  if (!TFBP_API_TOKEN) {
    throw new ApiError("TFBP API token is not configured. Please set TOKEN or TFBP_API_TOKEN in the Vars section.", 500)
  }

  const overallStart = performance.now()
  const url = `${RANKRESPONSE_URL}export/`

  const fetchStart = performance.now()
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Token ${TFBP_API_TOKEN}`,
      },
      cache: "no-store",
    })
  } catch (error) {
    console.error("Failed to reach rank response API", error)
    throw new ApiError("Failed to reach rank response API", 502, {
      detail: (error as Error).message,
    })
  }
  logTiming("upstream fetch", fetchStart)

  if (!response.ok) {
    const detail = await response.text()
    throw new ApiError("Rank response API returned an error response", response.status, {
      status: response.status,
      detail: detail.slice(0, 500),
    })
  }

  const bufferStart = performance.now()
  const buffer = Buffer.from(await response.arrayBuffer())
  logTiming("read response buffer", bufferStart)

  const unzipStart = performance.now()
  let csv: string
  try {
    // Convert Node.js Buffer to Uint8Array for gunzipSync compatibility
    csv = gunzipSync(new Uint8Array(buffer)).toString("utf-8")
    logTiming("gunzip payload", unzipStart)
  } catch (error) {
    // Fallback to treating the payload as plain UTF-8
    console.warn("Failed to gunzip rank response payload, falling back to plain UTF-8", error)
    csv = buffer.toString("utf-8")
  }

  const parseStart = performance.now()
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })
  logTiming("parse CSV", parseStart)

  if (parsed.errors.length) {
    console.warn("Papaparse encountered errors", parsed.errors.slice(0, 3))
  }

  const metadata: RankResponseMetadataRow[] = parsed.data
    .map((row) => normaliseRow(row))
    .filter((row): row is RankResponseMetadataRow => row !== null)

  const payload: RankResponseMetadataResponse = {
    metadata,
    sourceTimestamp: response.headers.get("last-modified") ?? undefined,
  }

  if (shouldLogTiming) {
    console.log(`[rankresponse] parsed ${metadata.length} rows in ${(performance.now() - overallStart).toFixed(1)}ms`)
  }

  return payload
}

export async function GET(request: NextRequest) {
  const refreshParam = request.nextUrl.searchParams.get("refresh")
  const bypassCache =
    refreshParam === "1" || refreshParam === "true" || refreshParam === "force" || refreshParam === "refresh"

  const now = Date.now()
  const hasCached = cachedPayload !== null
  const cacheAge = hasCached ? now - cacheTimestamp : Number.POSITIVE_INFINITY
  const cacheFresh = hasCached && cacheAge < CACHE_TTL_MS

  if (!bypassCache && cacheFresh && cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: { "x-cache-status": "hit", "x-cache-age": cacheAge.toString() },
    })
  }

  const shouldStartFetch = !inFlightRequest || bypassCache
  if (shouldStartFetch) {
    inFlightRequest = fetchRankResponseMetadata()
      .then((payload) => {
        cachedPayload = payload
        cacheTimestamp = Date.now()
        return payload
      })
      .finally(() => {
        inFlightRequest = null
      })
  }

  if (!bypassCache && cacheFresh === false && cachedPayload) {
    // Return stale data while refreshing in the background
    inFlightRequest?.catch((error) => {
      console.error("Background refresh for rank response metadata failed", error)
    })
    return NextResponse.json(cachedPayload, {
      headers: {
        "x-cache-status": "stale",
        "x-cache-age": cacheAge.toString(),
      },
    })
  }

  try {
    const payload = await inFlightRequest!
    return NextResponse.json(payload, {
      headers: {
        "x-cache-status": bypassCache ? "refresh" : hasCached ? "miss" : "warm",
        "x-cache-age": "0",
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, ...error.payload }, { status: error.status })
    }

    console.error("Unexpected error loading rank response metadata", error)
    return NextResponse.json(
      {
        error: "Unexpected error while loading rank response metadata",
        detail: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

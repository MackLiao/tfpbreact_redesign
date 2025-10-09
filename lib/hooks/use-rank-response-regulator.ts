"use client"

import { useEffect, useMemo, useState } from "react"

import type { RankResponseRegulatorPayload } from "@/lib/types"

interface RegulatorState {
  data: RankResponseRegulatorPayload | null
  isLoading: boolean
  error: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  payload: RankResponseRegulatorPayload
  timestamp: number
}

const regulatorCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<RankResponseRegulatorPayload>>()

const fetchRegulatorData = async (regulatorId: string): Promise<RankResponseRegulatorPayload> => {
  const response = await fetch(`/api/rankresponse/${encodeURIComponent(regulatorId)}`, { cache: "no-store" })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Rank response regulator request failed with status ${response.status}: ${detail.slice(0, 200)}`,
    )
  }
  return (await response.json()) as RankResponseRegulatorPayload
}

export const useRankResponseRegulator = (regulatorId: string | null) => {
  const [state, setState] = useState<RegulatorState>({
    data: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!regulatorId) {
      setState({ data: null, isLoading: false, error: null })
      return
    }

    let cancelled = false
    const cached = regulatorCache.get(regulatorId)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setState({ data: cached.payload, isLoading: false, error: null })
      return
    }

    const promise =
      inFlight.get(regulatorId) ??
      fetchRegulatorData(regulatorId).then((payload) => {
        regulatorCache.set(regulatorId, { payload, timestamp: Date.now() })
        return payload
      })

    inFlight.set(regulatorId, promise)
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    promise
      .then((payload) => {
        if (!cancelled) {
          setState({ data: payload, isLoading: false, error: null })
        }
      })
      .catch((error: Error) => {
        console.error("Failed to load rank response data for regulator", regulatorId, error)
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: error.message || "Failed to load regulator data" })
        }
      })
      .finally(() => {
        inFlight.delete(regulatorId)
      })

    return () => {
      cancelled = true
    }
  }, [regulatorId])

  const refresh = useMemo(
    () => async () => {
      if (!regulatorId) return
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const payload = await fetchRegulatorData(regulatorId)
        regulatorCache.set(regulatorId, { payload, timestamp: Date.now() })
        setState({ data: payload, isLoading: false, error: null })
      } catch (error) {
        console.error("Failed to refresh rank response regulator data", regulatorId, error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: (error as Error).message || "Failed to refresh regulator data",
        }))
      }
    },
    [regulatorId],
  )

  return { ...state, refresh }
}

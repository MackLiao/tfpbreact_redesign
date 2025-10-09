"use client"

import { useEffect, useMemo, useState } from "react"

import type { RankResponseMetadataResponse, RankResponseMetadataRow } from "@/lib/types"

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000

let cachedResponse: RankResponseMetadataResponse | null = null
let cachedAt = 0
let inFlightPromise: Promise<RankResponseMetadataResponse> | null = null

interface HookState {
  data: RankResponseMetadataRow[]
  isLoading: boolean
  error: string | null
  sourceTimestamp?: string
}

const loadMetadata = async (requestInit?: RequestInit): Promise<RankResponseMetadataResponse> => {
  const response = await fetch("/api/rankresponse", {
    cache: "no-store",
    ...requestInit,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Rank response metadata request failed with status ${response.status}: ${detail.slice(0, 200)}`,
    )
  }

  return (await response.json()) as RankResponseMetadataResponse
}

export const useRankResponseMetadata = (): HookState & { refresh: () => Promise<void> } => {
  const [state, setState] = useState<HookState>(() => {
    if (cachedResponse) {
      return {
        data: cachedResponse.metadata,
        isLoading: false,
        error: null,
        sourceTimestamp: cachedResponse.sourceTimestamp,
      }
    }

    return {
      data: [],
      isLoading: true,
      error: null,
      sourceTimestamp: undefined,
    }
  })

  useEffect(() => {
    let cancelled = false

    const shouldUseCache = cachedResponse && Date.now() - cachedAt < CLIENT_CACHE_TTL_MS
    if (shouldUseCache && cachedResponse && !cancelled) {
      setState({
        data: cachedResponse.metadata,
        isLoading: false,
        error: null,
        sourceTimestamp: cachedResponse.sourceTimestamp,
      })
      return () => {
        cancelled = true
      }
    }

    const promise =
      inFlightPromise ??
      loadMetadata().then((payload) => {
        cachedResponse = payload
        cachedAt = Date.now()
        return payload
      })

    inFlightPromise = promise

    promise
      .then((payload) => {
        if (!cancelled) {
          setState({
            data: payload.metadata,
            isLoading: false,
            error: null,
            sourceTimestamp: payload.sourceTimestamp,
          })
        }
      })
      .catch((error: Error) => {
        console.error("Failed to load rank response metadata on client", error)
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message || "Failed to load rank response metadata",
          }))
        }
      })
      .finally(() => {
        if (inFlightPromise === promise) {
          inFlightPromise = null
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useMemo(
    () => async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))
        const payload = await loadMetadata({ cache: "no-store" })
        cachedResponse = payload
        cachedAt = Date.now()
        setState({
          data: payload.metadata,
          isLoading: false,
          error: null,
          sourceTimestamp: payload.sourceTimestamp,
        })
      } catch (error) {
        console.error("Manual refresh for rank response metadata failed", error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: (error as Error).message || "Failed to refresh rank response metadata",
        }))
      }
    },
    [],
  )

  return { ...state, refresh }
}

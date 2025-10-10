import { NextResponse } from "next/server"

import { getPerturbationCorrelationData } from "@/lib/server/correlation-data"

export async function GET() {
  try {
    const payload = await getPerturbationCorrelationData()

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"

    return NextResponse.json(
      {
        error: "Failed to load perturbation correlation matrix",
        message: errorMessage,
      },
      {
        status: 500,
      },
    )
  }
}

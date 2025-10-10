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
    console.error("Failed to load perturbation correlation matrix", error)
    return NextResponse.json(
      { error: "Failed to load perturbation correlation matrix." },
      {
        status: 500,
      },
    )
  }
}


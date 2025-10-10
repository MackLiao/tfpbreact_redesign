import { NextResponse } from "next/server"

import { getPerturbationCorrelationData } from "@/lib/server/correlation-data"

export async function GET() {
  try {
    console.log("[v0] Attempting to load perturbation correlation data...")
    console.log(
      "[v0] PERTURBATION_CORRELATION_API env var:",
      process.env.PERTURBATION_CORRELATION_API ? "SET" : "NOT SET",
    )

    const payload = await getPerturbationCorrelationData()

    console.log("[v0] Successfully loaded perturbation correlation data")
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[v0] Failed to load perturbation correlation matrix:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    const isFileNotFound = errorMessage.includes("Unable to locate")
    const isMissingEnv = !process.env.PERTURBATION_CORRELATION_API

    let userMessage = "Failed to load perturbation correlation matrix."

    if (isMissingEnv && isFileNotFound) {
      userMessage =
        "Configuration required: Please set the PERTURBATION_CORRELATION_API environment variable or provide the response_data.csv file in the data/ directory."
    } else if (isMissingEnv) {
      userMessage = "Missing configuration: PERTURBATION_CORRELATION_API environment variable is not set."
    } else if (isFileNotFound) {
      userMessage = "Data file not found: response_data.csv is missing from the data/ directory."
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: errorMessage,
        hint: "Add environment variables in the Vars section of the v0 sidebar, or upload data files to the data/ directory.",
      },
      {
        status: 500,
      },
    )
  }
}

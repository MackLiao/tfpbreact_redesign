import { NextResponse } from "next/server"

import { getBindingCorrelationData } from "@/lib/server/correlation-data"

export async function GET() {
  try {
    console.log("[v0] Attempting to load binding correlation data...")
    console.log("[v0] BINDING_CORRELATION_API env var:", process.env.BINDING_CORRELATION_API ? "SET" : "NOT SET")

    const payload = await getBindingCorrelationData()

    console.log("[v0] Successfully loaded binding correlation data")
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[v0] Failed to load binding correlation matrix:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    const isFileNotFound = errorMessage.includes("Unable to locate")
    const isMissingEnv = !process.env.BINDING_CORRELATION_API

    let userMessage = "Failed to load binding correlation matrix."

    if (isMissingEnv && isFileNotFound) {
      userMessage =
        "Configuration required: Please set the BINDING_CORRELATION_API environment variable or provide the cc_predictors_normalized.csv file in the data/ directory."
    } else if (isMissingEnv) {
      userMessage = "Missing configuration: BINDING_CORRELATION_API environment variable is not set."
    } else if (isFileNotFound) {
      userMessage = "Data file not found: cc_predictors_normalized.csv is missing from the data/ directory."
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

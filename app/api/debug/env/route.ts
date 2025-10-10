import { NextResponse } from "next/server"

export async function GET() {
  // Check all expected environment variables
  const envStatus = {
    BINDING_CORRELATION_API: {
      exists: !!process.env.BINDING_CORRELATION_API,
      length: process.env.BINDING_CORRELATION_API?.length || 0,
      firstChars: process.env.BINDING_CORRELATION_API?.substring(0, 10) || "undefined",
      hasWhitespace: process.env.BINDING_CORRELATION_API?.trim() !== process.env.BINDING_CORRELATION_API,
    },
    PERTURBATION_CORRELATION_API: {
      exists: !!process.env.PERTURBATION_CORRELATION_API,
      length: process.env.PERTURBATION_CORRELATION_API?.length || 0,
      firstChars: process.env.PERTURBATION_CORRELATION_API?.substring(0, 10) || "undefined",
      hasWhitespace: process.env.PERTURBATION_CORRELATION_API?.trim() !== process.env.PERTURBATION_CORRELATION_API,
    },
    RANKRESPONSE_URL: {
      exists: !!process.env.RANKRESPONSE_URL,
      length: process.env.RANKRESPONSE_URL?.length || 0,
      firstChars: process.env.RANKRESPONSE_URL?.substring(0, 10) || "undefined",
      hasWhitespace: process.env.RANKRESPONSE_URL?.trim() !== process.env.RANKRESPONSE_URL,
    },
    NEXT_PUBLIC_RANKRESPONSE_URL: {
      exists: !!process.env.NEXT_PUBLIC_RANKRESPONSE_URL,
      length: process.env.NEXT_PUBLIC_RANKRESPONSE_URL?.length || 0,
      firstChars: process.env.NEXT_PUBLIC_RANKRESPONSE_URL?.substring(0, 10) || "undefined",
      hasWhitespace: process.env.NEXT_PUBLIC_RANKRESPONSE_URL?.trim() !== process.env.NEXT_PUBLIC_RANKRESPONSE_URL,
    },
    TFBP_API_TOKEN: {
      exists: !!process.env.TFBP_API_TOKEN,
      length: process.env.TFBP_API_TOKEN?.length || 0,
      hasWhitespace: process.env.TFBP_API_TOKEN?.trim() !== process.env.TFBP_API_TOKEN,
    },
    TOKEN: {
      exists: !!process.env.TOKEN,
      length: process.env.TOKEN?.length || 0,
      hasWhitespace: process.env.TOKEN?.trim() !== process.env.TOKEN,
    },
    BASE_URL: {
      exists: !!process.env.BASE_URL,
      length: process.env.BASE_URL?.length || 0,
      firstChars: process.env.BASE_URL?.substring(0, 10) || "undefined",
      hasWhitespace: process.env.BASE_URL?.trim() !== process.env.BASE_URL,
    },
  }

  // Count how many are set
  const totalVars = Object.keys(envStatus).length
  const setVars = Object.values(envStatus).filter((v) => v.exists).length

  return NextResponse.json({
    summary: `${setVars} of ${totalVars} environment variables are set`,
    details: envStatus,
    timestamp: new Date().toISOString(),
  })
}

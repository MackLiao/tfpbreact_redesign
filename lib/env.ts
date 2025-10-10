const appendTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`)

const rawRankResponseUrl =
  process.env.RANKRESPONSE_URL ??
  process.env.NEXT_PUBLIC_RANKRESPONSE_URL ??
  (process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/?$/, "")}/api/rankresponse` : undefined)

console.log("[v0] env.ts - Environment variables:", {
  RANKRESPONSE_URL: process.env.RANKRESPONSE_URL,
  NEXT_PUBLIC_RANKRESPONSE_URL: process.env.NEXT_PUBLIC_RANKRESPONSE_URL,
  BASE_URL: process.env.BASE_URL,
  TFBP_API_TOKEN: process.env.TFBP_API_TOKEN,
  TOKEN: process.env.TOKEN,
  computed_RANKRESPONSE_URL: rawRankResponseUrl,
  allEnvKeys: Object.keys(process.env).filter(
    (key) => key.includes("RANK") || key.includes("TOKEN") || key.includes("BASE") || key.includes("CORRELATION"),
  ),
})

export const RANKRESPONSE_URL = rawRankResponseUrl ? appendTrailingSlash(rawRankResponseUrl) : undefined

export const TFBP_API_TOKEN = process.env.TFBP_API_TOKEN ?? process.env.TOKEN ?? undefined

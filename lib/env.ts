const appendTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`)

const rawRankResponseUrl =
  process.env.RANKRESPONSE_URL ??
  process.env.NEXT_PUBLIC_RANKRESPONSE_URL ??
  (process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/?$/, '')}/api/rankresponse` : undefined)

export const RANKRESPONSE_URL = rawRankResponseUrl ? appendTrailingSlash(rawRankResponseUrl) : undefined

export const TFBP_API_TOKEN = process.env.TFBP_API_TOKEN ?? process.env.TOKEN ?? undefined

import { promises as fs } from "node:fs"
import path from "node:path"
import Papa from "papaparse"

export interface CorrelationMatrixPayload {
  labels: string[]
  matrix: number[][]
  min: number
  max: number
}

type NumericTable = Array<Record<string, unknown>>

type LoaderOptions = {
  dropColumns?: Set<string>
}

const DATA_DIRECTORY = path.join(process.cwd(), "data")

const isValidCorrelationPayload = (value: unknown): value is CorrelationMatrixPayload => {
  if (typeof value !== "object" || value === null) return false
  const payload = value as Record<string, unknown>
  return (
    Array.isArray(payload.labels) &&
    Array.isArray(payload.matrix) &&
    typeof payload.min === "number" &&
    typeof payload.max === "number"
  )
}

const parseNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

const computePearsonCorrelation = (xValues: (number | null)[], yValues: (number | null)[]): number => {
  let count = 0
  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumYY = 0
  let sumXY = 0

  for (let index = 0; index < xValues.length; index += 1) {
    const x = xValues[index]
    const y = yValues[index]
    if (x === null || y === null) continue

    count += 1
    sumX += x
    sumY += y
    sumXX += x * x
    sumYY += y * y
    sumXY += x * y
  }

  if (count < 2) return 0

  const cov = sumXY - (sumX * sumY) / count
  const varX = sumXX - (sumX * sumX) / count
  const varY = sumYY - (sumY * sumY) / count

  if (varX <= 0 || varY <= 0) return 0

  const denominator = Math.sqrt(varX * varY)
  if (!denominator || Number.isNaN(denominator)) return 0

  const correlation = cov / denominator
  if (!Number.isFinite(correlation)) return 0
  if (correlation > 1) return 1
  if (correlation < -1) return -1
  return correlation
}

const computeCorrelationMatrix = (columns: (number | null)[][]): { matrix: number[][]; min: number; max: number } => {
  const size = columns.length
  const matrix: number[][] = Array.from({ length: size }, () => Array<number>(size).fill(0))
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    for (let colIndex = rowIndex; colIndex < size; colIndex += 1) {
      const correlation =
        rowIndex === colIndex ? 1 : computePearsonCorrelation(columns[rowIndex], columns[colIndex])

      matrix[rowIndex][colIndex] = correlation
      matrix[colIndex][rowIndex] = correlation

      if (rowIndex !== colIndex) {
        if (correlation < min) min = correlation
        if (correlation > max) max = correlation
      }
    }
  }

  if (min === Number.POSITIVE_INFINITY) min = 0
  if (max === Number.NEGATIVE_INFINITY) max = 1

  return { matrix, min, max }
}

const loadCsvTable = async (filename: string): Promise<NumericTable> => {
  const csvPath = path.join(DATA_DIRECTORY, filename)
  const fileContents = await fs.readFile(csvPath, "utf8")

  const parsed = Papa.parse<Record<string, unknown>>(fileContents, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors.length) {
    console.warn(`Papaparse encountered ${parsed.errors.length} errors while parsing ${filename}`, parsed.errors[0])
  }

  return parsed.data
}

const loadCorrelationData = async (
  filename: string,
  options: LoaderOptions = {},
): Promise<CorrelationMatrixPayload> => {
  const table = await loadCsvTable(filename)
  if (!table.length) {
    return { labels: [], matrix: [], min: 0, max: 1 }
  }

  const dropColumns = options.dropColumns ?? new Set<string>()
  const firstRow = table[0]
  const rawFields = Object.keys(firstRow)

  const labels = rawFields.filter((field) => field !== "target_symbol" && !dropColumns.has(field))

  const columnValues: (number | null)[][] = labels.map(() => [])

  table.forEach((row) => {
    labels.forEach((label, columnIndex) => {
      const raw = row[label]
      const numeric = parseNumericValue(raw)
      columnValues[columnIndex].push(numeric)
    })
  })

  const { matrix, min, max } = computeCorrelationMatrix(columnValues)
  return { labels, matrix, min, max }
}

const fetchCorrelationFromApi = async (url: string): Promise<CorrelationMatrixPayload | null> => {
  try {
    const response = await fetch(url, {
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`Correlation API responded with status ${response.status}`)
    }
    const json = await response.json()
    if (!isValidCorrelationPayload(json)) {
      throw new Error("Correlation API response was not in the expected format.")
    }
    return json
  } catch (error) {
    console.warn(`Failed to load correlation data from API (${url}):`, error)
    return null
  }
}

const createLoader = (filename: string, options: LoaderOptions = {}, apiUrl?: string) => {
  let cachedPromise: Promise<CorrelationMatrixPayload> | null = null

  return async (): Promise<CorrelationMatrixPayload> => {
    if (!cachedPromise) {
      cachedPromise = (async () => {
        if (apiUrl) {
          const fromApi = await fetchCorrelationFromApi(apiUrl)
          if (fromApi) {
            return fromApi
          }
        }
        return loadCorrelationData(filename, options)
      })()
    }
    return cachedPromise
  }
}

export const getBindingCorrelationData = createLoader("cc_predictors_normalized.csv", {
  dropColumns: new Set(["red_median"]),
}, process.env.BINDING_CORRELATION_API)

export const getPerturbationCorrelationData = createLoader(
  "response_data.csv",
  {},
  process.env.PERTURBATION_CORRELATION_API,
)

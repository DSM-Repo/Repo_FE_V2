const QR_VERSION_SPECS = [
  { alignmentPatternCenter: 0, dataCodewords: 19, errorCodewords: 7, size: 21, version: 1 },
  { alignmentPatternCenter: 18, dataCodewords: 34, errorCodewords: 10, size: 25, version: 2 },
  { alignmentPatternCenter: 22, dataCodewords: 55, errorCodewords: 15, size: 29, version: 3 },
  { alignmentPatternCenter: 26, dataCodewords: 80, errorCodewords: 20, size: 33, version: 4 },
  { alignmentPatternCenter: 30, dataCodewords: 108, errorCodewords: 26, size: 37, version: 5 },
] as const

const FORMAT_BITS_LOW_ERROR_MASK_ZERO = 0x77c4

type QrVersionSpec = (typeof QR_VERSION_SPECS)[number]
type QrCell = boolean | undefined

export type QrCodeMatrix = {
  readonly cells: readonly (readonly boolean[])[]
  readonly size: number
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push(((value >>> index) & 1) === 1 ? 1 : 0)
  }
}

function toBytes(bits: readonly number[]) {
  const bytes: number[] = []

  for (let index = 0; index < bits.length; index += 8) {
    let byte = 0

    for (let offset = 0; offset < 8; offset += 1) {
      byte = (byte << 1) | (bits[index + offset] ?? 0)
    }

    bytes.push(byte)
  }

  return bytes
}

function multiplyGalois(left: number, right: number) {
  let product = 0
  let multiplicand = left
  let multiplier = right

  while (multiplier > 0) {
    if ((multiplier & 1) !== 0) {
      product ^= multiplicand
    }

    multiplicand <<= 1

    if ((multiplicand & 0x100) !== 0) {
      multiplicand ^= 0x11d
    }

    multiplier >>>= 1
  }

  return product
}

function powGalois(value: number, exponent: number) {
  let result = 1

  for (let index = 0; index < exponent; index += 1) {
    result = multiplyGalois(result, value)
  }

  return result
}

function createReedSolomonGenerator(degree: number) {
  let coefficients = [1]

  for (let index = 0; index < degree; index += 1) {
    const nextCoefficients = new Array<number>(coefficients.length + 1).fill(0)
    const root = powGalois(2, index)

    coefficients.forEach((coefficient, coefficientIndex) => {
      nextCoefficients[coefficientIndex] ^= multiplyGalois(coefficient, root)
      nextCoefficients[coefficientIndex + 1] ^= coefficient
    })
    coefficients = nextCoefficients
  }

  return coefficients.slice(1)
}

function createReedSolomonRemainder(dataCodewords: readonly number[], degree: number) {
  const generator = createReedSolomonGenerator(degree)
  const remainder = new Array<number>(degree).fill(0)

  dataCodewords.forEach((dataCodeword) => {
    const shiftedCodeword = remainder.shift() ?? 0
    const factor = dataCodeword ^ shiftedCodeword
    remainder.push(0)

    generator.forEach((coefficient, index) => {
      remainder[index] ^= multiplyGalois(coefficient, factor ?? 0)
    })
  })

  return remainder
}

function selectVersion(byteLength: number) {
  return QR_VERSION_SPECS.find((spec) => {
    const bitLength = 4 + 8 + byteLength * 8
    return bitLength <= spec.dataCodewords * 8
  })
}

function createDataCodewords(value: string, spec: QrVersionSpec) {
  const encoder = new TextEncoder()
  const dataBytes = [...encoder.encode(value)]
  const bits: number[] = []

  appendBits(bits, 0b0100, 4)
  appendBits(bits, dataBytes.length, 8)

  dataBytes.forEach((byte) => appendBits(bits, byte, 8))

  const capacityBits = spec.dataCodewords * 8
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length))

  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  const codewords = toBytes(bits)
  const padBytes = [0xec, 0x11]
  let padIndex = 0

  while (codewords.length < spec.dataCodewords) {
    codewords.push(padBytes[padIndex % padBytes.length])
    padIndex += 1
  }

  return codewords
}

function setCell(cells: QrCell[][], reserved: boolean[][], row: number, column: number, value: boolean) {
  if (row < 0 || column < 0 || row >= cells.length || column >= cells.length) {
    return
  }

  cells[row][column] = value
  reserved[row][column] = true
}

function setDataCell(cells: QrCell[][], row: number, column: number, value: boolean) {
  if (row < 0 || column < 0 || row >= cells.length || column >= cells.length) {
    return
  }

  cells[row][column] = value
}

function drawFinderPattern(cells: QrCell[][], reserved: boolean[][], row: number, column: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const distanceFromEdge = Math.max(Math.abs(x - 3), Math.abs(y - 3))
      const isDark = distanceFromEdge !== 2 && distanceFromEdge !== 4
      setCell(cells, reserved, row + y, column + x, isDark)
    }
  }
}

function drawAlignmentPattern(cells: QrCell[][], reserved: boolean[][], center: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distanceFromCenter = Math.max(Math.abs(x), Math.abs(y))
      setCell(cells, reserved, center + y, center + x, distanceFromCenter !== 1)
    }
  }
}

function drawFunctionPatterns(cells: QrCell[][], reserved: boolean[][], spec: QrVersionSpec) {
  const lastFinderStart = spec.size - 7

  drawFinderPattern(cells, reserved, 0, 0)
  drawFinderPattern(cells, reserved, 0, lastFinderStart)
  drawFinderPattern(cells, reserved, lastFinderStart, 0)

  for (let index = 8; index < spec.size - 8; index += 1) {
    const isDark = index % 2 === 0
    setCell(cells, reserved, 6, index, isDark)
    setCell(cells, reserved, index, 6, isDark)
  }

  if (spec.alignmentPatternCenter > 0) {
    drawAlignmentPattern(cells, reserved, spec.alignmentPatternCenter)
  }

  setCell(cells, reserved, spec.size - 8, 8, true)

  for (let index = 0; index < 9; index += 1) {
    if (index !== 6) {
      reserved[8][index] = true
      reserved[index][8] = true
    }
  }

  for (let index = 0; index < 8; index += 1) {
    reserved[spec.size - 1 - index][8] = true
    reserved[8][spec.size - 1 - index] = true
  }
}

function drawFormatBits(cells: QrCell[][], reserved: boolean[][]) {
  const size = cells.length
  const getBit = (index: number) => ((FORMAT_BITS_LOW_ERROR_MASK_ZERO >>> index) & 1) !== 0

  for (let index = 0; index <= 5; index += 1) {
    setCell(cells, reserved, 8, index, getBit(index))
  }

  setCell(cells, reserved, 8, 7, getBit(6))
  setCell(cells, reserved, 8, 8, getBit(7))
  setCell(cells, reserved, 7, 8, getBit(8))

  for (let index = 9; index < 15; index += 1) {
    setCell(cells, reserved, 14 - index, 8, getBit(index))
  }

  for (let index = 0; index < 8; index += 1) {
    setCell(cells, reserved, size - 1 - index, 8, getBit(index))
  }

  for (let index = 8; index < 15; index += 1) {
    setCell(cells, reserved, 8, size - 15 + index, getBit(index))
  }
}

function placeData(cells: QrCell[][], reserved: boolean[][], codewords: readonly number[]) {
  const dataBits: boolean[] = []

  codewords.forEach((codeword) => {
    for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
      dataBits.push(((codeword >>> bitIndex) & 1) !== 0)
    }
  })

  const size = cells.length
  let bitIndex = 0
  let upward = true

  for (let rightColumn = size - 1; rightColumn >= 1; rightColumn -= 2) {
    const adjustedRightColumn = rightColumn === 6 ? 5 : rightColumn

    for (let rowOffset = 0; rowOffset < size; rowOffset += 1) {
      const row = upward ? size - 1 - rowOffset : rowOffset

      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const column = adjustedRightColumn - columnOffset

        if (reserved[row][column]) {
          continue
        }

        const shouldMask = (row + column) % 2 === 0
        setDataCell(cells, row, column, (dataBits[bitIndex] ?? false) !== shouldMask)
        bitIndex += 1
      }
    }

    upward = !upward

    if (rightColumn === 7) {
      rightColumn -= 1
    }
  }
}

export function createQrCodeMatrix(value: string): QrCodeMatrix | undefined {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return undefined
  }

  const byteLength = new TextEncoder().encode(normalizedValue).length
  const spec = selectVersion(byteLength)

  if (!spec) {
    return undefined
  }

  const dataCodewords = createDataCodewords(normalizedValue, spec)
  const errorCodewords = createReedSolomonRemainder(dataCodewords, spec.errorCodewords)
  const codewords = [...dataCodewords, ...errorCodewords]
  const cells: QrCell[][] = Array.from({ length: spec.size }, () => Array.from({ length: spec.size }, () => undefined))
  const reserved = Array.from({ length: spec.size }, () => Array.from({ length: spec.size }, () => false))

  drawFunctionPatterns(cells, reserved, spec)
  placeData(cells, reserved, codewords)
  drawFormatBits(cells, reserved)

  return {
    cells: cells.map((row) => row.map((cell) => cell ?? false)),
    size: spec.size,
  }
}

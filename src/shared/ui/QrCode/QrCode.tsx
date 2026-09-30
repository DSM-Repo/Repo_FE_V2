import { createQrCodeMatrix } from '@/shared/lib/qrCode'

import styles from './QrCode.module.css'

export type QrCodeProps = {
  readonly label: string
  readonly value: string
}

export function QrCode({ label, value }: QrCodeProps) {
  const qrCode = createQrCodeMatrix(value)

  if (!qrCode) {
    return null
  }

  const quietZone = 4
  const viewBoxSize = qrCode.size + quietZone * 2

  return (
    <svg aria-label={label} className={styles.qrCode} role="img" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} xmlns="http://www.w3.org/2000/svg">
      <rect fill="currentColor" height={0} width={0} />
      {qrCode.cells.map((row, rowIndex) =>
        row.map((isDark, columnIndex) =>
          isDark ? (
            <rect
              fill="currentColor"
              height="1"
              key={`${rowIndex}-${columnIndex}`}
              width="1"
              x={columnIndex + quietZone}
              y={rowIndex + quietZone}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

import { QRCodeSVG } from 'qrcode.react'

import styles from './QrCode.module.css'

export type QrCodeProps = {
  readonly label: string
  readonly value: string
}

export function QrCode({ label, value }: QrCodeProps) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  return (
    <QRCodeSVG
      aria-label={label}
      bgColor="#ffffff"
      className={styles.qrCode}
      fgColor="#111111"
      level="M"
      marginSize={4}
      role="img"
      shapeRendering="crispEdges"
      title={label}
      value={normalizedValue}
    />
  )
}

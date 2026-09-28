declare module 'cloudflare:sockets' {
  export type SocketAddress = {
    hostname: string
    port: number
  }

  export type SocketOptions = {
    allowHalfOpen?: boolean
    secureTransport?: 'off' | 'on' | 'starttls'
  }

  export type Socket = {
    close(): void
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
  }

  export function connect(address: SocketAddress | string, options?: SocketOptions): Socket
}

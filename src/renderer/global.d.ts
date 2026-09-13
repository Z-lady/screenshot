import type {
  OverlayInitPayload,
  ScreenshotCompletePayload
} from '../shared/types'

export {}

declare global {
  interface Window {
    screenshotApi: {
      start(): Promise<{ provider: string }>
      getInit(): Promise<OverlayInitPayload>
      complete(payload: ScreenshotCompletePayload): Promise<void>
      cancel(sessionId: string): Promise<void>
      onCompleted(
        callback: (payload: {
          dataUrl: string
          displayId: string
        }) => void
      ): () => void
    }
  }
}

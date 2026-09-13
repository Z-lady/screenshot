export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayInfo {
  id: string
  bounds: Rect
  workArea: Rect
  scaleFactor: number
  rotation: number
}

export interface CaptureFrame {
  display: DisplayInfo
  imageDataUrl: string
  pixelWidth: number
  pixelHeight: number
}

export interface OverlayInitPayload extends CaptureFrame {
  sessionId: string
}

export interface ScreenshotCompletePayload {
  sessionId: string
  dataUrl: string
  displayId: string
}

export type AnnotationTool = 'select' | 'rect' | 'arrow' | 'pen'

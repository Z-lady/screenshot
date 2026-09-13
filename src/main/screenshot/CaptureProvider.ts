import type { Display } from 'electron'
import type { CaptureFrame } from '../../shared/types'

export interface CaptureProvider {
  readonly name: string

  captureDisplays(displays: Display[]): Promise<CaptureFrame[]>
}

import type { Display } from 'electron'
import type { CaptureProvider } from './CaptureProvider'
import type { CaptureFrame } from '../../shared/types'

/**
 * Final production extension point.
 *
 * Windows:
 *   ScreenshotHelper.exe
 *   CaptureBackend:
 *     - GDI (first stable backend / fallback)
 *     - WGC (modern backend candidate)
 *     - DXGI (continuous capture / special cases)
 *
 * macOS:
 *   ScreenshotHelper
 *   CaptureBackend:
 *     - ScreenCaptureKit (primary)
 *     - CoreGraphics (legacy/fallback)
 *
 * V1 protocol:
 *   JSON Lines over stdio
 *   image transport: temporary PNG path
 *
 * V2:
 *   shared memory / memory-mapped file
 */
export class NativeHelperCaptureProvider implements CaptureProvider {
  readonly name = 'native-helper'

  async captureDisplays(_displays: Display[]): Promise<CaptureFrame[]> {
    throw new Error(
      'Native helper is intentionally not enabled in the runnable test path. ' +
      'See native/screenshot-helper/README.md.'
    )
  }
}

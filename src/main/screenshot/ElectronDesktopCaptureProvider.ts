import { desktopCapturer, type Display } from 'electron'
import type { CaptureProvider } from './CaptureProvider'
import type { CaptureFrame } from '../../shared/types'

export class ElectronDesktopCaptureProvider implements CaptureProvider {
  readonly name = 'electron-desktop-capturer'

  async captureDisplays(displays: Display[]): Promise<CaptureFrame[]> {
    if (displays.length === 0) {
      return []
    }

    const maxPixelWidth = Math.max(
      ...displays.map((d) =>
        Math.max(1, Math.round(d.bounds.width * d.scaleFactor))
      )
    )

    const maxPixelHeight = Math.max(
      ...displays.map((d) =>
        Math.max(1, Math.round(d.bounds.height * d.scaleFactor))
      )
    )

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: maxPixelWidth,
        height: maxPixelHeight
      },
      fetchWindowIcons: false
    })

    return displays.map((display, index) => {
      let source = sources.find(
        (item) => item.display_id === String(display.id)
      )

      // Some platforms / Electron versions may not populate display_id.
      // Index fallback is deliberately limited to an equal-size source list.
      if (!source && sources.length === displays.length) {
        source = sources[index]
      }

      if (!source) {
        throw new Error(
          `Unable to map display ${display.id} to a desktop capture source.`
        )
      }

      const size = source.thumbnail.getSize()

      return {
        display: {
          id: String(display.id),
          bounds: {
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height
          },
          workArea: {
            x: display.workArea.x,
            y: display.workArea.y,
            width: display.workArea.width,
            height: display.workArea.height
          },
          scaleFactor: display.scaleFactor,
          rotation: display.rotation
        },
        imageDataUrl: source.thumbnail.toDataURL(),
        pixelWidth: size.width,
        pixelHeight: size.height
      }
    })
  }
}

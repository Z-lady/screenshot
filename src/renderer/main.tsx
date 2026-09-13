import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type {
  AnnotationTool,
  OverlayInitPayload,
  Rect
} from '../shared/types'
import './styles.css'

interface Point {
  x: number
  y: number
}

interface BaseShape {
  id: string
  color: string
  lineWidth: number
}

interface RectShape extends BaseShape {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

interface ArrowShape extends BaseShape {
  type: 'arrow'
  from: Point
  to: Point
}

interface PenShape extends BaseShape {
  type: 'pen'
  points: Point[]
}

type Shape = RectShape | ArrowShape | PenShape

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape
): void {
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (shape.type === 'rect') {
    ctx.strokeRect(
      shape.x,
      shape.y,
      shape.width,
      shape.height
    )
  }

  if (shape.type === 'pen') {
    if (shape.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(shape.points[0].x, shape.points[0].y)
      for (const p of shape.points.slice(1)) {
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }
  }

  if (shape.type === 'arrow') {
    const { from, to } = shape
    const angle = Math.atan2(
      to.y - from.y,
      to.x - from.x
    )
    const head = 12

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(
      to.x - head * Math.cos(angle - Math.PI / 6),
      to.y - head * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      to.x - head * Math.cos(angle + Math.PI / 6),
      to.y - head * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

function drawShapes(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[]
): void {
  for (const shape of shapes) {
    drawShape(ctx, shape)
  }
}

function MainPage(): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(
    null
  )
  const [provider, setProvider] = useState<string>('未启动')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return window.screenshotApi.onCompleted((payload) => {
      setPreview(payload.dataUrl)
    })
  }, [])

  const start = async () => {
    setBusy(true)
    setError(null)

    try {
      const result = await window.screenshotApi.start()
      setProvider(result.provider)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="home">
      <section className="hero">
        <div>
          <div className="tag">
            Electron Screenshot v1.1 Test
          </div>
          <h1>截图功能测试工程</h1>
          <p>
            当前默认使用 desktopCapturer 作为临时测试
            CaptureProvider。UI、Overlay、标注和输出层已经与
            CaptureProvider 解耦，后续可替换为独立
            ScreenshotHelper。
          </p>
          <div className="provider">
            当前 CaptureProvider：{provider}
          </div>
        </div>

        <button
          className="start-btn"
          disabled={busy}
          onClick={() => void start()}
        >
          {busy ? '启动中…' : '截屏'}
        </button>
      </section>

      {error && (
        <div className="error">
          <strong>截图启动失败：</strong>
          {error}
        </div>
      )}

      <section className="cards">
        <article>
          <h2>本版要测试什么</h2>
          <ul>
            <li>主窗口隐藏后抓屏</li>
            <li>每个显示器创建独立 Overlay</li>
            <li>选区与 8 个 resize handle</li>
            <li>矩形、箭头、画笔</li>
            <li>Ctrl/Cmd+Z 撤销</li>
            <li>Enter / ✓ 完成</li>
            <li>Esc / × 取消</li>
            <li>结果写入系统剪贴板</li>
          </ul>
        </article>

        <article>
          <h2>暂未启用</h2>
          <ul>
            <li>Native ScreenshotHelper</li>
            <li>Windows GDI/WGC/DXGI</li>
            <li>macOS ScreenCaptureKit</li>
            <li>窗口自动吸附</li>
            <li>文字、马赛克、取色器</li>
            <li>Shared Memory 图像传输</li>
          </ul>
        </article>
      </section>

      <section className="preview">
        <h2>最近一次截图</h2>
        {preview ? (
          <img src={preview} />
        ) : (
          <div className="empty">
            完成一次截图后，这里会显示结果。
          </div>
        )}
      </section>
    </main>
  )
}

function Toolbar(props: {
  tool: AnnotationTool
  canUndo: boolean
  onTool(tool: AnnotationTool): void
  onUndo(): void
  onCancel(): void
  onConfirm(): void
}): React.JSX.Element {
  const tools: Array<{
    id: AnnotationTool
    label: string
    icon: string
  }> = [
    { id: 'select', label: '选择', icon: '↖' },
    { id: 'rect', label: '矩形', icon: '□' },
    { id: 'arrow', label: '箭头', icon: '↗' },
    { id: 'pen', label: '画笔', icon: '✎' }
  ]

  return (
    <div className="toolbar" data-ui="true">
      {tools.map((item) => (
        <button
          key={item.id}
          className={
            props.tool === item.id ? 'active' : ''
          }
          title={item.label}
          onClick={() => props.onTool(item.id)}
        >
          {item.icon}
        </button>
      ))}

      <button disabled title="文字：后续实现">
        T
      </button>
      <button disabled title="马赛克：后续实现">
        ▦
      </button>

      <span className="sep" />

      <button
        title="撤销"
        disabled={!props.canUndo}
        onClick={props.onUndo}
      >
        ↶
      </button>
      <button
        className="danger"
        title="取消"
        onClick={props.onCancel}
      >
        ×
      </button>
      <button
        className="confirm"
        title="完成"
        onClick={props.onConfirm}
      >
        ✓
      </button>
    </div>
  )
}

function AnnotationCanvas(props: {
  width: number
  height: number
  tool: AnnotationTool
  shapes: Shape[]
  onShapes(shapes: Shape[]): void
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const [draft, setDraft] = useState<Shape | null>(null)
  const start = useRef<Point | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.max(
      1,
      Math.round(props.width * dpr)
    )
    canvas.height = Math.max(
      1,
      Math.round(props.height * dpr)
    )

    canvas.style.width = `${props.width}px`
    canvas.style.height = `${props.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, props.width, props.height)

    drawShapes(
      ctx,
      draft
        ? [...props.shapes, draft]
        : props.shapes
    )
  }, [
    props.width,
    props.height,
    props.shapes,
    draft
  ])

  const localPoint = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point => {
    const box = e.currentTarget.getBoundingClientRect()

    return {
      x: e.clientX - box.left,
      y: e.clientY - box.top
    }
  }

  const down = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (props.tool === 'select') return

    e.currentTarget.setPointerCapture(e.pointerId)

    const p = localPoint(e)
    start.current = p

    const common = {
      id: crypto.randomUUID(),
      color: '#ff4d4f',
      lineWidth: 3
    }

    if (props.tool === 'rect') {
      setDraft({
        ...common,
        type: 'rect',
        x: p.x,
        y: p.y,
        width: 0,
        height: 0
      })
    }

    if (props.tool === 'arrow') {
      setDraft({
        ...common,
        type: 'arrow',
        from: p,
        to: p
      })
    }

    if (props.tool === 'pen') {
      setDraft({
        ...common,
        type: 'pen',
        points: [p]
      })
    }
  }

  const move = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!draft || !start.current) return

    const p = localPoint(e)

    if (draft.type === 'rect') {
      const normalized = normalizeRect(
        start.current.x,
        start.current.y,
        p.x,
        p.y
      )

      setDraft({
        ...draft,
        ...normalized
      })
    }

    if (draft.type === 'arrow') {
      setDraft({
        ...draft,
        to: p
      })
    }

    if (draft.type === 'pen') {
      setDraft({
        ...draft,
        points: [...draft.points, p]
      })
    }
  }

  const up = () => {
    if (draft) {
      props.onShapes([...props.shapes, draft])
    }

    setDraft(null)
    start.current = null
  }

  return (
    <canvas
      ref={ref}
      className="annotation-canvas"
      data-ui="true"
      style={{
        pointerEvents:
          props.tool === 'select' ? 'none' : 'auto',
        cursor:
          props.tool === 'select'
            ? 'default'
            : 'crosshair'
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    />
  )
}

const handles = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w'
]

function ScreenshotOverlay(): React.JSX.Element {
  const [init, setInit] =
    useState<OverlayInitPayload | null>(null)

  const [selection, setSelection] =
    useState<Rect | null>(null)

  const [tool, setTool] =
    useState<AnnotationTool>('select')

  const [shapes, setShapes] =
    useState<Shape[]>([])

  const [error, setError] =
    useState<string | null>(null)

  const root = useRef<HTMLDivElement>(null)

  const drag = useRef<{
    mode: 'create' | 'move' | 'resize'
    startX: number
    startY: number
    origin: Rect
    handle?: string
  } | null>(null)

  useEffect(() => {
    window.screenshotApi
      .getInit()
      .then(setInit)
      .catch((e) => setError(String(e)))
  }, [])

  const cancel = async () => {
    if (init) {
      await window.screenshotApi.cancel(init.sessionId)
    }
  }

  const confirm = async () => {
    if (
      !init ||
      !selection ||
      selection.width < 4 ||
      selection.height < 4
    ) {
      return
    }

    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = init.imageDataUrl
      }
    )

    const scaleX =
      image.naturalWidth / window.innerWidth

    const scaleY =
      image.naturalHeight / window.innerHeight

    const output =
      document.createElement('canvas')

    output.width = Math.max(
      1,
      Math.round(selection.width * scaleX)
    )

    output.height = Math.max(
      1,
      Math.round(selection.height * scaleY)
    )

    const ctx = output.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      image,
      selection.x * scaleX,
      selection.y * scaleY,
      selection.width * scaleX,
      selection.height * scaleY,
      0,
      0,
      output.width,
      output.height
    )

    ctx.save()
    ctx.scale(scaleX, scaleY)
    drawShapes(ctx, shapes)
    ctx.restore()

    await window.screenshotApi.complete({
      sessionId: init.sessionId,
      displayId: init.display.id,
      dataUrl: output.toDataURL('image/png')
    })
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        void cancel()
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        void confirm()
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'z'
      ) {
        event.preventDefault()
        setShapes((items) => items.slice(0, -1))
      }
    }

    window.addEventListener('keydown', handler)

    return () =>
      window.removeEventListener('keydown', handler)
  })

  const point = (
    event: React.PointerEvent
  ): Point => ({
    x: clamp(
      event.clientX,
      0,
      window.innerWidth
    ),
    y: clamp(
      event.clientY,
      0,
      window.innerHeight
    )
  })

  const down = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (tool !== 'select') return

    const target = event.target as HTMLElement

    if (target.closest('[data-ui="true"]')) {
      return
    }

    root.current?.setPointerCapture(event.pointerId)

    const p = point(event)
    const handle = target.dataset.handle

    if (selection && handle) {
      drag.current = {
        mode: 'resize',
        startX: p.x,
        startY: p.y,
        origin: selection,
        handle
      }
      return
    }

    if (
      selection &&
      target.closest('[data-selection="true"]')
    ) {
      drag.current = {
        mode: 'move',
        startX: p.x,
        startY: p.y,
        origin: selection
      }
      return
    }

    setSelection({
      x: p.x,
      y: p.y,
      width: 0,
      height: 0
    })

    setShapes([])

    drag.current = {
      mode: 'create',
      startX: p.x,
      startY: p.y,
      origin: {
        x: p.x,
        y: p.y,
        width: 0,
        height: 0
      }
    }
  }

  const move = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const state = drag.current
    if (!state) return

    const p = point(event)
    const dx = p.x - state.startX
    const dy = p.y - state.startY

    if (state.mode === 'create') {
      setSelection(
        normalizeRect(
          state.startX,
          state.startY,
          p.x,
          p.y
        )
      )
      return
    }

    if (state.mode === 'move') {
      setSelection({
        ...state.origin,
        x: clamp(
          state.origin.x + dx,
          0,
          window.innerWidth - state.origin.width
        ),
        y: clamp(
          state.origin.y + dy,
          0,
          window.innerHeight - state.origin.height
        )
      })
      return
    }

    if (
      state.mode === 'resize' &&
      state.handle
    ) {
      let left = state.origin.x
      let top = state.origin.y
      let right =
        state.origin.x + state.origin.width
      let bottom =
        state.origin.y + state.origin.height

      if (state.handle.includes('w')) {
        left += dx
      }
      if (state.handle.includes('e')) {
        right += dx
      }
      if (state.handle.includes('n')) {
        top += dy
      }
      if (state.handle.includes('s')) {
        bottom += dy
      }

      left = clamp(
        left,
        0,
        window.innerWidth
      )
      right = clamp(
        right,
        0,
        window.innerWidth
      )
      top = clamp(
        top,
        0,
        window.innerHeight
      )
      bottom = clamp(
        bottom,
        0,
        window.innerHeight
      )

      setSelection(
        normalizeRect(
          left,
          top,
          right,
          bottom
        )
      )
    }
  }

  const up = () => {
    drag.current = null
  }

  if (error) {
    return (
      <div className="overlay-status">
        <strong>截图层启动失败</strong>
        <span>{error}</span>
      </div>
    )
  }

  if (!init) {
    return (
      <div className="overlay-status">
        正在准备截图…
      </div>
    )
  }

  const valid =
    !!selection &&
    selection.width >= 4 &&
    selection.height >= 4

  const toolbarLeft = selection
    ? clamp(
        selection.x,
        8,
        Math.max(8, window.innerWidth - 430)
      )
    : 8

  const toolbarTop = selection
    ? selection.y +
        selection.height +
        62 <
      window.innerHeight
      ? selection.y + selection.height + 12
      : Math.max(8, selection.y - 60)
    : 8

  const physicalW = selection
    ? Math.round(
        selection.width *
          (init.pixelWidth / window.innerWidth)
      )
    : 0

  const physicalH = selection
    ? Math.round(
        selection.height *
          (init.pixelHeight / window.innerHeight)
      )
    : 0

  return (
    <div
      ref={root}
      className="overlay-root"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <img
        className="frozen"
        src={init.imageDataUrl}
        draggable={false}
      />

      {!selection && <div className="dim-full" />}

      {selection && (
        <>
          <div
            className="dim"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: selection.y
            }}
          />

          <div
            className="dim"
            style={{
              left: 0,
              top: selection.y,
              width: selection.x,
              height: selection.height
            }}
          />

          <div
            className="dim"
            style={{
              left:
                selection.x + selection.width,
              top: selection.y,
              right: 0,
              height: selection.height
            }}
          />

          <div
            className="dim"
            style={{
              left: 0,
              top:
                selection.y +
                selection.height,
              right: 0,
              bottom: 0
            }}
          />

          <div
            className="selection"
            data-selection="true"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height
            }}
          >
            {valid && (
              <AnnotationCanvas
                width={selection.width}
                height={selection.height}
                tool={tool}
                shapes={shapes}
                onShapes={setShapes}
              />
            )}

            {handles.map((h) => (
              <span
                key={h}
                className={`handle h-${h}`}
                data-handle={h}
              />
            ))}

            {valid && (
              <div
                className="size-label"
                data-ui="true"
              >
                {physicalW} × {physicalH}
              </div>
            )}
          </div>

          {valid && (
            <div
              className="toolbar-wrap"
              data-ui="true"
              style={{
                left: toolbarLeft,
                top: toolbarTop
              }}
            >
              <Toolbar
                tool={tool}
                canUndo={shapes.length > 0}
                onTool={setTool}
                onUndo={() =>
                  setShapes((items) =>
                    items.slice(0, -1)
                  )
                }
                onCancel={() => void cancel()}
                onConfirm={() => void confirm()}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function App(): React.JSX.Element {
  const mode = new URLSearchParams(
    window.location.search
  ).get('mode')

  return mode === 'screenshot'
    ? <ScreenshotOverlay />
    : <MainPage />
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

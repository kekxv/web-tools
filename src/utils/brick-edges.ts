import type { Pixels, TileBox } from './brick-assistant'

const wholeImage = (image: Pixels): TileBox => ({ x: 0, y: 0, width: image.width, height: image.height })
type Colour = [number, number, number]

/** The board connects through the gaps; individual bevels remain separate regions. */
export function tileBackground(image: Pixels, faces: TileBox[], region = wholeImage(image)): Colour | null {
  const left = Math.max(0, Math.floor(region.x)), top = Math.max(0, Math.floor(region.y))
  const right = Math.min(image.width, Math.ceil(region.x + region.width)), bottom = Math.min(image.height, Math.ceil(region.y + region.height))
  const width = right - left, height = bottom - top
  if (width <= 0 || height <= 0) return null
  const seen = new Uint8Array(width * height), queue = new Int32Array(width * height)
  for (const face of faces) {
    const x0 = Math.max(left, Math.ceil(face.x)), x1 = Math.min(right, Math.floor(face.x + face.width))
    const y0 = Math.max(top, Math.ceil(face.y)), y1 = Math.min(bottom, Math.floor(face.y + face.height))
    if (x1 <= x0 || y1 <= y0) continue
    for (let y = y0; y < y1; y++) seen.fill(1, (y - top) * width + x0 - left, (y - top) * width + x1 - left)
  }
  let largest = 0, best: Colour | null = null
  for (let start = 0; start < seen.length; start++) {
    if (seen[start]) continue
    const offset = ((top + Math.floor(start / width)) * image.width + left + start % width) * 4
    const reference: Colour = [image.data[offset], image.data[offset + 1], image.data[offset + 2]]
    let head = 0, tail = 1
    const sum: Colour = [0, 0, 0]
    queue[0] = start; seen[start] = 1
    const visit = (next: number) => {
      if (seen[next]) return
      const i = ((top + Math.floor(next / width)) * image.width + left + next % width) * 4
      if (reference.some((value, c) => Math.abs(image.data[i + c] - value) > 24)) return
      seen[next] = 1; queue[tail++] = next
    }
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width)
      const i = ((top + y) * image.width + left + x) * 4
      for (let c = 0; c < 3; c++) sum[c] += image.data[i + c]
      if (x > 0) visit(p - 1)
      if (x + 1 < width) visit(p + 1)
      if (y > 0) visit(p - width)
      if (y + 1 < height) visit(p + width)
    }
    if (tail > largest) { largest = tail; best = sum.map(value => value / tail) as Colour }
  }
  return best
}

/** Stop before another face, leaving room for unequal bevel thicknesses. */
export function tileSearchRegion(image: Pixels, seed: TileBox, others: TileBox[]): TileBox {
  let left = 0, top = 0, right = image.width, bottom = image.height
  for (const box of others) {
    if (box === seed) continue
    const overlapY = Math.min(seed.y + seed.height, box.y + box.height) - Math.max(seed.y, box.y)
    const overlapX = Math.min(seed.x + seed.width, box.x + box.width) - Math.max(seed.x, box.x)
    if (overlapY > seed.height * 0.5) {
      if (box.x >= seed.x + seed.width) right = Math.min(right, box.x)
      if (box.x + box.width <= seed.x) left = Math.max(left, box.x + box.width)
    }
    if (overlapX > seed.width * 0.5) {
      if (box.y >= seed.y + seed.height) bottom = Math.min(bottom, box.y)
      if (box.y + box.height <= seed.y) top = Math.max(top, box.y + box.height)
    }
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Refine a pale face seed to its outer bevel, using edges supported along a side. */
export function traceTileEdges(image: Pixels, seed: TileBox, region = wholeImage(image), background = tileBackground(image, [seed])): TileBox {
  const side = Math.max(seed.width, seed.height)
  const reach = Math.max(3, Math.ceil(side * 0.35))
  const limits = {
    left: Math.max(0, Math.ceil(region.x), Math.floor(seed.x) - reach),
    top: Math.max(0, Math.ceil(region.y), Math.floor(seed.y) - reach),
    right: Math.min(image.width, Math.floor(region.x + region.width), Math.ceil(seed.x + seed.width) + reach),
    bottom: Math.min(image.height, Math.floor(region.y + region.height), Math.ceil(seed.y + seed.height) + reach),
  }
  const distance = (offset: number) => background ?
    Math.abs(image.data[offset] - background[0]) + Math.abs(image.data[offset + 1] - background[1]) + Math.abs(image.data[offset + 2] - background[2]) : 0
  const edge = (axis: 'x' | 'y', outward: -1 | 1): number => {
    const horizontal = axis === 'x'
    const start = horizontal ? seed.x : seed.y, span = horizontal ? seed.width : seed.height
    const boundary = outward < 0 ? start : start + span
    const tangentStart = horizontal ? seed.y : seed.x, tangentSpan = horizontal ? seed.height : seed.width
    const tangentLimit = horizontal ? image.height : image.width
    const from = Math.max(0, Math.ceil(tangentStart + tangentSpan * 0.12))
    const to = Math.min(tangentLimit, Math.floor(tangentStart + tangentSpan * 0.88))
    const low = horizontal ? limits.left : limits.top, high = horizontal ? limits.right : limits.bottom
    let best = Math.max(low, Math.min(high, Math.round(boundary)))
    // Small inward allowance corrects anti-aliasing at the downscaled seed boundary.
    const inset = Math.max(2, Math.ceil(span * 0.06))
    const first = Math.max(low, Math.floor(boundary - (outward < 0 ? reach : inset)))
    const last = Math.min(high, Math.ceil(boundary + (outward < 0 ? inset : reach)))
    let found = false
    for (let at = first; at <= last; at++) {
      const inside = outward < 0 ? at : at - 1, outside = outward < 0 ? at - 1 : at
      const normalLimit = horizontal ? image.width : image.height
      if (inside < 0 || outside < 0 || inside >= normalLimit || outside >= normalLimit) continue
      let support = 0, count = 0
      for (let t = from; t < to; t++) {
        const i = (horizontal ? t * image.width + inside : inside * image.width + t) * 4
        const o = (horizontal ? t * image.width + outside : outside * image.width + t) * 4
        const dr = image.data[i] - image.data[o], dg = image.data[i + 1] - image.data[o + 1], db = image.data[i + 2] - image.data[o + 2]
        // The outside approaches board colour, even when the bevel is darker than it.
        const leavesBrick = background ? distance(i) - distance(o) > 6 : dr + dg + db > 6
        // A strong edge may belong to the wooden frame beyond a board-coloured
        // gap. It only supports this brick if it connects back to the face.
        let connected = true
        if (background && leavesBrick) {
          const anchor = Math.max(0, Math.min(normalLimit - 1, Math.round(boundary) - outward * inset))
          for (let normal = Math.min(inside, anchor); normal <= Math.max(inside, anchor); normal++) {
            const offset = (horizontal ? t * image.width + normal : normal * image.width + t) * 4
            if (distance(offset) < 24) { connected = false; break }
          }
        }
        if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) >= 12 && leavesBrick && connected) support++
        count++
      }
      if (count < 3 || support < count * 0.6) continue
      if (!found || (outward < 0 ? at < best : at > best)) best = at
      found = true
    }
    // A frame boundary has no outside pixel. Keep the visible bevel up to the frame
    // only when foreground connects it to this face without crossing a board gap.
    const frame = outward < 0 ? 0 : (horizontal ? image.width : image.height)
    if (background && (outward < 0 ? low === frame : high === frame) && Math.abs(frame - boundary) <= reach) {
      let connected = 0
      for (let t = from; t < to; t++) {
        let foreground = true
        for (let at = Math.min(best, frame); at < Math.max(best, frame); at++) {
          const offset = (horizontal ? t * image.width + at : at * image.width + t) * 4
          if (distance(offset) < 24) { foreground = false; break }
        }
        if (foreground) connected++
      }
      if (to - from >= 3 && connected >= (to - from) * 0.6) best = frame
    }
    return best
  }
  const left = edge('x', -1), right = edge('x', 1), top = edge('y', -1), bottom = edge('y', 1)
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }
}

/**
 * Find the main brick face in a search window, excluding disconnected neighbour slivers.
 * `others` bounds the edge search with bricks that lie outside the window: a cell alone cannot
 * tell where the next brick starts, so a trace without them may run into a neighbour or a frame.
 */
export function findTileBounds(image: Pixels, region = wholeImage(image), others: TileBox[] = []): TileBox | null {
  const found = findTileFace(image, region)
  if (!found) return null
  const faces = others.length ? [...found.faces, ...others] : found.faces
  return traceTileEdges(image, found.face, tileSearchRegion(image, found.face, faces), found.background)
}

/** The bright brick face and the other bright regions of the window, without edge tracing. */
export function findTileFace(image: Pixels, region = wholeImage(image)): { face: TileBox; faces: TileBox[]; background: Colour | null } | null {
  const left = Math.max(0, Math.floor(region.x)), top = Math.max(0, Math.floor(region.y))
  const right = Math.min(image.width, Math.ceil(region.x + region.width)), bottom = Math.min(image.height, Math.ceil(region.y + region.height))
  const width = right - left, height = bottom - top
  if (width < 4 || height < 4) return null
  const brightness = new Float32Array(width * height)
  let darkest = 255, brightest = 0
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = ((top + y) * image.width + left + x) * 4
    const value = Math.min(image.data[i], image.data[i + 1], image.data[i + 2])
    brightness[y * width + x] = value
    darkest = Math.min(darkest, value); brightest = Math.max(brightest, value)
  }
  if (brightest - darkest < 24) return null
  const cut = darkest + (brightest - darkest) * 0.55
  const seen = new Uint8Array(width * height), queue = new Int32Array(width * height)
  let best: TileBox | null = null, largest = 0
  const faces: TileBox[] = []
  for (let start = 0; start < brightness.length; start++) {
    if (seen[start] || brightness[start] < cut) continue
    let head = 0, tail = 1, minX = width, minY = height, maxX = 0, maxY = 0
    queue[0] = start; seen[start] = 1
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      const visit = (next: number) => {
        if (!seen[next] && brightness[next] >= cut) { seen[next] = 1; queue[tail++] = next }
      }
      if (x > 0) visit(p - 1)
      if (x + 1 < width) visit(p + 1)
      if (y > 0) visit(p - width)
      if (y + 1 < height) visit(p + width)
    }
    const face = { x: left + minX, y: top + minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    faces.push(face)
    if (tail <= largest || tail < width * height * 0.12 || face.width < width * 0.3 || face.height < height * 0.3) continue
    largest = tail
    best = face
  }
  // The search window locates the face; the real brick may extend across its edge.
  if (!best) return null
  const margin = Math.max(best.width, best.height) * 0.4
  const background = tileBackground(image, faces, { x: left - margin, y: top - margin, width: width + margin * 2, height: height + margin * 2 })
  return { face: best, faces, background }
}

/** Reject board texture and glare when a cell had no lattice detection.
 * The test is relative to the tile itself: themes may use dark, blue, green or
 * purple faces, so no fixed "pale" or green channel is required.
 */
export function isTileCandidate(image: Pixels, box: TileBox): boolean {
  const left = Math.max(0, Math.floor(box.x)), top = Math.max(0, Math.floor(box.y))
  const right = Math.min(image.width, Math.ceil(box.x + box.width)), bottom = Math.min(image.height, Math.ceil(box.y + box.height))
  if (right - left < 8 || bottom - top < 8) return false
  const face = [0, 0, 0], rim = [0, 0, 0], faceCount = { value: 0 }, rimCount = { value: 0 }
  for (let y = top; y < bottom; y += 2) for (let x = left; x < right; x += 2) {
    const i = (y * image.width + x) * 4, nx = (x - left + 0.5) / (right - left), ny = (y - top + 0.5) / (bottom - top)
    const target = nx > 0.18 && nx < 0.82 && ny > 0.16 && ny < 0.78 ? face : rim
    const count = target === face ? faceCount : rimCount
    for (let c = 0; c < 3; c++) target[c] += image.data[i + c]
    count.value++
  }
  if (faceCount.value < 4 || rimCount.value < 4) return false
  const center = face.map(value => value / faceCount.value), edge = rim.map(value => value / rimCount.value)
  const contrast = center.reduce((sum, value, c) => sum + Math.abs(value - edge[c]), 0)
  if (contrast < 24) return false
  // A real tile has a supported rim on at least two sides. This rejects a
  // uniform background and a white glare patch without naming a theme colour.
  let supported = 0
  for (const [x0, y0, x1, y1] of [[0.02, 0.16, 0.12, 0.84], [0.88, 0.16, 0.98, 0.84], [0.16, 0.02, 0.84, 0.12], [0.16, 0.84, 0.84, 0.98]]) {
    let hits = 0, total = 0
    for (let y = Math.floor(top + (bottom - top) * y0); y < Math.ceil(top + (bottom - top) * y1); y += 2) for (let x = Math.floor(left + (right - left) * x0); x < Math.ceil(left + (right - left) * x1); x += 2) {
      const i = (y * image.width + x) * 4
      if (Math.abs(image.data[i] - center[0]) + Math.abs(image.data[i + 1] - center[1]) + Math.abs(image.data[i + 2] - center[2]) > 18) hits++
      total++
    }
    if (total && hits / total > 0.35) supported++
  }
  return supported >= 2
}

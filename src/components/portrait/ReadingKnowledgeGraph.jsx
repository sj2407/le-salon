import { useState, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'

const RADIUS = 3.2

function escapeHtml(text) {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function hemispherePoints(count, front) {
  const points = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < count; i++) {
    const y = 0.9 - (i / (count - 1 || 1)) * 1.8
    const radiusAtY = Math.sqrt(Math.max(0.01, 1 - y * y))
    const theta = 2 * Math.PI * i / goldenRatio
    const x = radiusAtY * Math.cos(theta)
    const rawZ = radiusAtY * Math.sin(theta)
    const z = front ? Math.abs(rawZ) + 0.2 : -(Math.abs(rawZ) + 0.2)
    const len = Math.sqrt(x * x + y * y + z * z) || 1
    points.push(new THREE.Vector3(
      (x / len) * RADIUS, (y / len) * RADIUS, (z / len) * RADIUS
    ))
  }
  return points
}

/**
 * 3D interactive reading knowledge graph.
 * Visualizes book-theme connections on a rotating sphere.
 *
 * @param {Object} props
 * @param {Array} props.books - Full books array from Portrait.jsx
 * @param {Object} props.readingGraph - { themes: [{id, label, color}], edges: [{book_id, theme_id}] }
 */
export const ReadingKnowledgeGraph = ({ books, readingGraph }) => {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef({})
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)
  const [dims, setDims] = useState({ w: 780, h: 488 })
  const [webglError, setWebglError] = useState(false)

  const { themes, edges } = readingGraph

  // Build lookup maps from props
  const bookMap = useMemo(() => {
    const map = {}
    books.forEach(b => { map[b.id] = b })
    return map
  }, [books])

  const themeMap = useMemo(() => {
    const map = {}
    themes.forEach(t => { map[t.id] = t })
    return map
  }, [themes])

  // Only include books that appear in edges
  const graphBooks = useMemo(() => {
    const bookIds = new Set(edges.map(e => e.book_id))
    return books.filter(b => bookIds.has(b.id))
  }, [books, edges])

  // Theme connection counts
  const themeBookCount = useMemo(() => {
    const counts = {}
    themes.forEach(t => { counts[t.id] = edges.filter(e => e.theme_id === t.id).length })
    return counts
  }, [themes, edges])

  const maxCount = useMemo(() => Math.max(1, ...Object.values(themeBookCount)), [themeBookCount])

  // Precompute node positions
  const nodePositions = useMemo(() => {
    const pos = {}
    const bookPts = hemispherePoints(graphBooks.length, true)
    graphBooks.forEach((b, i) => { pos[b.id] = bookPts[i] })
    const themePts = hemispherePoints(themes.length, false)
    themes.forEach((t, i) => { pos[t.id] = themePts[i] })
    return pos
  }, [graphBooks, themes])

  // "Reads most like" detail panel data
  const sharedBooks = useMemo(() => {
    if (selected?.type !== 'book') return []
    const myThemes = edges.filter(e => e.book_id === selected.id).map(e => e.theme_id)
    const others = {}
    edges.forEach(e => {
      if (e.book_id !== selected.id && myThemes.includes(e.theme_id)) {
        if (!others[e.book_id]) others[e.book_id] = []
        others[e.book_id].push(e.theme_id)
      }
    })
    return Object.entries(others).sort((a, b) => b[1].length - a[1].length).slice(0, 5)
  }, [selected, edges])

  useEffect(() => { selectedRef.current = selected }, [selected])

  // Responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      const w = containerRef.current.clientWidth
      if (w > 0) {
        const h = Math.round(w / 1.6)
        setDims({ w, h })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Resize renderer/camera when dims change (without rebuilding scene)
  useEffect(() => {
    const { renderer, camera } = sceneRef.current
    if (renderer && camera) {
      renderer.setSize(dims.w, dims.h)
      camera.aspect = dims.w / dims.h
      camera.updateProjectionMatrix()
    }
  }, [dims])

  // Main Three.js scene setup
  useEffect(() => {
    if (!canvasRef.current || graphBooks.length === 0) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#FDFCF9')

    const camera = new THREE.PerspectiveCamera(45, dims.w / dims.h, 0.1, 100)
    camera.position.set(0, 0, 10.5)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    } catch {
      setWebglError(true)
      return
    }
    renderer.setSize(dims.w, dims.h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const dir = new THREE.DirectionalLight(0xffffff, 0.35)
    dir.position.set(5, 5, 5)
    scene.add(dir)

    const root = new THREE.Group()
    scene.add(root)

    // Wireframe sphere
    const wireGeo = new THREE.SphereGeometry(RADIUS, 32, 24)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xE8E0D8, wireframe: true, transparent: true, opacity: 0.08 })
    root.add(new THREE.Mesh(wireGeo, wireMat))

    const meshMap = {}
    const allMeshes = []

    // Book nodes (front hemisphere)
    graphBooks.forEach(b => {
      const pos = nodePositions[b.id]
      if (!pos) return
      const stars = b.rating != null ? Math.round(b.rating / 2) : 0
      const r = stars === 5 ? 0.09 : 0.065
      const geo = new THREE.SphereGeometry(r, 20, 20)
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(stars === 5 ? '#2C2216' : '#7A6E62'),
        shininess: 20,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      mesh.userData = { type: 'book', id: b.id }
      root.add(mesh)
      meshMap[b.id] = mesh

      const hitGeo = new THREE.SphereGeometry(0.35, 8, 8)
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitMesh = new THREE.Mesh(hitGeo, hitMat)
      hitMesh.position.copy(pos)
      hitMesh.userData = { type: 'book', id: b.id }
      root.add(hitMesh)
      allMeshes.push(hitMesh)
    })

    // Theme nodes (back hemisphere — larger hit spheres since they project smaller)
    themes.forEach(t => {
      const pos = nodePositions[t.id]
      if (!pos) return
      const boldness = themeBookCount[t.id] / maxCount
      const r = 0.05 + boldness * 0.06
      const geo = new THREE.SphereGeometry(r, 16, 16)
      const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(t.color), shininess: 15 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      mesh.userData = { type: 'theme', id: t.id }
      root.add(mesh)
      meshMap[t.id] = mesh

      const hitGeo = new THREE.SphereGeometry(0.45, 8, 8)
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitMesh = new THREE.Mesh(hitGeo, hitMat)
      hitMesh.position.copy(pos)
      hitMesh.userData = { type: 'theme', id: t.id }
      root.add(hitMesh)
      allMeshes.push(hitMesh)
    })

    // Edge tubes
    const edgeLines = []
    edges.forEach(e => {
      const p1 = nodePositions[e.book_id]
      const p2 = nodePositions[e.theme_id]
      if (!p1 || !p2) return

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      mid.multiplyScalar(0.35)

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)
      const themePct = themeBookCount[e.theme_id] / graphBooks.length
      const tubeRadius = 0.006 + themePct * 0.025

      const tubeGeo = new THREE.TubeGeometry(curve, 20, tubeRadius, 6, false)
      const tubeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(themeMap[e.theme_id]?.color || '#999'),
        transparent: true,
        opacity: 0.55,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      tubeMesh.userData = { book: e.book_id, theme: e.theme_id }
      root.add(tubeMesh)
      edgeLines.push(tubeMesh)
    })

    // Raycaster
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function performRaycast(clientX, clientY) {
      const rect = canvasRef.current.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(allMeshes)
      if (hits.length > 0) {
        const h = hits[0].object.userData
        setSelected(prev => (prev?.id === h.id) ? null : { type: h.type, id: h.id })
      } else {
        setSelected(null)
      }
    }

    // Drag rotation state
    let isDragging = false, prevX = 0, prevY = 0
    let mouseDownX = 0, mouseDownY = 0, mouseMoved = false
    let autoRotate = true
    let dragTimeout
    const CLICK_THRESHOLD = 5

    // Mouse events — track movement to distinguish click from drag
    function onMouseDown(e) {
      isDragging = true
      prevX = e.clientX; prevY = e.clientY
      mouseDownX = e.clientX; mouseDownY = e.clientY
      mouseMoved = false
      autoRotate = false; clearTimeout(dragTimeout)
    }
    function onMouseMove(e) {
      if (!isDragging) return
      if (Math.abs(e.clientX - mouseDownX) > CLICK_THRESHOLD || Math.abs(e.clientY - mouseDownY) > CLICK_THRESHOLD) {
        mouseMoved = true
      }
      root.rotation.y += (e.clientX - prevX) * 0.005
      root.rotation.x += (e.clientY - prevY) * 0.003
      root.rotation.x = Math.max(-0.8, Math.min(0.8, root.rotation.x))
      prevX = e.clientX; prevY = e.clientY
    }
    function onMouseUp(e) {
      const wasDragging = mouseMoved
      isDragging = false
      dragTimeout = setTimeout(() => { autoRotate = true }, 2000)
      // Only raycast if mouse barely moved (click, not drag)
      if (!wasDragging) {
        performRaycast(e.clientX, e.clientY)
      }
    }
    canvasRef.current.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // Touch events (mobile)
    let touchStartX = 0, touchStartY = 0, touchMoved = false
    const TOUCH_THRESHOLD = 10

    function onTouchStart(e) {
      e.preventDefault()
      const t = e.touches[0]
      touchStartX = t.clientX; touchStartY = t.clientY
      prevX = t.clientX; prevY = t.clientY
      touchMoved = false; isDragging = true
      autoRotate = false; clearTimeout(dragTimeout)
    }
    function onTouchMove(e) {
      e.preventDefault()
      if (!isDragging) return
      const t = e.touches[0]
      if (Math.abs(t.clientX - touchStartX) > TOUCH_THRESHOLD || Math.abs(t.clientY - touchStartY) > TOUCH_THRESHOLD) {
        touchMoved = true
      }
      root.rotation.y += (t.clientX - prevX) * 0.005
      root.rotation.x += (t.clientY - prevY) * 0.003
      root.rotation.x = Math.max(-0.8, Math.min(0.8, root.rotation.x))
      prevX = t.clientX; prevY = t.clientY
    }
    function onTouchEnd(e) {
      isDragging = false
      dragTimeout = setTimeout(() => { autoRotate = true }, 2000)
      if (!touchMoved && e.changedTouches[0]) {
        const t = e.changedTouches[0]
        performRaycast(t.clientX, t.clientY)
      }
    }
    canvasRef.current.addEventListener('touchstart', onTouchStart, { passive: false })
    canvasRef.current.addEventListener('touchmove', onTouchMove, { passive: false })
    canvasRef.current.addEventListener('touchend', onTouchEnd)

    sceneRef.current = { root, meshMap, edgeLines, allMeshes, renderer, camera }

    // Label click handler — attached to labels overlay, delegates via data attributes
    function onLabelClick(e) {
      const label = e.target.closest('[data-node-id]')
      if (!label) return
      const nodeId = label.dataset.nodeId
      const nodeType = label.dataset.nodeType
      if (nodeId && nodeType) {
        setSelected(prev => (prev?.id === nodeId) ? null : { type: nodeType, id: nodeId })
      }
    }
    const labelsEl = containerRef.current?.querySelector('.labels-layer')
    if (labelsEl) labelsEl.addEventListener('click', onLabelClick)

    let frame
    function animate() {
      frame = requestAnimationFrame(animate)

      if (autoRotate) {
        root.rotation.y += 0.0008
      }

      // Highlight based on selection
      const sel = selectedRef.current
      const connEdges = sel
        ? new Set(edges.filter(e => sel.type === 'book' ? e.book_id === sel.id : e.theme_id === sel.id).map(e => `${e.book_id}|${e.theme_id}`))
        : null
      const connIds = sel
        ? new Set(edges.filter(e => sel.type === 'book' ? e.book_id === sel.id : e.theme_id === sel.id).flatMap(e => [e.book_id, e.theme_id]))
        : null

      allMeshes.forEach(m => {
        const isConn = !connIds || connIds.has(m.userData.id)
        m.material.opacity = isConn ? 1 : 0.06
        m.material.transparent = true
      })

      edgeLines.forEach(l => {
        const key = `${l.userData.book}|${l.userData.theme}`
        const isConn = !connEdges || connEdges.has(key)
        l.material.opacity = isConn ? (connEdges ? 0.7 : 0.35) : 0.02
      })

      // Current canvas dimensions for label projection
      const cw = renderer.domElement.clientWidth
      const ch = renderer.domElement.clientHeight

      // Update labels
      if (labelsEl) {
        let html = ''
        const allNodes = [
          ...graphBooks.map(b => ({
            id: b.id, type: 'book',
            label: b.title.length > 20 ? b.title.slice(0, 18) + '\u2026' : b.title,
            sub: b.author,
          })),
          ...themes.map(t => ({
            id: t.id, type: 'theme',
            label: t.label, color: t.color,
            count: themeBookCount[t.id],
          })),
        ]
        allNodes.forEach(n => {
          const mesh = meshMap[n.id]
          if (!mesh) return
          const v = new THREE.Vector3()
          mesh.getWorldPosition(v)
          v.project(camera)
          if (v.z > 1) return

          const x = (v.x * 0.5 + 0.5) * cw
          const y = (-v.y * 0.5 + 0.5) * ch
          const depth = (v.z + 1) / 2
          const opacity = Math.max(0.7, 1 - depth * 0.3)
          const scale = 0.85 + (1 - depth) * 0.3

          const isConn = !connIds || connIds.has(n.id)
          const finalOpacity = isConn ? opacity : opacity * 0.1

          if (n.type === 'book') {
            html += `<div data-node-id="${escapeHtml(n.id)}" data-node-type="book" style="position:absolute;left:${x}px;top:${y - 4 * scale}px;transform:translate(-50%,0);
              padding:4px 8px;cursor:pointer;pointer-events:auto;text-align:center;
              opacity:${finalOpacity};">
              <div style="font:italic 900 ${14 * scale}px/1.3 'Source Serif 4',Georgia,serif;color:#1A1512;
                white-space:nowrap;text-shadow:0 0 6px #F5F1EB,0 0 12px #F5F1EB,0 0 20px #F5F1EB;">${escapeHtml(n.label)}</div>
              <div style="font:${10 * scale}px 'DM Sans',sans-serif;color:#5C4A3A;font-weight:600;
                white-space:nowrap;opacity:0.8;text-shadow:0 0 6px #F5F1EB,0 0 12px #F5F1EB;">${escapeHtml(n.sub)}</div>
            </div>`
          } else {
            const boldness = n.count / maxCount
            const fw = 700 + Math.round(boldness * 200)
            html += `<div data-node-id="${escapeHtml(n.id)}" data-node-type="theme" style="position:absolute;left:${x}px;top:${y - 4 * scale}px;transform:translate(-50%,0);
              padding:4px 8px;cursor:pointer;pointer-events:auto;text-align:center;
              opacity:${finalOpacity};">
              <div style="font:${(12 + boldness * 3) * scale}px 'DM Sans',sans-serif;color:#1A1512;
                font-weight:${fw};white-space:nowrap;text-shadow:0 0 6px #F5F1EB,0 0 12px #F5F1EB,0 0 20px #F5F1EB;">${escapeHtml(n.label)}</div>
              <div style="font:bold ${9 * scale}px 'DM Sans',sans-serif;color:#6B5F53;
                white-space:nowrap;opacity:0.7;text-shadow:0 0 6px #FDFCF9;">${n.count} book${n.count !== 1 ? 's' : ''}</div>
            </div>`
          }
        })
        labelsEl.innerHTML = html
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(dragTimeout)
      canvasRef.current?.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvasRef.current?.removeEventListener('touchstart', onTouchStart)
      canvasRef.current?.removeEventListener('touchmove', onTouchMove)
      canvasRef.current?.removeEventListener('touchend', onTouchEnd)
      if (labelsEl) labelsEl.removeEventListener('click', onLabelClick)
      renderer.dispose()
    }
  }, [nodePositions, graphBooks, themes, edges, themeBookCount, maxCount, themeMap])

  if (webglError) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9B8F82', fontSize: '13px' }}>
        <p style={{ margin: '0 0 8px' }}>3D visualization requires WebGL support.</p>
        <p style={{ margin: 0, fontSize: '12px' }}>Try a different browser or enable hardware acceleration.</p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      {/* Stats header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#9B8F82', fontFamily: "'DM Sans', sans-serif" }}>
          {graphBooks.length} book{graphBooks.length !== 1 ? 's' : ''} · {themes.length} theme{themes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Instruction / selection text */}
      <div style={{ padding: '0 0 6px', fontSize: 11.5, color: '#B5A898', fontFamily: "'DM Sans', sans-serif" }}>
        {!selected
          ? 'Tap a book or theme to trace connections. Drag to rotate.'
          : (
            <>
              {selected.type === 'book' ? bookMap[selected.id]?.title : themeMap[selected.id]?.label}
              <span onClick={() => setSelected(null)}
                style={{ marginLeft: 8, color: '#7A6E62', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>clear</span>
            </>
          )}
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: dims.h, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }} />
        <div className="labels-layer" style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', overflow: 'hidden',
        }} />
      </div>

      {/* Detail panel — book selected */}
      {selected?.type === 'book' && sharedBooks.length > 0 && (
        <div style={{ padding: '14px 0 18px', borderTop: '1px solid #F0EBE4' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8B7E71',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 8 }}>Reads most like</div>
          <div style={{ fontSize: 12.5, color: '#5C4A3A', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.9 }}>
            {sharedBooks.map(([bid, sharedThemes], i) => (
              <span key={bid}>
                {i > 0 && <span style={{ color: '#D6CFC6', margin: '0 4px' }}>·</span>}
                <span onClick={() => setSelected({ type: 'book', id: bid })}
                  style={{ cursor: 'pointer', fontWeight: 500, borderBottom: '1px dotted #C8BEB4' }}>
                  {bookMap[bid]?.title}
                </span>
                <span style={{ color: '#B5A898', fontSize: 10.5 }}> ({sharedThemes.length} shared)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel — theme selected */}
      {selected?.type === 'theme' && (
        <div style={{ padding: '14px 0 18px', borderTop: '1px solid #F0EBE4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: themeMap[selected.id]?.color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8B7E71',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{themeMap[selected.id]?.label}</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#5C4A3A', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.9 }}>
            {edges.filter(e => e.theme_id === selected.id).map((e, i) => (
              <span key={e.book_id}>
                {i > 0 && <span style={{ color: '#D6CFC6', margin: '0 4px' }}>·</span>}
                <span onClick={() => setSelected({ type: 'book', id: e.book_id })}
                  style={{ cursor: 'pointer', fontWeight: 500, borderBottom: '1px dotted #C8BEB4' }}>
                  {bookMap[e.book_id]?.title}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        padding: '10px 0 4px', display: 'flex', flexWrap: 'wrap', gap: '12px 24px', fontSize: 11,
        color: '#9B8F82', fontFamily: "'DM Sans', sans-serif", borderTop: '1px solid #F0EBE4',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3D322A', display: 'inline-block' }} /> books (front)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6B5B73', display: 'inline-block' }} /> themes (back)
        </span>
        <span style={{ color: '#C8BEB4' }}>drag to rotate · tap to explore</span>
      </div>
    </div>
  )
}

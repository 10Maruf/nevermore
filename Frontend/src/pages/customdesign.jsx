import React, { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import './customdesign.css'
import frontBase from '../../src/Custom Design Assets/front1.png'
import backBase from '../../src/Custom Design Assets/back1.png'
import rightSleeveBase from '../../src/Custom Design Assets/rightsleeve.png'
import leftSleeveBase from '../../src/Custom Design Assets/leftsleeve.png'
import sizeGuideCM from '../../src/Custom Design Assets/teecm.png'
import sizeGuideInch from '../../src/Custom Design Assets/teeinch.png'
import { getApiUrl, resolveBackendUrl } from '../config/api'

const API_BASE_URL = getApiUrl('/api')

export default function CustomDesign({ navigate }) {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const hamburgerRef = useRef(null)
  
  const [currentView, setCurrentView] = useState('front')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null)
  const [selectedTool, setSelectedTool] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(40)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  
  const [designs, setDesigns] = useState({
    front: { elements: [] },
    back: { elements: [] },
    leftSleeve: { elements: [] },
    rightSleeve: { elements: [] }
  })
  
  const [selectedElement, setSelectedElement] = useState(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomedZoneIndex, setZoomedZoneIndex] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState(null)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [showDesignModal, setShowDesignModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [modalTextInput, setModalTextInput] = useState('')
  const [modalFontSize, setModalFontSize] = useState(20)
  const [modalFontFamily, setModalFontFamily] = useState('Arial')
  const [modalTextColor, setModalTextColor] = useState('#000000')
  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [teamName, setTeamName] = useState('')
  
  // Control Panel Modal States
  const [showItemsModal, setShowItemsModal] = useState(false)
  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState(null)
  // Undo/Redo history
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isRestoringRef = useRef(false)
  const [showColorsModal, setShowColorsModal] = useState(false)
  const [showSizePanel, setShowSizePanel] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [sizeGuideUnit, setSizeGuideUnit] = useState('cm')
  const [showPricePanel, setShowPricePanel] = useState(false)
  const [showShoppingBag, setShowShoppingBag] = useState(false)
  const [bagItems, setBagItems] = useState([])
  const [showTechniqueModal, setShowTechniqueModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showSavedListModal, setShowSavedListModal] = useState(false)
  
  // Control Panel Selection States
  const [selectedItem, setSelectedItem] = useState('T-Shirt')
  const [selectedSize, setSelectedSize] = useState('M')
  const [sizeQuantities, setSizeQuantities] = useState({
    'XS': 0,
    'S': 0,
    'M': 0,
    'L': 0,
    'XL': 0
  })
  const [selectedTechnique, setSelectedTechnique] = useState('Print')
  const [selectedPrintType, setSelectedPrintType] = useState('pigment print')
  const [selectedEmbroideryType, setSelectedEmbroideryType] = useState('satin embroidery')
  const [baseImagesLoaded, setBaseImagesLoaded] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [originalLoadedDesignName, setOriginalLoadedDesignName] = useState(null)
  const [designPreviewImage, setDesignPreviewImage] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState([])
  const [loadedDesignIndex, setLoadedDesignIndex] = useState(null)
  const [loadedDesignId, setLoadedDesignId] = useState(null)
  const [isSavingDesign, setIsSavingDesign] = useState(false)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [isLoadingDesignImages, setIsLoadingDesignImages] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedListError, setSavedListError] = useState('')
  const [uploadedAssetIds, setUploadedAssetIds] = useState([])

  const baseImagesRef = useRef({})
  const imageBoundsRef = useRef({})
  const resizeStartRef = useRef(null)

  // Persist selection/zoom per view so switching views restores prior state
  const initialViewState = {
    front: { selectedZone: null, isZoomed: false, zoomedZoneIndex: null },
    back: { selectedZone: null, isZoomed: false, zoomedZoneIndex: null },
    leftSleeve: { selectedZone: null, isZoomed: false, zoomedZoneIndex: null },
    rightSleeve: { selectedZone: null, isZoomed: false, zoomedZoneIndex: null }
  }
  const [viewState, setViewState] = useState(initialViewState)

  // Zoom animation state (ref-based to avoid re-renders each frame)
  const ZOOM_TARGET_FILL = 0.75
  const zoomTransitionRef = useRef({ running: false })
  const rafRef = useRef(null)

  const easeInOutCubic = (t) => (
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  )

  const startZoomTransition = (toZoomed, zoneIndex = null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.width
    const height = canvas.height

    // Determine current transform (from)
    let fromScale = 1
    let fromTx = 0
    let fromTy = 0
    if (isZoomed && zoomedZoneIndex !== null) {
      const zones = getCanvasZones()
      const currentZone = zones[zoomedZoneIndex]
      if (currentZone) {
        const sX = (width * ZOOM_TARGET_FILL) / currentZone.width
        const sY = (height * ZOOM_TARGET_FILL) / currentZone.height
        fromScale = Math.min(sX, sY)
        const cX = currentZone.x + currentZone.width / 2
        const cY = currentZone.y + currentZone.height / 2
        fromTx = width / 2 - cX * fromScale
        fromTy = height / 2 - cY * fromScale
      }
    }

    // Determine target transform (to)
    let toScale = 1
    let toTx = 0
    let toTy = 0
    let targetZoneIndex = toZoomed ? (zoneIndex !== null ? zoneIndex : selectedZone) : null
    if (toZoomed && targetZoneIndex !== null) {
      const zones = getCanvasZones()
      const targetZone = zones[targetZoneIndex]
      if (targetZone) {
        const sX = (width * ZOOM_TARGET_FILL) / targetZone.width
        const sY = (height * ZOOM_TARGET_FILL) / targetZone.height
        toScale = Math.min(sX, sY)
        const cX = targetZone.x + targetZone.width / 2
        const cY = targetZone.y + targetZone.height / 2
        toTx = width / 2 - cX * toScale
        toTy = height / 2 - cY * toScale
      }
    }

    // Initialize transition
    zoomTransitionRef.current = {
      running: true,
      start: performance.now(),
      duration: 600,
      fromScale,
      toScale,
      fromTx,
      toTx,
      fromTy,
      toTy,
      finalize: () => {
        zoomTransitionRef.current.running = false
        if (toZoomed) {
          setIsZoomed(true)
          setZoomedZoneIndex(targetZoneIndex)
        } else {
          setIsZoomed(false)
          setZoomedZoneIndex(null)
        }
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const step = () => {
      const st = zoomTransitionRef.current
      if (!st.running) return
      const now = performance.now()
      const raw = Math.max(0, Math.min(1, (now - st.start) / st.duration))
      st.t = raw
      // Draw this frame
      drawCanvas()
      if (raw >= 1) {
        st.finalize()
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Define editable zones for each view (as percentages of canvas)
  const editableZones = {
    front: [
      { name: 'chest', x: 0.24, y: 0.15, width: 0.5, height: 0.25 },      // Chest zone
      { name: 'lower', x: 0.24, y: 0.42, width: 0.5, height: 0.45 }       // Lower front zone
    ],
    back: [
      { name: 'chest', x: 0.24, y: 0.15, width: 0.5, height: 0.25 },      // Chest zone
      { name: 'lower', x: 0.24, y: 0.42, width: 0.5, height: 0.45 },      // Lower back zone
      { name: 'neck', x: 0.42, y: 0.01, width: 0.15, height: 0.12 }      // Neck/logo zone (small, at top, slightly overlapped with chest)
    ],
    leftSleeve: [
      { name: 'sleeve', x: 0.4, y: 0.23, width: 0.17, height: 0.17 }       // Sleeve zone
    ],
    rightSleeve: [
      { name: 'sleeve', x: 0.43, y: 0.23, width: 0.17, height: 0.17 }       // Sleeve zone
    ]
  }

  // Convert percentage zones to canvas coordinates
  const getCanvasZones = () => {
    const canvas = canvasRef.current
    if (!canvas) return []
    
    const zones = editableZones[currentView] || []
    return zones.map(zone => ({
      ...zone,
      x: zone.x * canvas.width,
      y: zone.y * canvas.height,
      width: zone.width * canvas.width,
      height: zone.height * canvas.height
    }))
  }

  const views = [
    { id: 'front', label: 'Front', image: frontBase },
    { id: 'back', label: 'Back', image: backBase },
    { id: 'leftSleeve', label: 'Left Sleeve', image: leftSleeveBase },
    { id: 'rightSleeve', label: 'Right Sleeve', image: rightSleeveBase }
  ]

  const fonts = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Impact',
    'Comic Sans MS',
    'Trebuchet MS',
    'Arial Black',
    'Palatino'
  ]

  // Preset text colors to choose from
  const textColorOptions = [
    '#000000', '#FFFFFF', '#FF4136', '#2ECC40', '#0074D9', '#FF851B', '#B10DC9', '#111111',
    '#7FDBFF', '#39CCCC', '#3D9970', '#85144b', '#F012BE', '#01FF70', '#AAAAAA', '#FFDC00'
  ]

  const tshirtColors = [
    { name: 'White', hex: '#FFFFFF' }
  ]

  useEffect(() => {
    if (!isLoadingDesignImages) {
      drawCanvas()
    }
  }, [currentView, designs, selectedElement, selectedZone, backgroundColor, baseImagesLoaded, isZoomed, zoomedZoneIndex, isLoadingDesignImages])

  // On view change, restore prior selection/zoom for that view
  useEffect(() => {
    const vs = viewState[currentView] || { selectedZone: null, isZoomed: false, zoomedZoneIndex: null }
    setSelectedZone(vs.selectedZone)
    setIsZoomed(vs.isZoomed)
    setZoomedZoneIndex(vs.zoomedZoneIndex)
    setSelectedElement(null)
  }, [currentView])

  // Whenever selection/zoom changes, persist it for the current view
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      [currentView]: {
        selectedZone,
        isZoomed,
        zoomedZoneIndex
      }
    }))
  }, [selectedZone, isZoomed, zoomedZoneIndex, currentView])

  // Track design changes for undo/redo
  useEffect(() => {
    // Skip while restoring (undo/redo)
    if (isRestoringRef.current) return
    // Serialize current state without imageObj
    const snapshot = JSON.parse(JSON.stringify(designs))
    // If history is empty, initialize with the first snapshot
    if (historyIndex === -1 || history.length === 0) {
      const initHistory = [snapshot]
      setHistory(initHistory)
      setHistoryIndex(0)
      return
    }
    // If the latest history entry equals the snapshot, skip
    const last = history[historyIndex]
    if (JSON.stringify(last) === JSON.stringify(snapshot)) return
    // Truncate any forward history and append snapshot
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    // Keep only last 50 states
    if (newHistory.length > 50) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [designs])

  // Rehydrate image objects from imageData after history restore
  const rehydrateDesigns = (raw) => {
    const out = JSON.parse(JSON.stringify(raw))
    ;['front','back','leftSleeve','rightSleeve'].forEach(view => {
      if (!out[view] || !Array.isArray(out[view].elements)) return
      out[view].elements.forEach(el => {
        if (el.type === 'image' && el.imageData) {
          const img = new Image()
          img.src = el.imageData
          el.imageObj = img
        }
      })
    })
    return out
  }

  // Keyboard shortcuts for Copy (Ctrl+C) and Paste (Ctrl+V)
  useEffect(() => {
    const onKeyDown = (e) => {
      // Avoid handling shortcuts when typing in inputs/textareas or modals are open
      const tag = (e.target && e.target.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)
      const anyModalOpen = showDesignModal || showTextModal || showNameModal || showItemsModal || showPriceModal
      if (isTyping || anyModalOpen) return

      // Ctrl+C to copy selected element
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        handleCopy()
        return
      }
      // Ctrl+V to paste into selected zone
      if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        handlePaste()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedElement, clipboard, selectedZone, currentView, showDesignModal, showTextModal, showNameModal, showItemsModal, showPriceModal])

  useEffect(() => {
    // Handle delete key to remove selected elements
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement !== null) {
        e.preventDefault()
        setDesigns(prev => ({
          ...prev,
          [currentView]: {
            ...prev[currentView],
            elements: prev[currentView].elements.filter((_, index) => index !== selectedElement)
          }
        }))
        setSelectedElement(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement, currentView])

  useEffect(() => {
    // Preload base images for each view
    const mappings = [
      { key: 'front', src: frontBase },
      { key: 'back', src: backBase },
      { key: 'leftSleeve', src: leftSleeveBase },
      { key: 'rightSleeve', src: rightSleeveBase }
    ]

    let loadedCount = 0
    mappings.forEach(({ key, src }) => {
      const img = new Image()
      img.onload = () => {
        loadedCount += 1
        if (loadedCount === mappings.length) {
          setBaseImagesLoaded(true)
        }
      }
      img.src = src
      baseImagesRef.current[key] = img
    })
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
          hamburgerRef.current && !hamburgerRef.current.contains(event.target) &&
          mobileMenuOpen) {
        setMobileMenuOpen(false)
        setMobileSubmenuOpen(null)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const loadSaved = async () => {
      setIsLoadingSaved(true)
      setSavedListError('')
      try {
        const list = await fetchSavedDesignsFromBackend()
        setSavedDesigns(list)
      } catch (err) {
        setSavedListError('Unable to load saved designs')
      } finally {
        setIsLoadingSaved(false)
      }
    }
    loadSaved()
  }, [])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Apply zoom transformation if animating or zoomed in
    let transformed = false
    if (zoomTransitionRef.current.running) {
      const st = zoomTransitionRef.current
      const now = performance.now()
      const raw = Math.max(0, Math.min(1, (now - st.start) / st.duration))
      const t = easeInOutCubic(raw)
      const scale = st.fromScale + (st.toScale - st.fromScale) * t
      const tx = st.fromTx + (st.toTx - st.fromTx) * t
      const ty = st.fromTy + (st.toTy - st.fromTy) * t
      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)
      transformed = true
    } else if (isZoomed && zoomedZoneIndex !== null) {
      const zones = getCanvasZones()
      if (zones[zoomedZoneIndex]) {
        const zone = zones[zoomedZoneIndex]
        const scaleX = (width * ZOOM_TARGET_FILL) / zone.width
        const scaleY = (height * ZOOM_TARGET_FILL) / zone.height
        const zoomScale = Math.min(scaleX, scaleY)
        const zoneCenterX = zone.x + zone.width / 2
        const zoneCenterY = zone.y + zone.height / 2
        const translateX = width / 2 - zoneCenterX * zoomScale
        const translateY = height / 2 - zoneCenterY * zoomScale
        ctx.save()
        ctx.translate(translateX, translateY)
        ctx.scale(zoomScale, zoomScale)
        transformed = true
      }
    }

    // Draw base garment image
    const baseMap = {
      front: 'front',
      back: 'back',
      leftSleeve: 'leftSleeve',
      rightSleeve: 'rightSleeve'
    }
    const baseKey = baseMap[currentView]
    const baseImg = baseImagesRef.current[baseKey]
    
    if (baseImg && baseImg.complete) {
      ctx.drawImage(baseImg, 0, 0, width, height)
    }
    
    // Draw design elements for current view (clipped to their zones)
    const zonesForView = getCanvasZones()
    const currentDesign = designs[currentView]
    currentDesign.elements.forEach((element, index) => {
      const zoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : (selectedZone !== null ? selectedZone : 0)
      const zone = zonesForView[zoneIndex] || zonesForView[0]
      if (!zone) return

      ctx.save()
      ctx.beginPath()
      ctx.rect(zone.x, zone.y, zone.width, zone.height)
      ctx.clip()

      if (element.type === 'text') {
        ctx.font = `${element.fontSize}px ${element.fontFamily}`
        ctx.fillStyle = element.color
        ctx.fillText(element.text, element.x, element.y)
        
        // Highlight selected element with handle
        if (selectedElement === index) {
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2
          ctx.setLineDash([3, 3])
          const metrics = ctx.measureText(element.text)
          const boxX = element.x
          const boxY = element.y - element.fontSize
          const boxW = metrics.width
          const boxH = element.fontSize
          const padding = 8
          ctx.strokeRect(boxX - padding, boxY - padding, boxW + padding * 2, boxH + padding * 2)
          ctx.setLineDash([])
          // Resize handle - simple circle with ring
          const handleX = boxX + boxW + padding
          const handleY = boxY + boxH + padding
          const handleRadius = 5
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#0074d9'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      } else if (element.type === 'image') {
        // Check if image loaded successfully (complete AND naturalWidth > 0)
        if (element.imageObj && element.imageObj.complete && element.imageObj.naturalWidth > 0) {
          ctx.drawImage(
            element.imageObj,
            element.x,
            element.y,
            element.width,
            element.height
          )
          
          if (selectedElement === index) {
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 2
            ctx.setLineDash([3, 3])
            const padding = 8
            ctx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
            ctx.setLineDash([])
            // Resize handle - simple circle with ring
            const handleX = element.x + element.width + padding
            const handleY = element.y + element.height + padding
            const handleRadius = 5
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#0074d9'
            ctx.lineWidth = 2
            ctx.stroke()
          }
        }
      }

      ctx.restore()
    })
    
    // Draw editable zone boundaries
    const zones = getCanvasZones()
    zones.forEach((zone, index) => {
      if (selectedZone !== null && index === selectedZone) {
        // Highlight selected zone with blue dotted border
        ctx.strokeStyle = 'rgba(0, 116, 217, 0.9)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
      } else {
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.9)'
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
      }
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height)
      ctx.setLineDash([])
    })
    
    // Restore context if transformed
    if (transformed) ctx.restore()
  }

  // Helper function to clamp positions within editable zones
  const clampToBounds = (x, y, elementWidth, elementHeight, targetZoneIndex = null, isText = false) => {
    const zones = getCanvasZones()
    if (zones.length === 0) return { x, y }
    
    // Use target zone if provided, otherwise use selected zone (default to 0 if none selected)
    let zoneIndex = targetZoneIndex !== null ? targetZoneIndex : (selectedZone !== null ? selectedZone : 0)
    const zone = zones[zoneIndex] || zones[0]
    const clampedX = Math.max(zone.x, Math.min(x, zone.x + zone.width - elementWidth))
    
    // For text: y is the baseline (bottom of text), text extends upward by elementHeight
    // So: top of text = y - elementHeight, bottom of text = y
    // We want: y - elementHeight >= zone.y AND y <= zone.y + zone.height
    let clampedY
    if (isText) {
      clampedY = Math.max(zone.y + elementHeight, Math.min(y, zone.y + zone.height))
    } else {
      // For images: y is top-left
      clampedY = Math.max(zone.y, Math.min(y, zone.y + zone.height - elementHeight))
    }
    
    return { x: clampedX, y: clampedY }
  }

  const addText = () => {
    if (!textInput.trim()) return
    
    // Check if a zone is selected
    if (selectedZone === null) {
      alert('Please select a zone first to add text')
      return
    }
    const textFontSize = parseInt(fontSize)
    const canvas = canvasRef.current
    const ctx = canvas ? canvas.getContext('2d') : null
    let textWidth = textInput.length * textFontSize * 0.6
    if (ctx) {
      ctx.font = `${textFontSize}px ${fontFamily}`
      textWidth = ctx.measureText(textInput).width
    }
    const textHeight = textFontSize
    
    // Get selected zone and place text near the top inside it
    const zones = getCanvasZones()
    const zoneIndex = selectedZone !== null ? selectedZone : 0
    const zone = zones[zoneIndex] || zones[0]
    console.log('Adding text to zone:', zoneIndex, 'Zone bounds:', zone)
    // For text: y is baseline; place near top with small padding
    const padding = 8
    let x = zone ? zone.x + (zone.width - textWidth) / 2 : 160
    let y = zone ? zone.y + padding + textHeight : 160 + textHeight
    console.log('Initial text position:', { x, y })
    
    const clamped = clampToBounds(x, y, textWidth, textHeight, zoneIndex, true)
    console.log('Clamped text position:', clamped)
    
    const newElement = {
      type: 'text',
      text: textInput,
      x: clamped.x,
      y: clamped.y,
      fontSize: textFontSize,
      fontFamily: fontFamily,
      color: textColor,
      zoneIndex: zoneIndex
    }
    
    console.log('Creating text element:', newElement)
    console.log('Expected to be in zone:', zoneIndex, 'with bounds:', zone)
    console.log('Text baseline at y:', clamped.y, 'top at:', clamped.y - textFontSize)
    
    setDesigns(prev => ({
      ...prev,
      [currentView]: {
        ...prev[currentView],
        elements: [...prev[currentView].elements, newElement]
      }
    }))
    
    setTextInput('')
    setSelectedTool(null)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check if a zone is selected
    if (selectedZone === null) {
      alert('Please select a zone first to add an image')
      e.target.value = ''
      return
    }
    
    const token = localStorage.getItem('authToken')
    
    // If user is logged in, upload to backend immediately
    if (token) {
      try {
        const formData = new FormData()
        formData.append('asset', file)

        console.log('Uploading to:', `${API_BASE_URL}/designs/upload_asset.php`)
        console.log('Token present:', !!token)

        const uploadResponse = await fetch(`${API_BASE_URL}/designs/upload_asset.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }).catch(err => {
          console.error('Fetch error:', err)
          throw new Error('Cannot connect to server. Please ensure the backend is running.')
        })

        console.log('Upload response status:', uploadResponse.status)
        
        const uploadResult = await uploadResponse.json().catch(err => {
          console.error('JSON parse error:', err)
          throw new Error('Invalid response from server')
        })
        
        console.log('Upload result:', uploadResult)
        
        if (!uploadResponse.ok || uploadResult.status !== 'success') {
          throw new Error(uploadResult.message || 'Failed to upload image')
        }

        const assetData = uploadResult.data
        
        // Track uploaded asset ID
        setUploadedAssetIds(prev => [...prev, assetData.asset_id])
        
        // Now add the image to canvas using the uploaded URL
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            const maxWidth = 200
            const maxHeight = 200
            let width = img.width
            let height = img.height
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height)
              width *= ratio
              height *= ratio
            }
            
            // Get selected zone and center image within it
            const zones = getCanvasZones()
            const zoneIndex = selectedZone !== null ? selectedZone : 0
            const zone = zones[zoneIndex] || zones[0]
            let x = zone ? zone.x + (zone.width - width) / 2 : 160
            let y = zone ? zone.y + (zone.height - height) / 2 : 160
            
            const clamped = clampToBounds(x, y, width, height, zoneIndex)
            
            const newElement = {
              type: 'image',
              imageObj: img,
              imageData: event.target.result,
              assetId: assetData.asset_id, // Store asset ID
              assetUrl: assetData.asset_url, // Store backend URL
              x: clamped.x,
              y: clamped.y,
              width: width,
              height: height,
              zoneIndex: zoneIndex
            }
            
            setDesigns(prev => ({
              ...prev,
              [currentView]: {
                ...prev[currentView],
                elements: [...prev[currentView].elements, newElement]
              }
            }))
            // Close the Add Design modal and reset the file input after successful add
            setShowDesignModal(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
        
      } catch (error) {
        console.error('Upload error:', error)
        alert('Failed to upload image: ' + error.message)
        e.target.value = ''
      }
    } else {
      // Guest user - use base64 only (no backend upload)
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const maxWidth = 200
          const maxHeight = 200
          let width = img.width
          let height = img.height
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width *= ratio
            height *= ratio
          }
          
          // Get selected zone and center image within it
          const zones = getCanvasZones()
          const zoneIndex = selectedZone !== null ? selectedZone : 0
          const zone = zones[zoneIndex] || zones[0]
          let x = zone ? zone.x + (zone.width - width) / 2 : 160
          let y = zone ? zone.y + (zone.height - height) / 2 : 160
          
          const clamped = clampToBounds(x, y, width, height, zoneIndex)
          
          const newElement = {
            type: 'image',
            imageObj: img,
            imageData: event.target.result, // Store as base64 for guest users
            x: clamped.x,
            y: clamped.y,
            width: width,
            height: height,
            zoneIndex: zoneIndex
          }
          
          setDesigns(prev => ({
            ...prev,
            [currentView]: {
              ...prev[currentView],
              elements: [...prev[currentView].elements, newElement]
            }
          }))
          // Close the Add Design modal and reset the file input after successful add
          setShowDesignModal(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  // Copy currently selected element into clipboard
  const handleCopy = () => {
    console.log('[Toolbar] Copy clicked. selectedElement=', selectedElement)
    if (selectedElement === null) return
    const element = designs[currentView].elements[selectedElement]
    if (!element) return
    // Store a shallow copy; for images we rely on existing imageObj/imageData
    const copy = { ...element }
    setClipboard(copy)
    console.log('[Clipboard] Copied element:', copy)
  }

  // Paste clipboard element into the currently selected zone, centered
  const handlePaste = () => {
    console.log('[Toolbar] Paste clicked. clipboard exists=', !!clipboard, 'selectedZone=', selectedZone)
    if (!clipboard) return
    if (selectedZone === null) {
      alert('Please select a zone first to paste')
      return
    }
    const zones = getCanvasZones()
    const zoneIndex = selectedZone !== null ? selectedZone : 0
    const zone = zones[zoneIndex] || zones[0]
    if (!zone) return

    if (clipboard.type === 'text') {
      const canvas = canvasRef.current
      const ctx = canvas ? canvas.getContext('2d') : null
      let textWidth = clipboard.text.length * clipboard.fontSize * 0.6
      if (ctx) {
        ctx.font = `${clipboard.fontSize}px ${clipboard.fontFamily}`
        textWidth = ctx.measureText(clipboard.text).width
      }
      const textHeight = clipboard.fontSize
      const padding = 8
      let x = zone.x + (zone.width - textWidth) / 2
      let y = zone.y + padding + textHeight
      const clamped = clampToBounds(x, y, textWidth, textHeight, zoneIndex, true)
      const newElement = {
        type: 'text',
        text: clipboard.text,
        x: clamped.x,
        y: clamped.y,
        fontSize: clipboard.fontSize,
        fontFamily: clipboard.fontFamily,
        color: clipboard.color,
        zoneIndex: zoneIndex
      }
      setDesigns(prev => ({
        ...prev,
        [currentView]: {
          ...prev[currentView],
          elements: [...prev[currentView].elements, newElement]
        }
      }))
      // Select the newly pasted element
      setSelectedElement(designs[currentView].elements.length)
      console.log('[Clipboard] Pasted text into zone', zoneIndex)
    } else if (clipboard.type === 'image') {
      const width = clipboard.width
      const height = clipboard.height
      let x = zone.x + (zone.width - width) / 2
      let y = zone.y + (zone.height - height) / 2
      const clamped = clampToBounds(x, y, width, height, zoneIndex)
      const newElement = {
        type: 'image',
        imageObj: clipboard.imageObj,
        imageData: clipboard.imageData,
        x: clamped.x,
        y: clamped.y,
        width: width,
        height: height,
        zoneIndex: zoneIndex
      }
      setDesigns(prev => ({
        ...prev,
        [currentView]: {
          ...prev[currentView],
          elements: [...prev[currentView].elements, newElement]
        }
      }))
      setSelectedElement(designs[currentView].elements.length)
      console.log('[Clipboard] Pasted image into zone', zoneIndex)
    }
  }

  // Undo: Go back one step in history
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      isRestoringRef.current = true
      const restored = rehydrateDesigns(history[newIndex])
      setHistoryIndex(newIndex)
      setDesigns(restored)
      setSelectedElement(null)
      isRestoringRef.current = false
      console.log('[Undo] Restored state', newIndex)
    }
  }

  // Redo: Go forward one step in history
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      isRestoringRef.current = true
      const restored = rehydrateDesigns(history[newIndex])
      setHistoryIndex(newIndex)
      setDesigns(restored)
      setSelectedElement(null)
      isRestoringRef.current = false
      console.log('[Redo] Restored state', newIndex)
    }
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Account for canvas scaling - the canvas element may be displayed at a different size than its actual resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    // Calculate click position in canvas coordinate space
    let clickX = (e.clientX - rect.left) * scaleX
    let clickY = (e.clientY - rect.top) * scaleY

    // If zoomed, apply inverse transformation to get actual canvas coordinates
    if (isZoomed && zoomedZoneIndex !== null) {
      const zones = getCanvasZones()
      const zone = zones[zoomedZoneIndex]
      if (zone) {
        const width = canvas.width
        const height = canvas.height
        const scaleXZoom = (width * ZOOM_TARGET_FILL) / zone.width
        const scaleYZoom = (height * ZOOM_TARGET_FILL) / zone.height
        const zoomScale = Math.min(scaleXZoom, scaleYZoom)
        const zoneCenterX = zone.x + zone.width / 2
        const zoneCenterY = zone.y + zone.height / 2
        const translateX = width / 2 - zoneCenterX * zoomScale
        const translateY = height / 2 - zoneCenterY * zoomScale
        
        // Inverse transform: subtract translation then divide by scale
        clickX = (clickX - translateX) / zoomScale
        clickY = (clickY - translateY) / zoomScale
      }
    }
    
    // First, check if clicked on an element
    const elements = designs[currentView].elements
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      
      if (element.type === 'text') {
        const ctx = canvas.getContext('2d')
        ctx.font = `${element.fontSize}px ${element.fontFamily}`
        const metrics = ctx.measureText(element.text)
        
        if (
          clickX >= element.x &&
          clickX <= element.x + metrics.width &&
          clickY >= element.y - element.fontSize &&
          clickY <= element.y
        ) {
          setSelectedElement(i)
          // Auto-select the zone that contains this element
          const elementZoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : 0
          setSelectedZone(elementZoneIndex)
          return
        }
      } else if (element.type === 'image') {
        if (
          clickX >= element.x &&
          clickX <= element.x + element.width &&
          clickY >= element.y &&
          clickY <= element.y + element.height
        ) {
          setSelectedElement(i)
          // Auto-select the zone that contains this element
          const elementZoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : 0
          setSelectedZone(elementZoneIndex)
          return
        }
      }
    }
    
    // No element clicked, now check which zone was clicked
    const zones = getCanvasZones()
    let zoneClicked = -1
    
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const zoneLeft = zone.x
      const zoneRight = zone.x + zone.width
      const zoneTop = zone.y
      const zoneBottom = zone.y + zone.height
      
      // Check if click is within this zone (including boundaries)
      if (clickX >= zoneLeft && clickX <= zoneRight &&
          clickY >= zoneTop && clickY <= zoneBottom) {
        zoneClicked = i
        break
      }
    }
    
    // Clear element selection
    setSelectedElement(null)

    // If currently zoomed, clicking outside or another zone should auto zoom-out
    if (isZoomed) {
      if (zoneClicked === -1 || zoneClicked !== zoomedZoneIndex) {
        startZoomTransition(false)
      }
    }

    // Update zone selection
    if (zoneClicked === -1) {
      // Clicked outside all zones
      console.log('Clicked outside zones, deselecting')
      setSelectedZone(null)
    } else {
      // Clicked inside a zone
      console.log('Selected zone index:', zoneClicked, 'Zone info:', zones[zoneClicked])
      setSelectedZone(zoneClicked)
    }
  }

  const handleCanvasMouseDown = (e) => {
    if (selectedElement === null) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Account for canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const elements = designs[currentView].elements
    const element = elements[selectedElement]
    if (!element) return

    const ctx = canvas.getContext('2d')
    let boxX = element.x
    let boxY = element.y
    let boxW = 0
    let boxH = 0

    if (element.type === 'text') {
      ctx.font = `${element.fontSize}px ${element.fontFamily}`
      const metrics = ctx.measureText(element.text)
      boxW = metrics.width
      boxH = element.fontSize
      boxY = element.y - boxH
    } else if (element.type === 'image') {
      boxW = element.width
      boxH = element.height
    }

    const handleSize = 10
    const handleX = boxX + boxW
    const handleY = boxY + boxH

    // Check resize handle hit
    if (
      x >= handleX - handleSize && x <= handleX + handleSize &&
      y >= handleY - handleSize && y <= handleY + handleSize
    ) {
      const resizeData = {
        startMouseX: x,
        startMouseY: y,
        startW: boxW,
        startH: boxH,
        startFontSize: element.type === 'text' ? element.fontSize : null,
        elementIndex: selectedElement
      }
      resizeStartRef.current = resizeData
      setIsResizing(true)
      return
    }

    setIsDragging(true)
    setDragStart({ x, y })
  }

  const handleCanvasMouseMove = (e) => {
    if ((selectedElement === null) || (!isDragging && !isResizing)) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Account for canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    // Calculate click position in canvas coordinate space
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (isResizing && resizeStartRef.current) {
      const dx = x - resizeStartRef.current.startMouseX
      const dy = y - resizeStartRef.current.startMouseY
      setDesigns(prev => {
        const newElements = [...prev[currentView].elements]
        const element = newElements[resizeStartRef.current.elementIndex]
        if (!element) return prev

        const zones = getCanvasZones()
        const zoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : (selectedZone !== null ? selectedZone : 0)
        const zone = zones[zoneIndex] || zones[0]
        if (!zone) return prev

        // Uniform scale based on drag delta
        const baseW = resizeStartRef.current.startW
        const baseH = resizeStartRef.current.startH
        const factor = Math.max(0.1, 1 + Math.max(dx / baseW, dy / baseH))

        if (element.type === 'image') {
          let newW = baseW * factor
          let newH = baseH * factor
          // Minimum size constraint only
          newW = Math.max(10, newW)
          newH = Math.max(10, newH)
          newElements[resizeStartRef.current.elementIndex] = { ...element, width: newW, height: newH, zoneIndex }
        } else if (element.type === 'text') {
          const baseFont = resizeStartRef.current.startFontSize || element.fontSize
          let newFontSize = Math.max(8, baseFont * factor)
          // Minimum size constraint only
          newFontSize = Math.max(8, newFontSize)
          newElements[resizeStartRef.current.elementIndex] = { ...element, fontSize: newFontSize, zoneIndex }
        }

        return {
          ...prev,
          [currentView]: {
            ...prev[currentView],
            elements: newElements
          }
        }
      })
      return
    }

    if (!isDragging) return

    const dx = x - dragStart.x
    const dy = y - dragStart.y
    
    setDesigns(prev => {
      const newElements = [...prev[currentView].elements]
      const element = newElements[selectedElement]
      if (!element) return prev
      
      // Calculate new position
      let newX = element.x + dx
      let newY = element.y + dy
      
      // Get element dimensions for boundary checking
      let elementWidth = 0
      let elementHeight = 0
      
      if (element.type === 'text') {
        const ctx = canvas.getContext('2d')
        ctx.font = `${element.fontSize}px ${element.fontFamily}`
        const metrics = ctx.measureText(element.text)
        elementWidth = metrics.width
        elementHeight = element.fontSize
      } else if (element.type === 'image') {
        elementWidth = element.width
        elementHeight = element.height
      }
      
      // Keep element locked to its original zone - don't allow zone switching
      const elementZoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : selectedZone
      
      // Allow free movement - elements can be positioned outside zone bounds
      // Visual clipping ensures only the portion inside the zone is visible
      
      newElements[selectedElement] = {
        ...element,
        x: newX,
        y: newY,
        zoneIndex: elementZoneIndex
      }
      
      return {
        ...prev,
        [currentView]: {
          ...prev[currentView],
          elements: newElements
        }
      }
    })
    
    setDragStart({ x, y })
  }

  const handleCanvasMouseUp = () => {
    // Check if element is completely outside its zone
    if (selectedElement !== null && (isDragging || isResizing)) {
      const element = designs[currentView].elements[selectedElement]
      if (element) {
        const zones = getCanvasZones()
        const zoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : selectedZone
        const zone = zones[zoneIndex] || zones[0]
        
        if (zone) {
          let elementLeft, elementRight, elementTop, elementBottom
          
          if (element.type === 'text') {
            const canvas = canvasRef.current
            const ctx = canvas ? canvas.getContext('2d') : null
            if (ctx) {
              ctx.font = `${element.fontSize}px ${element.fontFamily}`
              const metrics = ctx.measureText(element.text)
              elementLeft = element.x
              elementRight = element.x + metrics.width
              elementTop = element.y - element.fontSize
              elementBottom = element.y
            }
          } else if (element.type === 'image') {
            elementLeft = element.x
            elementRight = element.x + element.width
            elementTop = element.y
            elementBottom = element.y + element.height
          }
          
          // Check if element is completely outside the zone
          const completelyOutside = 
            elementRight < zone.x || 
            elementLeft > zone.x + zone.width ||
            elementBottom < zone.y || 
            elementTop > zone.y + zone.height
          
          if (completelyOutside) {
            // Delete the element
            setDesigns(prev => ({
              ...prev,
              [currentView]: {
                ...prev[currentView],
                elements: prev[currentView].elements.filter((_, index) => index !== selectedElement)
              }
            }))
            setSelectedElement(null)
          }
        }
      }
    }
    
    setIsDragging(false)
    setIsResizing(false)
    resizeStartRef.current = null
  }

  const deleteSelectedElement = () => {
    if (selectedElement === null) return
    
    setDesigns(prev => ({
      ...prev,
      [currentView]: {
        ...prev[currentView],
        elements: prev[currentView].elements.filter((_, i) => i !== selectedElement)
      }
    }))
    
    setSelectedElement(null)
  }

  const calculatePrice = () => {
    let basePrice = 800 // Base t-shirt price
    let designPrice = 0
    
    // Calculate design complexity
    Object.values(designs).forEach(design => {
      design.elements.forEach(element => {
        if (element.type === 'text') {
          designPrice += 50 // Charge per text element
        } else if (element.type === 'image') {
          designPrice += 100 // Charge per image
        }
      })
    })
    
    return basePrice + designPrice
  }

  const handleSubmitForPrice = async () => {
    // Check if user has uploaded images that aren't saved yet
    const hasUnsavedImages = ['front', 'back', 'leftSleeve', 'rightSleeve'].some(viewName => {
      return designs[viewName].elements.some(el => el.type === 'image' && !el.assetUrl)
    })
    
    if (hasUnsavedImages) {
      alert('Please save your design first to upload all images before submitting for price.')
      return
    }
    
    // Check if at least one size is selected with quantity > 0
    const hasSizeSelected = Object.values(sizeQuantities).some(qty => qty > 0)
    
    if (!hasSizeSelected) {
      alert('Please select at least one size and quantity before submitting for price.')
      return
    }
    
    // Generate preview image
    const previewImage = await generateCompositePreview()
    setDesignPreviewImage(previewImage)
    
    const price = calculatePrice()
    setEstimatedPrice(price)
    setShowPricePanel(true)
  }

  const addToBag = () => {
    // Check if user has uploaded images that aren't saved yet
    const hasUnsavedImages = ['front', 'back', 'leftSleeve', 'rightSleeve'].some(viewName => {
      return designs[viewName].elements.some(el => el.type === 'image' && !el.assetUrl)
    })
    
    if (hasUnsavedImages) {
      alert('Please save your design first to upload all images before adding to cart.')
      return
    }
    
    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]')
    
    // Use the generated preview image or generate a new one
    const previewImg = designPreviewImage || frontBase
    
    // Prepare custom assets data for admin viewing
    // Only include images that have been uploaded to server (have assetUrl)
    const customAssets = {
      front: {
        images: designs.front.elements
          .filter(el => el.type === 'image' && el.assetUrl)
          .map(el => ({
            url: `https://evermorebrand.com${el.assetUrl}`,
            filename: el.assetUrl.split('/').pop()
          })),
        texts: designs.front.elements.filter(el => el.type === 'text').map(el => ({
          content: el.text,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          color: el.color
        }))
      },
      back: {
        images: designs.back.elements
          .filter(el => el.type === 'image' && el.assetUrl)
          .map(el => ({
            url: `https://evermorebrand.com${el.assetUrl}`,
            filename: el.assetUrl.split('/').pop()
          })),
        texts: designs.back.elements.filter(el => el.type === 'text').map(el => ({
          content: el.text,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          color: el.color
        }))
      },
      leftSleeve: {
        images: designs.leftSleeve.elements
          .filter(el => el.type === 'image' && el.assetUrl)
          .map(el => ({
            url: `https://evermorebrand.com${el.assetUrl}`,
            filename: el.assetUrl.split('/').pop()
          })),
        texts: designs.leftSleeve.elements.filter(el => el.type === 'text').map(el => ({
          content: el.text,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          color: el.color
        }))
      },
      rightSleeve: {
        images: designs.rightSleeve.elements
          .filter(el => el.type === 'image' && el.assetUrl)
          .map(el => ({
            url: `https://evermorebrand.com${el.assetUrl}`,
            filename: el.assetUrl.split('/').pop()
          })),
        texts: designs.rightSleeve.elements.filter(el => el.type === 'text').map(el => ({
          content: el.text,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          color: el.color
        }))
      }
    }
    
    // Create separate items for each size with quantity
    const newItems = Object.entries(sizeQuantities)
      .filter(([size, qty]) => qty > 0)
      .map(([size, qty]) => {
        const pricePerItem = calculatePrice()
        const totalPrice = pricePerItem * qty
        
        return {
          id: `custom-${Date.now()}-${size}-${Math.random()}`,
          title: 'Custom Designed T-Shirt',
          img: previewImg,
          previewImage: previewImg,
          color: backgroundColor,
          size: size,
          qty: qty,
          price: pricePerItem,
          isCustom: true,
          customAssets: customAssets
        }
      })
    
    // Add new items to cart
    const updatedCart = [...existingCart, ...newItems]
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    
    // Update local bag items for display
    setBagItems(newItems)
    setShowPricePanel(false)
    setShowShoppingBag(true)
    
    // Trigger storage event for cart page to update
    window.dispatchEvent(new Event('storage'))
  }

  const removeFromBag = (itemId) => {
    const updatedBagItems = bagItems.filter(item => item.id !== itemId)
    setBagItems(updatedBagItems)
    
    // Also remove from localStorage cart
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]')
    const updatedCart = existingCart.filter(item => item.id !== itemId)
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    window.dispatchEvent(new Event('storage'))
  }

  const getTotalPrice = () => {
    return bagItems.reduce((sum, item) => sum + (item.price * item.qty), 0)
  }

  const checkout = () => {
    // Navigate to checkout/payment page
    navigate('payment')
  }

  // Check if design has at least one element in any zone
  const hasDesignElements = () => {
    return (
      (designs.front?.elements?.length > 0) ||
      (designs.back?.elements?.length > 0) ||
      (designs.leftSleeve?.elements?.length > 0) ||
      (designs.rightSleeve?.elements?.length > 0)
    )
  }

  // API helper to fetch saved designs from backend
  const fetchSavedDesignsFromBackend = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${API_BASE_URL}/designs/get_designs.php`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to fetch designs')
      }

      return result.data.designs || []
    } catch (error) {
      console.error('Error fetching designs:', error)
      throw error
    }
  }

  // API helper to save design to backend
  const saveDesignToBackend = async (designData) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${API_BASE_URL}/designs/save_design.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(designData)
      })

      const result = await response.json()
      
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to save design')
      }

      return result.data
    } catch (error) {
      console.error('Error saving design:', error)
      throw error
    }
  }

  // Render a specific view to a temporary canvas
  const renderViewToCanvas = (viewName, tempCanvas) => {
    const ctx = tempCanvas.getContext('2d')
    const width = 450
    const height = 450
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw base garment image
    const baseMap = {
      front: 'front',
      back: 'back',
      leftSleeve: 'leftSleeve',
      rightSleeve: 'rightSleeve'
    }
    const baseKey = baseMap[viewName]
    const baseImg = baseImagesRef.current[baseKey]
    
    if (baseImg && baseImg.complete) {
      ctx.drawImage(baseImg, 0, 0, width, height)
    }
    
    // Get zones for this view using actual zone definitions
    const editableZonesDefinition = {
      front: [
        { name: 'chest', x: 0.24, y: 0.15, width: 0.5, height: 0.25 },
        { name: 'lower', x: 0.24, y: 0.42, width: 0.5, height: 0.45 }
      ],
      back: [
        { name: 'chest', x: 0.24, y: 0.15, width: 0.5, height: 0.25 },
        { name: 'lower', x: 0.24, y: 0.42, width: 0.5, height: 0.45 },
        { name: 'neck', x: 0.42, y: 0.01, width: 0.15, height: 0.12 }
      ],
      leftSleeve: [
        { name: 'sleeve', x: 0.4, y: 0.23, width: 0.17, height: 0.17 }
      ],
      rightSleeve: [
        { name: 'sleeve', x: 0.43, y: 0.23, width: 0.17, height: 0.17 }
      ]
    }
    
    // Convert percentage zones to pixel coordinates
    const zonesForView = (editableZonesDefinition[viewName] || []).map(zone => ({
      ...zone,
      x: zone.x * width,
      y: zone.y * height,
      width: zone.width * width,
      height: zone.height * height
    }))
    
    // Draw design elements for this view
    const viewDesign = designs[viewName]
    if (viewDesign && viewDesign.elements) {
      viewDesign.elements.forEach((element) => {
        const zoneIndex = element.zoneIndex !== undefined && element.zoneIndex !== null ? element.zoneIndex : 0
        const zone = zonesForView[zoneIndex] || zonesForView[0]
        if (!zone) return

        ctx.save()
        // Apply zone clipping to ensure elements stay within zone bounds
        ctx.beginPath()
        ctx.rect(zone.x, zone.y, zone.width, zone.height)
        ctx.clip()

        if (element.type === 'text') {
          ctx.font = `${element.fontSize}px ${element.fontFamily}`
          ctx.fillStyle = element.color
          // Use default alphabetic baseline to match design canvas
          ctx.fillText(element.text, element.x, element.y)
        } else if (element.type === 'image') {
          if (element.imageObj && element.imageObj.complete) {
            ctx.drawImage(
              element.imageObj,
              element.x,
              element.y,
              element.width,
              element.height
            )
          }
        }

        ctx.restore()
      })
    }
  }

  // Generate composite preview with all 4 views
  const generateCompositePreview = async () => {
    try {
      // Create a temporary canvas for the composite
      const compositeCanvas = document.createElement('canvas')
      const ctx = compositeCanvas.getContext('2d')
      
      // Set composite size: 2x2 grid of 450x450 canvases = 900x900
      compositeCanvas.width = 900
      compositeCanvas.height = 900
      
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 900, 900)
      
      const views = ['front', 'back', 'leftSleeve', 'rightSleeve']
      const positions = [
        { x: 0, y: 0, label: 'Front' },           // Top-left
        { x: 450, y: 0, label: 'Back' },          // Top-right
        { x: 0, y: 450, label: 'Left Sleeve' },   // Bottom-left
        { x: 450, y: 450, label: 'Right Sleeve' } // Bottom-right
      ]
      
      // Create temp canvas for each view
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 450
      tempCanvas.height = 450
      
      // Render each view to the composite
      for (let i = 0; i < views.length; i++) {
        const viewName = views[i]
        const pos = positions[i]
        
        // Render this view to temp canvas
        renderViewToCanvas(viewName, tempCanvas)
        
        // Draw the temp canvas onto composite at the correct position
        ctx.drawImage(tempCanvas, pos.x, pos.y, 450, 450)
        
        // Add label
        ctx.fillStyle = '#333333'
        ctx.font = 'bold 16px Arial'
        ctx.fillText(pos.label, pos.x + 10, pos.y + 30)
      }
      
      return compositeCanvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating composite preview:', error)
      // Fallback to current canvas
      const canvas = canvasRef.current
      return canvas ? canvas.toDataURL('image/png') : ''
    }
  }

  const handleSaveDesign = () => {
    // Only set a default name if no design was loaded
    if (loadedDesignIndex === null && !saveName) {
      const defaultName = `Design ${savedDesigns.length + 1}`
      setSaveName(defaultName)
    }
    setSaveError('')
    setShowSaveModal(true)
  }

  const handleConfirmSave = async () => {
    const name = saveName.trim()
    if (!name) return
    
    try {
      setIsSavingDesign(true)
      setSaveError('')
      
      // Check if user is logged in
      const token = localStorage.getItem('authToken')
      if (!token) {
        setSaveError('Please login to save your design')
        setIsSavingDesign(false)
        // Optionally redirect to login
        setTimeout(() => {
          if (confirm('You need to login to save designs. Go to login page?')) {
            navigate('login')
          }
        }, 100)
        return
      }
      
      // Generate composite preview with all 4 views
      const preview = await generateCompositePreview()
      
      // For guest users who now want to save, upload any base64 images to backend first
      const assetIds = []
      for (const viewName of ['front', 'back', 'leftSleeve', 'rightSleeve']) {
        const view = designs[viewName]
        if (view && view.elements) {
          for (const element of view.elements) {
            if (element.type === 'image') {
              // If image has assetId, it's already uploaded
              if (element.assetId) {
                assetIds.push(element.assetId)
              } else if (element.imageData) {
                // Need to upload this image first
                try {
                  // Convert base64 to blob
                  const response = await fetch(element.imageData)
                  const blob = await response.blob()
                  
                  const formData = new FormData()
                  formData.append('asset', blob, 'design-image.png')
                  
                  const uploadResponse = await fetch(`${API_BASE_URL}/designs/upload_asset.php`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    },
                    body: formData
                  })
                  
                  const uploadResult = await uploadResponse.json()
                  if (uploadResult.status === 'success' && uploadResult.data.asset_id) {
                    assetIds.push(uploadResult.data.asset_id)
                    // Update element with asset info
                    element.assetId = uploadResult.data.asset_id
                    element.assetUrl = uploadResult.data.asset_url
                  }
                } catch (uploadErr) {
                  console.error('Failed to upload image:', uploadErr)
                  // Continue with other images
                }
              }
            }
          }
        }
      }
      
      // Serialize views, removing imageObj and imageData, keeping only assetUrl for images
      const serializableViews = JSON.parse(JSON.stringify(designs, (key, value) => {
        // Remove imageObj and imageData, but keep assetUrl
        if (key === 'imageObj') return undefined
        if (key === 'imageData') return undefined
        return value
      }))
      
      const designPayload = {
        design_name: name,
        design_data: serializableViews,
        preview_image: preview,
        garment_type: selectedItem,
        garment_color: backgroundColor,
        garment_size: selectedSize,
        technique: selectedTechnique,
        print_type: selectedTechnique === 'Print' ? selectedPrintType : null,
        embroidery_type: selectedTechnique === 'Embroidery' ? selectedEmbroideryType : null,
        asset_ids: assetIds,
        design_id: loadedDesignId // Include if updating existing design
      }
      
      const savedDesign = await saveDesignToBackend(designPayload)
      
      // Refresh the saved designs list
      const updatedList = await fetchSavedDesignsFromBackend()
      setSavedDesigns(updatedList)
      
      // Update tracking
      setLoadedDesignId(savedDesign.id)
      setOriginalLoadedDesignName(savedDesign.design_name)
      
      // Show success state
      setSavedSuccessfully(true)
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        setShowSaveModal(false)
        setSavedSuccessfully(false)
      }, 1500)
      
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err.message || 'Unable to save design')
    } finally {
      setIsSavingDesign(false)
    }
  }

  const handleOpenSavedList = async () => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('Please login to view your saved designs')
      if (confirm('Go to login page?')) {
        navigate('login')
      }
      return
    }
    
    setSavedListError('')
    setIsLoadingSaved(true)
    try {
      const list = await fetchSavedDesignsFromBackend()
      setSavedDesigns(list)
      setShowSavedListModal(true)
    } catch (err) {
      setSavedListError('Unable to load saved designs')
      setShowSavedListModal(true)
    } finally {
      setIsLoadingSaved(false)
    }
  }

  const handleLoadSavedDesign = async (design, index) => {
    if (!design) return
    
    setIsLoadingDesignImages(true)
    
    // Rehydrate imageObj from imageData or assetUrl
    const rehydrateBackendDesign = async (designData) => {
      const restored = { ...designData }
      const imagesToLoad = []
      
      ;['front','back','leftSleeve','rightSleeve'].forEach(view => {
        if (!restored[view] || !Array.isArray(restored[view].elements)) return
        restored[view].elements.forEach(el => {
          if (el.type === 'image') {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            // Track loading promise
            const loadPromise = new Promise((resolve, reject) => {
              img.onload = () => {
                console.log('Image loaded successfully:', img.src)
                resolve()
              }
              img.onerror = () => {
                console.error('Failed to load image:', img.src)
                resolve() // Resolve anyway to not block
              }
            })
            
            imagesToLoad.push(loadPromise)
            
            // Use backend asset URL if available, otherwise use imageData
            if (el.assetUrl) {
              img.src = resolveBackendUrl(el.assetUrl)
            } else if (el.imageData) {
              img.src = el.imageData
            }
            el.imageObj = img
          }
        })
      })
      
      // Wait for all images to load before returning
      await Promise.all(imagesToLoad)
      
      return restored
    }
    
    try {
      const restoredDesigns = await rehydrateBackendDesign(design.design_data)
      setDesigns(restoredDesigns)
      setBackgroundColor(design.garment_color || '#FFFFFF')
      setSelectedItem(design.garment_type || 'T-Shirt')
      setSelectedSize(design.garment_size || 'M')
      setSelectedTechnique(design.technique || 'Print')
      if (design.print_type) setSelectedPrintType(design.print_type)
      if (design.embroidery_type) setSelectedEmbroideryType(design.embroidery_type)
      
      // Wait for state updates and then redraw
      setTimeout(() => {
        setIsLoadingDesignImages(false)
        drawCanvas()
      }, 100)
      
      setCurrentView('front')
      setSelectedElement(null)
      
      // Track which design was loaded
      setLoadedDesignIndex(index)
      setLoadedDesignId(design.id)
      setSaveName(design.design_name)
      setOriginalLoadedDesignName(design.design_name)
      
      setShowSavedListModal(false)
    } catch (error) {
      console.error('Error loading design:', error)
      alert('Failed to load design. Check console for details.')
    }
  }

  const handleAddToCart = () => {
    const canvas = canvasRef.current
    const imageData = canvas.toDataURL()
    
    const customProduct = {
      id: 'custom-' + Date.now(),
      title: 'Custom Designed T-Shirt',
      price: estimatedPrice,
      img: imageData,
      qty: 1,
      color: backgroundColor,
      size: 'M',
      isCustom: true,
      designData: designs
    }
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    cart.push(customProduct)
    localStorage.setItem('cart', JSON.stringify(cart))
    
    setShowPriceModal(false)
    alert('Custom design added to cart!')
    navigate('cart')
  }

  return (
    <div className="custom-design-page">
      {/* Desktop: Show Navbar, Mobile: Show Custom Header */}
      <div className="desktop-navbar">
        <Navbar navigate={navigate} />
      </div>
      
      {/* Mobile Header - Only visible on mobile */}
      <header className="customdesign-mobile-header">
        <nav className="customdesign-nav">
          {/* Mobile hamburger button */}
          <button 
            ref={hamburgerRef}
            className="customdesign-mobile-hamburger" 
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen)
              setMobileSubmenuOpen(null)
            }}
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Logo */}
          <div className="customdesign-logo" onClick={() => navigate('/')}>
            <img src="/assets/images/logo.png" alt="Logo" className="customdesign-logo-img" />
          </div>

          {/* Right Icons */}
          <div className="customdesign-nav-icons">
            <button className="customdesign-icon-btn" aria-label="Search" onClick={() => navigate('search')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="customdesign-icon-btn" aria-label="Wishlist" onClick={() => navigate('wishlist')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button className="customdesign-icon-btn" aria-label="Account" onClick={() => {
              const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
              navigate(loggedIn ? 'profile' : 'login')
            }}>
              <svg width="16" height="16" viewBox="0 0 31 30" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M15.5 15c2.485 0 4.5-2.015 4.5-4.5S17.985 6 15.5 6s-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5zm0 2.25c-4.142 0-7.5 3.358-7.5 7.5v3.75h15v-3.75c0-4.142-3.358-7.5-7.5-7.5z"/>
              </svg>
            </button>
            <button className="customdesign-icon-btn" aria-label="Cart" onClick={() => navigate('cart')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="customdesign-mobile-menu" ref={mobileMenuRef}>
              {/* Men Section */}
              <button className="customdesign-mobile-menu-item" onClick={() => setMobileSubmenuOpen(mobileSubmenuOpen === 'men' ? null : 'men')}>
                MEN {mobileSubmenuOpen === 'men' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'men' && (
                <div className="customdesign-mobile-submenu">
                  <button onClick={() => { navigate('men/new-arrival'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>NEW ARRIVAL</button>
                  <button onClick={() => { navigate('men/tees'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>TEES</button>
                  <button onClick={() => { navigate('men/hoodies'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>HOODIES</button>
                  <button onClick={() => { navigate('men/sweatshirts'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>SWEATSHIRTS</button>
                  <button onClick={() => { navigate('men/tanktops'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>TANK TOPS</button>
                  <button onClick={() => { navigate('men/shorts'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>SHORTS</button>
                  <button onClick={() => { navigate('men/joggers'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>JOGGERS</button>
                  <button onClick={() => { navigate('men/polo-shirt'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>POLO SHIRT</button>
                  <button onClick={() => { navigate('men/windbreaker'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>WINDBREAKER</button>
                </div>
              )}

              {/* Women Section */}
              <button className="customdesign-mobile-menu-item" onClick={() => setMobileSubmenuOpen(mobileSubmenuOpen === 'women' ? null : 'women')}>
                WOMEN {mobileSubmenuOpen === 'women' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'women' && (
                <div className="customdesign-mobile-submenu">
                  <button onClick={() => { navigate('women/new-arrival'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>NEW ARRIVAL</button>
                  <button onClick={() => { navigate('women/tees'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>TEES</button>
                  <button onClick={() => { navigate('women/hoodies'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>HOODIES</button>
                  <button onClick={() => { navigate('women/sweatshirts'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>SWEATSHIRTS</button>
                  <button onClick={() => { navigate('women/tanktops'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>TANK TOPS</button>
                  <button onClick={() => { navigate('women/shorts'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>SHORTS</button>
                  <button onClick={() => { navigate('women/joggers'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>JOGGERS</button>
                  <button onClick={() => { navigate('women/polo-shirt'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>POLO SHIRT</button>
                  <button onClick={() => { navigate('women/windbreaker'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>WINDBREAKER</button>
                </div>
              )}

              {/* Accessories Section */}
              <button className="customdesign-mobile-menu-item" onClick={() => setMobileSubmenuOpen(mobileSubmenuOpen === 'accessories' ? null : 'accessories')}>
                ACCESSORIES {mobileSubmenuOpen === 'accessories' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'accessories' && (
                <div className="customdesign-mobile-submenu">
                  <button onClick={() => { navigate('accessories/new-arrival'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>NEW ARRIVAL</button>
                  <button onClick={() => { navigate('accessories/tote'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>TOTE BAG</button>
                  <button onClick={() => { navigate('accessories/wallet'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>WALLET</button>
                  <button onClick={() => { navigate('accessories/cap'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>CAP</button>
                  <button onClick={() => { navigate('accessories/backpack'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>BACKPACK</button>
                  <button onClick={() => { navigate('accessories/home-decor'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>HOME & DECOR</button>
                </div>
              )}

              {/* Custom Design */}
              <button className="customdesign-mobile-menu-item" onClick={() => { navigate('custom-design'); setMobileMenuOpen(false); setMobileSubmenuOpen(null); }}>
                CUSTOM DESIGN
              </button>
            </div>
          )}
        </nav>
      </header>
      
      {/* Promotional/Info Bar */}
      <div className="design-info-bar">
        <div className="design-info-content">
          <h2 className="design-info-title">DESIGN YOUR OWN CLOTHING IN JUST MINUTES</h2>
          <p className="design-info-subtitle">no minimum order, even you can order one pc!</p>
          <p className="design-info-description">DESIGN T-SHIRTS, TANK TOPS, HOODIES AND MORE IN OUR ONLINE DESIGN STUDIO.</p>
        </div>
      </div>
      
      <div className="custom-design-container">
        {/* Left Sidebar - Design Tools */}
        <div className="left-design-panel">
          {/* Add Design */}
          <div className="tool-card">
            <button
              className="tool-card-btn"
              onClick={() => setShowDesignModal(true)}
            >
              <div className="tool-icon-box">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#0074D9" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.8" fill="#FFDC00" stroke="#FFDC00"/>
                  <polyline points="21 15 16 10 5 21" stroke="#2ECC40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="tool-label">Add Design</span>
            </button>
          </div>
          
          {/* Add Text */}
          <div className="tool-card">
            <button
              className="tool-card-btn"
              onClick={() => setShowTextModal(true)}
            >
              <div className="tool-icon-box">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <polyline points="4 7 4 4 20 4 20 7" stroke="#FF851B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="9" y1="20" x2="15" y2="20" stroke="#0074D9" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="4" x2="12" y2="20" stroke="#111111" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="tool-label">Add Text</span>
            </button>
          </div>
          
          {/* Name/Team Name */}
          <div className="tool-card" style={{ display: 'none' }}>
            <button
              className="tool-card-btn"
              onClick={() => setShowNameModal(true)}
              disabled
            >
              <div className="tool-icon-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span className="tool-label">Name/Team</span>
            </button>
          </div>
        </div>
        
        {/* Middle Left - Item Controls */}
        <div className="item-controls-panel">
          <button 
            className="control-button"
            onClick={() => setShowItemsModal(true)}
          >
            select item
          </button>
          
          <button 
            className="control-button"
            onClick={() => setShowColorsModal(true)}
          >
            select color
          </button>
          
          <button 
            className="control-button"
            onClick={() => setShowSizePanel(true)}
          >
            select size
          </button>
          
          <button 
            className="control-button"
            onClick={() => setShowTechniqueModal(true)}
          >
            {selectedTechnique === 'Print' && selectedPrintType ? selectedPrintType :
             selectedTechnique === 'Embroidery' && selectedEmbroideryType ? selectedEmbroideryType :
             'select technique'}
          </button>
        </div>
        
        {/* Center - Canvas Area */}
        <div className="canvas-area">
          <canvas
            ref={canvasRef}
            width={450}
            height={450}
            className="design-canvas"
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
        
        {/* Right Sidebar - View Selection */}
        <div className="right-view-panel">
          {/* Toolbar */}
          <div className="canvas-toolbar">
            <button 
              className="toolbar-icon-btn" 
              title="Zoom In"
              onClick={() => {
                if (selectedZone !== null) {
                  startZoomTransition(true, selectedZone)
                }
              }}
              disabled={isZoomed || selectedZone === null}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button 
              className="toolbar-icon-btn" 
              title="Zoom Out"
              onClick={() => {
                startZoomTransition(false)
              }}
              disabled={!isZoomed}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button 
              className="toolbar-icon-btn" 
              title="Copy"
              onClick={() => { console.log('COPY BTN CLICKED'); handleCopy(); }}
              disabled={selectedElement === null}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button 
              className="toolbar-icon-btn" 
              title="Paste"
              onClick={() => { console.log('PASTE BTN CLICKED'); handlePaste(); }}
              disabled={!clipboard}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </button>
            <button 
              className="toolbar-icon-btn" 
              title="Undo"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3l-3 2.7"/>
              </svg>
            </button>
            <button 
              className="toolbar-icon-btn" 
              title="Redo"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
              </svg>
            </button>
          </div>
          
          <div className="view-grid">
            {views.map(view => (
              <div
                key={view.id}
                className={`view-card ${currentView === view.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView(view.id)
                  setSelectedElement(null)
                }}
              >
                <div className="view-preview">
                  <img src={view.image} alt={view.label} className="view-image" />
                </div>
                <p className="view-name">{view.label}</p>
              </div>
            ))}
          </div>
          
          <div className="action-buttons">
            <button className="action-btn" onClick={handleSaveDesign} disabled={!hasDesignElements()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>save</span>
            </button>
            <button className="action-btn" onClick={handleOpenSavedList}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>saved draft</span>
            </button>
          </div>
          
          <button className="btn-submit-price" onClick={handleSubmitForPrice}>
            Submit for Price
          </button>
        </div>
      </div>
      
      {/* Design Modal */}
      {showDesignModal && (
        <div className="modal-overlay" onClick={() => setShowDesignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDesignModal(false)}>×</button>
            <h2>Add Design</h2>
            <div className="modal-body">
              <div className="logo-grid">
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999' }}>No logos available yet</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button className="btn-primary" onClick={() => fileInputRef.current?.click()} style={{ width: '100%' }}>
                Choose from Computer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Text Modal */}
      {showTextModal && (
        <div className="modal-overlay" onClick={() => setShowTextModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTextModal(false)}>×</button>
            <h2>Add Text</h2>
            <div className="modal-body">
              <label>Text</label>
              <input
                type="text"
                placeholder="Enter your text..."
                value={modalTextInput}
                onChange={(e) => setModalTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && modalTextInput.trim()) {
                    // Trigger the add text logic
                    document.querySelector('.modal-content .btn-primary').click()
                  }
                }}
                className="form-input"
              />
              
              <label>Font Size</label>
              <div className="font-size-input">
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={modalFontSize}
                  onChange={(e) => setModalFontSize(parseInt(e.target.value))}
                  className="slider"
                />
                <span>{modalFontSize}px</span>
              </div>
              
              <label>Font Family</label>
              <select
                value={modalFontFamily}
                onChange={(e) => setModalFontFamily(e.target.value)}
                className="form-input"
              >
                {fonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              
              <label>Text Color</label>
              <div className="color-swatches">
                {textColorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${modalTextColor === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setModalTextColor(c)}
                    aria-label={`Choose color ${c}`}
                    title={c}
                  />
                ))}
              </div>
              
              <button 
                className="btn-primary" 
                onClick={() => {
                  if (modalTextInput.trim()) {
                    // Check if a zone is selected
                    if (selectedZone === null) {
                      alert('Please select a zone first to add text')
                      return
                    }
                    
                    const textFontSize = modalFontSize
                    const canvas = canvasRef.current
                    const ctx = canvas ? canvas.getContext('2d') : null
                    let textWidth = modalTextInput.length * textFontSize * 0.6
                    if (ctx) {
                      ctx.font = `${textFontSize}px ${modalFontFamily}`
                      textWidth = ctx.measureText(modalTextInput).width
                    }
                    const textHeight = textFontSize
                    
                    // Get selected zone and place text near the top inside it
                    const zones = getCanvasZones()
                    const zoneIndex = selectedZone !== null ? selectedZone : 0
                    const zone = zones[zoneIndex] || zones[0]
                    const padding = 8
                    let x = zone ? zone.x + (zone.width - textWidth) / 2 : 160
                    let y = zone ? zone.y + padding + textHeight : 160 + textHeight
                    
                    const clamped = clampToBounds(x, y, textWidth, textHeight, zoneIndex, true)
                    
                    const newElement = {
                      type: 'text',
                      text: modalTextInput,
                      x: clamped.x,
                      y: clamped.y,
                      fontSize: textFontSize,
                      fontFamily: modalFontFamily,
                      color: modalTextColor,
                      zoneIndex: zoneIndex
                    }
                    
                    setDesigns(prev => ({
                      ...prev,
                      [currentView]: {
                        ...prev[currentView],
                        elements: [...prev[currentView].elements, newElement]
                      }
                    }))
                    setShowTextModal(false)
                    setModalTextInput('')
                  }
                }}
                style={{ width: '100%' }}
              >
                Add Text to Design
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Name/Team Modal */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowNameModal(false)}>×</button>
            <h2>Name & Team Info</h2>
            <div className="modal-body">
              <label>Player Name</label>
              <input
                type="text"
                placeholder="Enter player name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="form-input"
              />
              
              <label>Number</label>
              <input
                type="text"
                placeholder="Enter number..."
                maxLength="2"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, ''))}
                className="form-input"
              />
              
              <label>Team Name</label>
              <input
                type="text"
                placeholder="Enter team name..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="form-input"
              />
              
              <button 
                className="btn-primary" 
                onClick={() => {
                  // Store name info and add to preview
                  setShowNameModal(false)
                }}
                style={{ width: '100%' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Price Modal */}
      {showPriceModal && (
        <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPriceModal(false)}>×</button>
            <h2>Custom Design Price</h2>
            <div className="price-breakdown">
              <p>Base T-Shirt: <span>TK 800.00</span></p>
              <p>Design Complexity: <span>TK {estimatedPrice - 800}.00</span></p>
              <hr />
              <p className="total-price">Total Price: <span>TK {estimatedPrice}.00</span></p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPriceModal(false)}>
                Continue Editing
              </button>
              <button className="btn-primary" onClick={handleAddToCart}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Items Modal */}
      {showItemsModal && (
        <div className="modal-overlay" onClick={() => setShowItemsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowItemsModal(false)}>×</button>
            <h2>Change Items</h2>
            <div className="modal-body">
              <div className="options-grid">
                {['T-Shirt'].map(item => (
                  <button
                    key={item}
                    className={`option-button ${selectedItem === item ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedItem(item)
                      setShowItemsModal(false)
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Colors Modal */}
      {showColorsModal && (
        <div className="modal-overlay" onClick={() => setShowColorsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowColorsModal(false)}>×</button>
            <h2>Change Colors</h2>
            <div className="modal-body">
              <div className="color-palette">
                {tshirtColors.map(color => (
                  <button
                    key={color.hex}
                    className={`color-option ${backgroundColor === color.hex ? 'active' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => {
                      setBackgroundColor(color.hex)
                      setShowColorsModal(false)
                    }}
                    title={color.name}
                  >
                    {backgroundColor === color.hex && '✓'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Size Side Panel */}
      {showSizePanel && (
        <div className="overlay active" onClick={(e) => { if(e.target.classList.contains('overlay')) setShowSizePanel(false) }}>
          <div className="side-panel">
            <div className="panel-header">
              <h2>SELECT SIZE</h2>
              <div className="panel-actions">
                <button className="panel-close" onClick={() => setShowSizePanel(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <button className="size-guide" onClick={() => { setShowSizePanel(false); setShowSizeGuide(true); }}>SIZE GUIDE</button>

            <div className="size-options">
              {[
                { size: 'X-SMALL', value: 'XS' },
                { size: 'SMALL', value: 'S' },
                { size: 'MEDIUM', value: 'M' },
                { size: 'LARGE', value: 'L' },
                { size: 'X-LARGE', value: 'XL' }
              ].map(({ size, value }) => (
                <div key={value} className="size-option" data-available="true">
                  <div className="size-label">US / {size}</div>
                  <div className="quantity-controls">
                    <button 
                      className="qty-btn" 
                      disabled={sizeQuantities[value] <= 0}
                      onClick={() => setSizeQuantities(prev => ({
                        ...prev,
                        [value]: Math.max(0, prev[value] - 1)
                      }))}
                    >−</button>
                    <span className="qty-value">{sizeQuantities[value]}</span>
                    <button 
                      className="qty-btn"
                      onClick={() => setSizeQuantities(prev => ({
                        ...prev,
                        [value]: prev[value] + 1
                      }))}
                    >+</button>
                  </div>
                  <span className="availability-text available">ITEMS AVAILABLE</span>
                </div>
              ))}
            </div>

            <div className="panel-footer">
              <button className="done-button" onClick={() => setShowSizePanel(false)}>DONE</button>
            </div>
          </div>
        </div>
      )}

      {/* Size Guide Panel */}
      {showSizeGuide && (
        <div className="overlay active" onClick={(e) => { if(e.target.classList.contains('overlay')) setShowSizeGuide(false) }}>
          <div className="side-panel">
            <div className="panel-header">
              <h2>SIZE GUIDE</h2>
              <div className="panel-actions size-guide-actions">
                <button className="panel-close" onClick={() => { setShowSizeGuide(false); setShowSizePanel(true); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="unit-toggle-container">
              <div className="unit-toggle">
                <span className={`unit-label ${sizeGuideUnit === 'cm' ? 'active' : ''}`} onClick={() => setSizeGuideUnit('cm')}>CM</span>
                <button className={`toggle-switch ${sizeGuideUnit === 'in' ? 'active' : ''}`} onClick={() => setSizeGuideUnit(sizeGuideUnit === 'cm' ? 'in' : 'cm')}>
                  <span className="toggle-slider"></span>
                </button>
                <span className={`unit-label ${sizeGuideUnit === 'in' ? 'active' : ''}`} onClick={() => setSizeGuideUnit('in')}>IN</span>
              </div>
            </div>

            <div className="size-chart-container">
              <img 
                src={sizeGuideUnit === 'cm' ? sizeGuideCM : sizeGuideInch} 
                alt="Size Guide" 
                className="size-chart-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* Price Panel */}
      {showPricePanel && (
        <div className="overlay active" onClick={(e) => { if(e.target.classList.contains('overlay')) setShowPricePanel(false) }}>
          <div className="side-panel">
            <div className="panel-header">
              <h2>SHOPPING BAG</h2>
              <div className="panel-actions">
                <button className="panel-close" onClick={() => setShowPricePanel(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="bag-content">
              {Object.entries(sizeQuantities)
                .filter(([size, qty]) => qty > 0)
                .map(([size, qty]) => {
                  const pricePerItem = calculatePrice()
                  const totalPrice = pricePerItem * qty
                  
                  return (
                    <div key={size} className="bag-item">
                      <button 
                        className="bag-item-remove" 
                        onClick={() => setSizeQuantities(prev => ({ ...prev, [size]: 0 }))} 
                        aria-label="Remove item"
                      >✕</button>
                      <img src={designPreviewImage || frontBase} alt="Custom Design" />
                      <div className="bag-item-info">
                        <div className="bag-item-title">Custom Designed T-Shirt</div>
                        <div className="bag-item-details">
                          {backgroundColor} | {size} | Qty: {qty}
                        </div>
                        <div className="bag-item-price">Tk. {totalPrice.toFixed(2)} BDT</div>
                      </div>
                    </div>
                  )
                })}
              <div className="bag-total">
                <div className="bag-total-label">TOTAL</div>
                <div className="bag-total-price">
                  Tk. {(Object.entries(sizeQuantities)
                    .filter(([size, qty]) => qty > 0)
                    .reduce((sum, [size, qty]) => sum + (calculatePrice() * qty), 0)
                  ).toFixed(2)} BDT
                </div>
              </div>
            </div>

            <div className="panel-footer">
              <button className="add-to-bag" onClick={addToBag}>ADD TO BAG</button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Bag Panel */}
      {showShoppingBag && (
        <div className="overlay active" onClick={(e) => { if(e.target.classList.contains('overlay')) setShowShoppingBag(false) }}>
          <div className="side-panel">
            <div className="panel-header">
              <h2>SHOPPING BAG</h2>
              <div className="panel-actions">
                <button className="panel-close" onClick={() => setShowShoppingBag(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="bag-content">
              {bagItems.length === 0 ? (
                <div className="bag-empty">Your bag is empty</div>
              ) : (
                <>
                  {bagItems.map(item => (
                    <div key={item.id} className="bag-item">
                      <button className="bag-item-remove" onClick={() => removeFromBag(item.id)} aria-label="Remove item">✕</button>
                      <img src={item.img} alt={item.title} />
                      <div className="bag-item-info">
                        <div className="bag-item-title">{item.title}</div>
                        <div className="bag-item-details">{item.color} | {item.size} | Qty: {item.qty}</div>
                        <div className="bag-item-price">Tk. {(item.price * item.qty).toFixed(2)} BDT</div>
                      </div>
                    </div>
                  ))}
                  <div className="bag-total">
                    <div className="bag-total-label">TOTAL</div>
                    <div className="bag-total-price">Tk. {getTotalPrice().toFixed(2)} BDT</div>
                  </div>
                </>
              )}
            </div>

            {bagItems.length > 0 && (
              <div className="panel-footer">
                <button className="add-to-bag" onClick={checkout}>CHECKOUT</button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Technique Modal */}
      {showTechniqueModal && (
        <div className="modal-overlay" onClick={() => setShowTechniqueModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTechniqueModal(false)}>×</button>
            <h2>Select Technique</h2>
            <div className="modal-body">
              <div className="technique-section">
                <h3>Technique</h3>
                <div className="options-grid">
                  {['Print', 'Embroidery'].map(technique => (
                    <button
                      key={technique}
                      className={`option-button ${selectedTechnique === technique ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTechnique(technique)
                      }}
                    >
                      {technique}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTechnique === 'Print' && (
                <div className="technique-section">
                  <h3>Print Type</h3>
                  <div className="print-options">
                    {['pigment print', 'rubber print', 'highdensity print', 'silicon print'].map(printType => (
                      <label key={printType} className="radio-option">
                        <input
                          type="radio"
                          name="printType"
                          checked={selectedPrintType === printType}
                          onChange={() => {
                            setSelectedTechnique('Print')
                            setSelectedPrintType(printType)
                            setShowTechniqueModal(false)
                          }}
                        />
                        <span>{printType}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedTechnique === 'Embroidery' && (
                <div className="technique-section">
                  <h3>Embroidery Type</h3>
                  <div className="print-options">
                    {['satin embroidery', '3D embroidery'].map(type => (
                      <label key={type} className="radio-option">
                        <input
                          type="radio"
                          name="embroideryType"
                          checked={selectedEmbroideryType === type}
                          onChange={() => {
                            setSelectedTechnique('Embroidery')
                            setSelectedEmbroideryType(type)
                            setShowTechniqueModal(false)
                          }}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Design Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSaveModal(false)}>×</button>
            <h2>Save Design</h2>
            <div className="modal-body">
              <label>Design Name</label>
              <input
                type="text"
                className="form-input"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveName.trim() && !isSavingDesign) {
                    handleConfirmSave()
                  }
                }}
                placeholder="Enter design name"
                autoFocus
              />
              {saveError && <p className="modal-error">{saveError}</p>}
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowSaveModal(false)} disabled={isSavingDesign || savedSuccessfully}>Cancel</button>
                <button className="btn-primary" onClick={handleConfirmSave} disabled={isSavingDesign || savedSuccessfully}>
                  {savedSuccessfully ? 'Saved ✓' : (isSavingDesign ? 'Saving…' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Designs Modal */}
      {showSavedListModal && (
        <div className="modal-overlay" onClick={() => setShowSavedListModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSavedListModal(false)}>×</button>
            <h2>Saved Designs</h2>
            <div className="modal-body">
              {isLoadingSaved ? (
                <p style={{ textAlign: 'center', color: '#666', margin: '0 auto' }}>Loading designs…</p>
              ) : savedListError ? (
                <p style={{ textAlign: 'center', color: 'red', margin: '0 auto' }}>{savedListError}</p>
              ) : savedDesigns.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', margin: '0 auto' }}>No saved designs</p>
              ) : (
                <div className="saved-designs-list">
                  {savedDesigns.map((design, idx) => (
                    <button
                      key={design.id || idx}
                      className="saved-design-card"
                      onClick={() => handleLoadSavedDesign(design, idx)}
                    >
                      {design.preview_url && (
                        <div className="saved-design-preview">
                          <img 
                            src={resolveBackendUrl(design.preview_url)} 
                            alt={design.design_name}
                            style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        </div>
                      )}
                      <div className="saved-design-meta">
                        <span className="saved-design-name">{design.design_name || `Design ${idx + 1}`}</span>
                        <span className="saved-design-date">{new Date(design.updated_at || design.created_at).toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
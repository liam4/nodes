// ----
// Retina devices use Stupid Hacks to make everything super high definition,
// but thankfully you can deal with those Stupid Hacks by multiplying
// EVERYTHING by window.devicePixelRatio. Always use retfix!
const retfix = n => n * window.devicePixelRatio
// ----

// ----
// Utility functions that apply retfix to builtin canvas primitives for you.
const drawLine = function(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(retfix(x1), retfix(y1))
  ctx.lineTo(retfix(x2), retfix(y2))
  ctx.stroke()
}

const drawRect = function(ctx, x, y, w, h) {
  ctx.fillRect(retfix(x), retfix(y), retfix(w), retfix(h))
}

const drawArc = function(ctx, x, y, r, sa, ea, ccw) {
  ctx.beginPath()
  ctx.arc(retfix(x), retfix(y), retfix(r), sa, ea, ccw)
  ctx.fill()
}

const drawImage = function(ctx, image, x, y) {
  ctx.drawImage(image, retfix(x), retfix(y))
}
// ----

// ----
// Super quick observer utility functions.
// Test: https://gist.github.com/liam4/ea9e4a961e54776f8956b5ae16dcf98f
const observe = {
  watchersSymbol: Symbol('observe.watchersSymbol'),

  make: function(obj, prop, firstValue = undefined) {

    if (!(observe.watchersSymbol in obj)) {
      obj[observe.watchersSymbol] = new Map()
    }

    const watchers = []
    obj[observe.watchersSymbol].set(prop, watchers)

    let value
    if (typeof firstValue === 'undefined') {
      value = obj[prop]
    } else {
      value = firstValue
    }

    Object.defineProperty(obj, prop, {
      set: function(newValue) {
        value = newValue

        for (let cb of watchers) {
          cb(newValue)
        }
      },

      get: function() {
        return value
      }
    })

  },

  watch: function(obj, prop, cb, runImmediately = false) {
    // If the watchers map doesn't exist or the watchers map doesn't have an
    // array for this property, use observe.make to get the object set up for
    // everything.

    let watchersMap = obj[observe.watchersSymbol]
    if (!(watchersMap && watchersMap.has(prop))) {
      observe.make(obj, prop)
      watchersMap = obj[observe.watchersSymbol]
    }

    const watchers = watchersMap.get(prop)
    watchers.push(cb)

    if (runImmediately) {
      cb(obj[prop])
    }

    return function deleteWatcher() {
      watchers.pop(watchers.indexOf(cb))
    }
  },

  // Use this as a callback to be passed to observe.watch.
  changed: function(cb) {
    let value
    return function(newValue) {
      if (value !== newValue) {
        value = newValue
        cb(newValue)
      }
    }
  }
}
// ----

const App = class App {
  constructor() {
    this.nodes = []
    this.selectedNode = null
    this.draggingNode = null
    this.draggingOutput = null
    this.scrollX = 0
    this.scrollY = 0
    this.mouseX = 0
    this.mouseY = 0

    this.canvas = document.createElement('canvas')
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh'
    })
    document.body.appendChild(this.canvas)

    this.nodeEditorEl = document.createElement('div')
    this.nodeEditorEl.classList.add('node-editor')

    this.nodeEditorNameEl = document.createElement('div')
    this.nodeEditorNameEl.classList.add('node-editor-name')
    this.nodeEditorEl.appendChild(this.nodeEditorNameEl)

    this.nodeEditorDescriptionEl = document.createElement('div')
    this.nodeEditorDescriptionEl.classList.add('node-editor-description')
    this.nodeEditorEl.appendChild(this.nodeEditorDescriptionEl)

    const outputLabel = document.createElement('label')
    outputLabel.appendChild(document.createTextNode('Output: '))
    this.outputInputEl = document.createElement('input')
    this.outputInputEl.type = 'text'
    this.outputInputEl.value = 'None'
    this.outputInputEl.disabled = true
    outputLabel.appendChild(this.outputInputEl)
    this.nodeEditorEl.appendChild(outputLabel)

    document.body.appendChild(this.nodeEditorEl)

    this.initMouseListeners()

    this.deselect()
  }

  initMouseListeners() {
    const dragThreshold = 5
    let dragAmount = 0

    let mouseDown = false
    let didDrag = false
    let downEvt = null

    document.addEventListener('mousedown', evt => {
      mouseDown = true
      downEvt = evt
    })

    document.addEventListener('mouseup', evt => {
      this.handleMouseUp(evt)

      mouseDown = false

      if (!didDrag) {
        this.handleClicked(evt)
      }

      didDrag = false
      dragAmount = 0
    })

    document.addEventListener('mousemove', evt => {
      this.mouseX = evt.clientX
      this.mouseY = evt.clientY

      if (mouseDown) {
        dragAmount += Math.abs(evt.movementX) + Math.abs(evt.movementY)

        if (dragAmount > dragThreshold) {
          if (!didDrag) {
            this.handleDragStart(downEvt)
          }

          didDrag = true

          this.handleDragged(evt)
        }
      }
    })

    document.addEventListener('wheel', evt => {
      this.handleScrolled(evt)
    })
  }

  // Called when the user releases the mouse cursor, if tbe cursor wasn't
  // dragged.
  handleClicked(evt) {
    const mx = evt.clientX
    const my = evt.clientY

    const nodeUnderCursor = this.getNodeUnderPos(mx, my)

    if (nodeUnderCursor && nodeUnderCursor !== this.selectedNode) {
      this.selectNode(nodeUnderCursor)
    } else {
      this.deselect()
    }
  }

  // Called when the user releases the mouse cursor.
  handleMouseUp(evt) {
    this.draggingNode = null
    this.draggingOutput = null
  }

  // Called when the user starts dragging. (Specifically, the first tick of a
  // drag.)
  //
  // Note that drags won't start until the mouse is moved past a certain
  // threshold (to make clicking easier). However, handleDragStart will not
  // be passed a mouse-dragged event but rather the OLD mouse-down event for
  // when the mouse was pressed down before the drag threshold was passed.
  handleDragStart(evt) {
    const mx = evt.clientX
    const my = evt.clientY

    const nodeUnderCursor = this.getNodeUnderPos(mx, my)
    const outputUnderCursor = this.getOutputUnderPos(mx, my)
    if (nodeUnderCursor) {
      this.draggingNode = nodeUnderCursor
    } else if (outputUnderCursor) {
      this.draggingOutput = {
        node: outputUnderCursor,
        pos: [this.mouseX, this.mouseY]
      }
    }
  }

  // Called when the user moves the mouse cursor while it's pressed down.
  handleDragged(evt) {
    if (this.draggingNode) {
      this.draggingNode.x += evt.movementX
      this.draggingNode.y += evt.movementY
    } else if (this.draggingOutput) {
      this.draggingOutput.pos[0] += evt.movementX
      this.draggingOutput.pos[1] += evt.movementY
    } else {
      this.handleScrolled({
        deltaX: evt.movementX,
        deltaY: evt.movementY
      })
    }
  }

  // Called when the user scrolls using the mousewheel or a trackpad.
  handleScrolled(evt) {
    this.scrollX -= evt.deltaX
    this.scrollY -= evt.deltaY
  }

  // Gets the node whose body is under the given position. If no such node
  // exists, return null.
  getNodeUnderPos(x, y) {
    const nodes = this.nodes.filter(node => (
      x > this.scrollifyX(node.x) &&
      x < this.scrollifyX(node.x + node.width) &&
      y > this.scrollifyY(node.y) &&
      y < this.scrollifyY(node.y + node.height)
    ))

    if (nodes.length) {
      return nodes[nodes.length - 1]
    } else {
      return null
    }
  }

  // Gets the node whose output wire connection is under the given position.
  // If no such node exists, return null.
  getOutputUnderPos(x, y) {
    const nodes = this.nodes.filter(node => {
      const [outX, outY] = this.scrollify(this.getOutputWirePos(node))
      return (
        x > outX && x < outX + 10 &&
        y > outY - 10 && y < outY + 10
      )
    })

    if (nodes.length) {
      return nodes[nodes.length - 1]
    } else {
      return null
    }
  }

  // Deselects a selected node and hides the node editor.
  deselect() {
    this.nodeEditorEl.classList.add('no-selection')

    if (this.selectedNode) {
      this.selectedNode.selected = false

      this.selectedNodeOutputWatcher()
      this.selectedNodeNameWatcher()
      this.selectedNodeDescriptionWatcher()

      this.selectedNode = null
    }
  }

  // Select a node. Opens the node editor.
  selectNode(node) {
    this.deselect()

    this.selectedNode = node
    node.selected = true
    this.nodeEditorEl.classList.remove('no-selection')

    this.selectedNodeOutputWatcher = observe.watch(node,
      'output', observe.changed(newOutput => {
        this.outputInputEl.value = newOutput
      }),
    true)

    this.selectedNodeNameWatcher = observe.watch(node,
      'name', observe.changed(newName => {
        this.nodeEditorNameEl.innerText = newName
      }),
    true)

    this.selectedNodeDescriptionWatcher = observe.watch(node,
      'description', observe.changed(newDescription => {
        this.nodeEditorDescriptionEl.innerText = newDescription
      }),
    true)
  }

  // Gets the value of a node input.
  getValueOfInput(input) {
    if (input.type === 'node') {
      return input.node.output
    } else if (input.type === 'value') {
      return input.value
    }
  }

  // Executes every node once, in no particular order.
  execute() {
    for (let node of this.nodes) {
      if (this.getValueOfInput(node.inputs[0])) {
        node.execute()
      }
    }
  }

  // Gets the output wire connection position of a node.
  getOutputWirePos(node) {
    return [
      node.x + node.width,
      node.centerY
    ]
  }

  // Gets the input wire conenction position of a node, given the input's
  // index.
  getInputWirePos(node, i) {
    return [
      node.x,
      (
        node.y +
        0.15 * node.height +
        ((0.7 * node.height) / node.inputs.length) * (i + 0.5)
      )
    ]
  }

  // Draws everything. Should be called once every browser animation frame.
  draw() {
    this.canvas.width = retfix(window.innerWidth)
    this.canvas.height = retfix(window.innerHeight)

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = '#123'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // First draw connections..
    for (let node of this.nodes) {
      for (let input of node.inputs.filter(inp => inp.type === 'node')) {

        const i = node.inputs.indexOf(input)

        // Powered connections should have a lighter color..
        if (input.node.output) {
          ctx.strokeStyle = '#5A5'
        } else {
          ctx.strokeStyle = '#353'
        }

        ctx.lineWidth = 5

        const [startX, startY] = this.scrollify(
          this.getOutputWirePos(input.node))
        const [endX, endY] = this.scrollify(
          this.getInputWirePos(node, i))

        drawLine(ctx, startX, startY, endX, endY)
      }
    }

    // Then draw the actual nodes.
    for (let node of this.nodes) {
      node.draw()
      drawImage(ctx, node.canvas,
        this.scrollifyX(node.x), this.scrollifyY(node.y))
    }

    if (this.selectedNode) {
      // Move the node editor beside the node it's focused on.
      Object.assign(this.nodeEditorEl.style, {
        left: this.scrollifyX(this.selectedNode.centerX) + 'px',
        top: this.scrollifyY(this.selectedNode.centerY) + 'px'
      })

      // Make the node editor's color be the same as the node it's selected.
      const selColor = this.selectedNode.color
      this.nodeEditorEl.style.backgroundColor = (
        `rgba(${selColor[0]}, ${selColor[1]}, ${selColor[2]}, 0.3)`
      )
      this.nodeEditorEl.style.borderColor = (
        `rgba(${selColor[0]}, ${selColor[1]}, ${selColor[2]}, 0.5)`
      )
    }

    const outputUnderCursor = this.getOutputUnderPos(
      this.mouseX, this.mouseY)

    if (outputUnderCursor) {
      const [outX, outY] = this.scrollify(
        this.getOutputWirePos(outputUnderCursor))

      ctx.fillStyle = 'white'
      ctx.filter = 'blur(3px)'
      drawArc(ctx, outX, outY, 8, 0.5 * Math.PI, 1.5 * Math.PI, true)
      ctx.filter = 'none'
    }

    if (this.draggingOutput) {
      ctx.strokeStyle = 'rgba(75, 150, 75, 0.5)'
      ctx.lineWidth = 5
      const [startX, startY] = this.scrollify(this.getOutputWirePos(
        this.draggingOutput.node))
      const [endX, endY] = this.scrollify(this.draggingOutput.pos)
      drawLine(ctx, startX, startY, endX, endY)
    }

    // Don't let the node editor be part outside of the screen.
    // const bounds = this.nodeEditorEl.getBoundingClientRect()
    // if (bounds.bottom > window.innerHeight)
    //   this.nodeEditorEl.style.top = (
    //     (window.innerHeight - bounds.height) + 'px'
    //   )
    // if (bounds.right > window.innerWidth)
    //   this.nodeEditorEl.style.left = (
    //     (window.innerWidth - bounds.width) + 'px'
    //   )
  }

  // Scrollify an X position.
  scrollifyX(x) {
    return x - this.scrollX
  }

  // Scrollify a Y position.
  scrollifyY(y) {
    return y - this.scrollY
  }

  // Scrollify an array containing an X/Y position.
  scrollify([x, y]) {
    return [
      this.scrollifyX(x),
      this.scrollifyY(y)
    ]
  }
}

App.Node = class Node {
  constructor() {
    this.inputs = [
      {type: 'value', value: true}
    ]
    this.width = 40
    this.height = 40
    this.x = 80
    this.y = 80
    this.color = 'green'
    this.name = ''
    this.description = ''
    this.selected = false
    this.canvas = document.createElement('canvas')
  }

  draw() {
    this.canvas.width = retfix(this.width)
    this.canvas.height = retfix(this.height)

    let color = [...this.color]

    if (this.selected) {
      color = color.map(x => Math.min(x + 30, 255))
    }

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
    drawRect(ctx, 0, 0, this.width, this.height)
  }

  getInput(n) {
    return App.prototype.getValueOfInput(this.inputs[n])
  }

  get centerX() {
    return this.x + this.width / 2
  }

  get centerY() {
    return this.y + this.height / 2
  }
}

// ----

const app = new App()

const battery = new App.Node()
battery.name = 'Battery'
battery.description = 'Always outputs true'
battery.x = 100
battery.y = 100
battery.execute = function() {
  this.output = true
}
app.nodes.push(battery)

const convertToPulse = new App.Node()
convertToPulse.name = 'Pulsifier'
convertToPulse.description = 'Converts input to a pulse'
convertToPulse.x = 200
convertToPulse.y = 50
convertToPulse.inputs[0] = {type: 'node', node: battery}
convertToPulse.execute = function() {
  if (this.wasTriggered) {
    this.output = false
  }

  if (this.getInput(0)) {
    if (!this.wasTriggered) {
      this.wasTriggered = true
      this.output = true
    }
  } else {
    if (this.wasTriggered) {
      this.wasTriggered = false
    }
  }
}
app.nodes.push(convertToPulse)

const textNode = new App.Node()
textNode.name = 'Random Word Generator'
textNode.description = 'Outputs a random word'
textNode.x = 200
textNode.y = 150
textNode.words = ['Apple', 'Banana', 'Chair', 'Rainbow', 'Unicorn']
textNode.inputs[0] = {type: 'node', node: battery}
textNode.execute = function() {
  if (this.getInput(0)) {
    const index = Math.floor(Math.random() * this.words.length)
    this.output = this.words[index]
  }
}
app.nodes.push(textNode)

const echoer = new App.Node()
echoer.name = 'Echoer'
echoer.description = 'Echoes its input'
echoer.x = 300
echoer.y = 200
echoer.inputs[0] = {type: 'node', node: convertToPulse}
echoer.inputs[1] = {type: 'node', node: textNode}
echoer.execute = function() {
  this.output = this.getInput(1)
  console.log(this.output)
}
app.nodes.push(echoer)

app.deselect()
battery        .color = [200, 131, 48]
convertToPulse .color = [225, 169, 26]
echoer         .color = [138, 35, 215]
textNode       .color = [92, 138, 18]

const drawLoop = function() {
  app.draw()
  requestAnimationFrame(drawLoop)
}

drawLoop()

const executeLoop = function() {
  app.execute()
  setTimeout(executeLoop, 20)
}

executeLoop()

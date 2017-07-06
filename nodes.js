// TODO: Wire glow-bubbles shouldn't appear when we're dragging a node.
// TODO: Value-input controls.
// TODO: A palette, duh.

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
    this.canvasWidth = 0
    this.canvasHeight = 0

    this.canvas = document.createElement('canvas')
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh'
    })

    this.nodeEditorEl = document.createElement('div')
    this.nodeEditorEl.classList.add('node-editor')

    this.nodeEditorNameEl = document.createElement('h1')
    this.nodeEditorNameEl.classList.add('node-editor-name')
    this.nodeEditorEl.appendChild(this.nodeEditorNameEl)

    this.nodeEditorDescriptionEl = document.createElement('div')
    this.nodeEditorDescriptionEl.classList.add('node-editor-description')
    this.nodeEditorEl.appendChild(this.nodeEditorDescriptionEl)

    const outputParagraph = document.createElement('p')

    const outputLabel = document.createElement('label')
    outputLabel.appendChild(document.createTextNode('Output: '))
    this.outputInputEl = document.createElement('input')
    this.outputInputEl.type = 'text'
    this.outputInputEl.value = 'None'
    this.outputInputEl.disabled = true
    outputLabel.appendChild(this.outputInputEl)
    outputParagraph.appendChild(outputLabel)

    this.nodeEditorEl.appendChild(outputParagraph)

    this.nodeEditorRemoveButton = document.createElement('button')
    this.nodeEditorRemoveButton.appendChild(document.createTextNode('Remove'))
    this.nodeEditorRemoveButton.addEventListener('click', () => {
      this.handleNodeEditorRemovePressed()
    })
    this.nodeEditorEl.appendChild(this.nodeEditorRemoveButton)

    const inputListTitle = document.createElement('h2')
    inputListTitle.appendChild(document.createTextNode('Inputs:'))
    this.nodeEditorEl.appendChild(inputListTitle)

    this.nodeEditorInputsEl = document.createElement('div')
    this.nodeEditorInputsEl.classList.add('node-editor-input-list')
    this.nodeEditorEl.appendChild(this.nodeEditorInputsEl)

    this.initMouseListeners()

    this.deselect()
  }

  // Appends important DOM elements.
  appendElementsTo(parent) {
    parent.appendChild(this.canvas)
    parent.appendChild(this.nodeEditorEl)
  }

  initMouseListeners() {
    const dragThreshold = 5
    let dragAmount = 0

    let mouseDown = false
    let didDrag = false
    let lastWheelDate = 0
    let downEvt = null
    let startedOnCanvas = false

    document.addEventListener('mousedown', evt => {
      mouseDown = true
      downEvt = evt
      const mouseEl = document.elementFromPoint(evt.clientX, evt.clientY)

      if (mouseEl === this.canvas) {
        startedOnCanvas = true
      }
    })

    document.addEventListener('mouseup', evt => {
      if (startedOnCanvas) {
        this.handleMouseUp(evt)

        if (!didDrag) {
          this.handleClicked(evt)
        }
      }

      mouseDown = false
      startedOnCanvas = false
      didDrag = false
      dragAmount = 0
    })

    document.addEventListener('mousemove', evt => {
      this.mouseX = evt.clientX
      this.mouseY = evt.clientY

      if (startedOnCanvas && mouseDown) {
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
      // TODO: Panning probably gets stuck on elements when you scroll slowly
      // because of this.. what we want to do is see when the user lifts their
      // fingers off the trackpad, but an event like that might not actually
      // exist (across browsers, anyways). Maybe we can just prevent the scroll
      // event on the node editor from bubbling, but wouldn't really work if
      // the app is anything but filling the whole screen.
      /*
      if (Date.now() - lastWheelDate > 50) {
        const mouseEl = document.elementFromPoint(evt.clientX, evt.clientY)

        startedOnCanvas = (mouseEl === this.canvas)
      }

      lastWheelDate = Date.now()

      if (startedOnCanvas) {
        this.handleScrolled(evt)
      }
      */

      const mouseEl = document.elementFromPoint(evt.clientX, evt.clientY)
      if (mouseEl === this.canvas) {
        this.handleScrolled(evt)
      }
    })
  }

  // Called when the user releases the mouse cursor, if tbe cursor wasn't
  // dragged.
  handleClicked(evt) {
    const mx = evt.clientX
    const my = evt.clientY

    const nodeUnderCursor = this.getNodeUnderPos(mx, my)
    const inputUnderCursor = this.getInputUnderPos(mx, my)

    if (nodeUnderCursor && nodeUnderCursor !== this.selectedNode) {
      this.selectNode(nodeUnderCursor)
    } else {
      // If you're removing an input to this node, don't hide the node
      // editor, that way it's easier to see a changed output right away.
      if (!(
        inputUnderCursor &&
        inputUnderCursor.node === this.selectedNode
      )) {
        this.deselect()
      }
    }

    if (inputUnderCursor && inputUnderCursor.input
        && inputUnderCursor.input.type === 'node') {
      inputUnderCursor.node.inputs[inputUnderCursor.i] = null
    }
  }

  // Called when the user releases the mouse cursor.
  handleMouseUp(evt) {
    if (this.draggingOutput) {
      const inputUnderWire = this.getInputUnderPos(
        ...this.draggingOutput.pos)

      if (inputUnderWire) {
        inputUnderWire.node.inputs[inputUnderWire.i] = {
          type: 'node',
          node: this.draggingOutput.node
        }
      }
    }

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
      this.draggingOutput.pos = [
        evt.clientX,
        evt.clientY
      ]
    } else {
      this.handleScrolled({
        deltaX: -evt.movementX,
        deltaY: -evt.movementY
      })
    }
  }

  // Called when the user scrolls using the mousewheel or a trackpad.
  handleScrolled(evt) {
    this.scrollX += evt.deltaX
    this.scrollY += evt.deltaY
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

  // Gets the input which is under the given position. If no such node
  // exists, return null. The return object is an object in the form of
  // {i: inputIndex, input: inputObject, node: parentNode}.
  getInputUnderPos(x, y) {
    const objects = this.nodes.map(node => (
      node.inputs.map((input, i) => {
        const [posX, posY] = this.scrollify(this.getInputWirePos(node, i))
        return (
          x > posX - 10 && x < posX &&
          y > posY - 10 && y < posY + 10
        ) ? {input, i, node} : false
      }).filter(input => !!input)
    )).reduce((arr, inputs) => arr.concat(inputs), [])

    if (objects.length) {
      return objects[objects.length - 1]
    } else {
      return null
    }
  }

  // Deselects a selected node and hides the node editor.
  deselect() {
    this.nodeEditorEl.classList.add('no-selection')

    if (this.selectedNode) {
      this.selectedNode.selected = false

      // Destroy old watchers.
      this.selectedNodeOutputWatcher()
      this.selectedNodeNameWatcher()
      this.selectedNodeDescriptionWatcher()
      for (let watcher of this.selectedNodeInputWatchers) {
        watcher()
      }

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

    this.selectedNodeInputWatchers = []

    while (this.nodeEditorInputsEl.firstChild) {
      this.nodeEditorInputsEl.firstChild.remove()
    }

    for (let index = 0; index < node.inputSchema.length; index++) {
      let input = node.inputs[index]
      let schema = node.inputSchema[index]

      let inputValueWatcher

      const inputEl = document.createElement('div')

      inputEl.appendChild(document.createTextNode(`${index}: `))

      const html5Input = document.createElement('input')
      html5Input.value = node.getInput(index)
      inputEl.appendChild(html5Input)

      if (schema.type === 'number') {
        html5Input.type = 'number'
      } else if (schema.type === 'string') {
        html5Input.type = 'text'
      } else if (schema.type === 'boolean') {
        html5Input.type = 'text' // TODO: How to make a dropdown here?
      }

      let selectOptions = (
        schema.select ||
        (schema.type === 'boolean' ? [true, false] : null)
      )

      if (selectOptions) {
        const select = document.createElement('select')
        for (let optionString of selectOptions) {
          const option = document.createElement('option')
          option.appendChild(document.createTextNode(optionString))
          select.appendChild(option)

          if (
            input && input.type === 'value' && input.value === optionString
          ) {
            option.selected = 'selected'
          }
        }

        // TODO: Does this get garbage collected?
        select.addEventListener('change', () => {
          input = {type: 'value', value: selectOptions[select.selectedIndex]}
          node.inputs[index] = input
          setValue()
          updateWatcher()
        })

        inputEl.appendChild(select)
      }

      // TODO: Does this listener get scrapped or not? Probably not. That's
      // bad!
      html5Input.addEventListener('change', () => {
        input = {type: 'value', value: (
          schema.type === 'string' ? html5Input.value :
          schema.type === 'number' ? parseFloat(html5Input.value) :
          schema.type === 'boolean' ? (
            html5Input.value === 'true' ? true : false) :
          html5Input.value
        )}
        node.inputs[index] = input
        setValue()
        updateWatcher()
      })

      const inputTypeLabel = document.createTextNode('')
      inputEl.appendChild(inputTypeLabel)

      const setValue = (newValue = node.getInput(index)) => {
        if (document.activeElement === html5Input) {
          html5Input.placeholder = newValue
        } else {
          html5Input.placeholder = ''
          html5Input.value = newValue
        }
      }

      const updateWatcher = () => {
        if (inputValueWatcher) {
          inputValueWatcher()
        }

        if (input === undefined || input === null) {
          inputTypeLabel.textContent = ' (Unset)'
        } else if (input.type === 'value') {
          inputTypeLabel.textContent = ' (Value)'

          // TODO: Can't test this yet.
        } else if (input.type === 'node') {
          inputTypeLabel.textContent = ' (Node)'

          inputValueWatcher = observe.watch(input.node,
            'output', observe.changed(newOutput => {
              setValue(newOutput)
            }))

          this.selectedNodeInputWatchers.push(inputValueWatcher)
        }
      }

      updateWatcher()

      this.selectedNodeInputWatchers.push(observe.watch(node.inputs,
        index, observe.changed(() => {
          input = node.inputs[index]
          updateWatcher()
        })))

      this.nodeEditorInputsEl.appendChild(inputEl)
    }
    this.nodeEditorInputsEl.firstChild
  }

  handleNodeEditorRemovePressed() {
    this.removeNode(this.selectedNode)
    this.deselect()
  }

  removeNode(nodeToRemove) {
    const index = this.nodes.indexOf(nodeToRemove)

    if (index >= 0) {
      this.nodes.splice(index, 1)

      // We don't want any of our remaining nodes to have connections to the
      // node we just removed.
      for (let node of this.nodes) {
        for (let i = 0; i < node.inputs.length; i++) {
          const input = node.inputs[i]
          if (input && input.type === 'node' && input.node === nodeToRemove) {
            node.inputs[i] = null
          }
        }
      }
    }
  }

  // Gets the value of a node input.
  getValueOfInput(input) {
    if (!input || typeof input !== 'object') {
      return input
    } else if (input.type === 'node') {
      return input.node.output
    } else if (input.type === 'value') {
      return input.value
    }
  }

  // Executes every node once, in no particular order.
  execute() {
    for (let node of this.nodes) {
      node.execute()
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
    this.canvas.width = retfix(this.canvasWidth)
    this.canvas.height = retfix(this.canvasHeight)
    this.canvas.style.width = this.canvasWidth + 'px'
    this.canvas.style.height = this.canvasHeight + 'px'

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = '#123'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // First draw connections..
    for (let node of this.nodes) {
      const nodeInputs = node.inputs.filter(
        inp => inp && inp.type === 'node')
      for (let input of nodeInputs) {

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

    // If there's an output wire source thing under our cursor, draw a
    // glowing semicircle there to show that.
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

    // If we're dragging an output wire, draw that wire.
    if (this.draggingOutput) {
      ctx.strokeStyle = 'rgba(75, 150, 75, 0.5)'
      ctx.lineWidth = 5
      const [startX, startY] = this.scrollify(this.getOutputWirePos(
        this.draggingOutput.node))
      const [endX, endY] = this.draggingOutput.pos
      drawLine(ctx, startX, startY, endX, endY)

      const inputUnderCursor = this.getInputUnderPos(
        this.mouseX, this.mouseY)

      if (inputUnderCursor) {
        const [inputX, inputY] = this.scrollify(this.getInputWirePos(
          inputUnderCursor.node, inputUnderCursor.i))
        ctx.fillStyle = 'white'
        ctx.filter = 'blur(3px)'
        drawArc(ctx, inputX, inputY, 8, 0.5 * Math.PI, 1.5 * Math.PI, false)
        ctx.filter = 'none'
      }
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

  // Makes the app canvas fill its parent element.
  fillParent() {
    const parent = this.canvas.parentNode
    const bounds = parent.getBoundingClientRect()
    this.canvasWidth = bounds.width
    this.canvasHeight = bounds.height
  }

  // Scrollifies an X position.
  scrollifyX(x) {
    return x - this.scrollX
  }

  // Scrollifies a Y position.
  scrollifyY(y) {
    return y - this.scrollY
  }

  // Scrollifies an array containing an X/Y position.
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

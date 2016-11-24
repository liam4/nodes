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
// ----

const App = class {
  constructor() {
    this.nodes = []

    this.canvas = document.createElement('canvas')
    Object.assign(this.canvas.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh'
    })
    this.canvas.width = retfix(window.innerWidth)
    this.canvas.height = retfix(window.innerHeight)
    document.body.appendChild(this.canvas)

    this.nodeEditorEl = document.createElement('div')
    document.body.appendChild(this.canvas)
  }

  execute() {
    for (let node of this.nodes) {
      if (App.getValueOfInput(node.inputs[0])) {
        node.execute()
      }
    }
  }

  static getValueOfInput(input) {
    if (input.type === 'node') {
      return input.node.output
    } else if (input.type === 'value') {
      return input.value
    }
  }

  draw() {
    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = '#203A27'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // First draw connections..
    for (let node of this.nodes) {
      for (let input of node.inputs.filter(inp => inp.type === 'node')) {

        // Powered connections should have a color..
        if (input.node.output) {
          ctx.strokeStyle = '#5A5'
        } else {
          ctx.strokeStyle = '#353'
        }

        ctx.lineWidth = 5
        drawLine(ctx,
          node.centerX, node.centerY,
          input.node.centerX, input.node.centerY)
      }
    }

    // Then draw the actual nodes..
    for (let node of this.nodes) {
      node.draw()
      ctx.drawImage(node.canvas, retfix(node.x), retfix(node.y))
    }
  }
}

App.Node = class {
  constructor() {
    this.inputs = [
      {type: 'value', value: true}
    ]
    this.width = 40
    this.height = 40
    this.x = 80
    this.y = 80
    this.canvas = document.createElement('canvas')
    this.color = 'green'
  }

  draw() {
    this.canvas.width = retfix(this.width)
    this.canvas.height = retfix(this.height)

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = this.color
    drawRect(ctx, 0, 0, this.width, this.height)
  }

  getInput(n) {
    return App.getValueOfInput(this.inputs[n])
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
battery.name = 'Always outputs true'
battery.x = 120
battery.y = 30
battery.execute = function() {
  this.output = true
}
app.nodes.push(battery)

const convertToPulse = new App.Node()
convertToPulse.name = 'Converts input to a pulse'
convertToPulse.x = 80
convertToPulse.y = 90
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
textNode.name = 'Outputs a random word'
textNode.x = 200
textNode.y = 90
textNode.words = ['Apple', 'Banana', 'Chair', 'Rainbow', 'Unicorn']
textNode.inputs[0] = {type: 'node', node: battery}
textNode.execute = function() {
  if (this.getInput(0)) {
    const index = Math.floor(Math.random() * this.words.length)
    this.output = this.words[index]
  }
}
app.nodes.push(textNode)

const node = new App.Node()
node.name = 'Displays text in the console'
node.x = 150
node.y = 150
node.inputs[0] = {type: 'node', node: convertToPulse}
node.inputs[1] = {type: 'node', node: textNode}
node.execute = function() {
  console.log(this.getInput(1))
}
app.nodes.push(node)

battery        .color = 'rgb(200, 131, 48)'
convertToPulse .color = 'rgb(225, 169, 26)'
node           .color = 'rgb(138, 35, 215)'
textNode       .color = 'rgb(92, 138, 18)'

const drawLoop = function() {
  app.draw()
  requestAnimationFrame(drawLoop)
}

drawLoop()

const executeLoop = function() {
  app.execute()
  setTimeout(executeLoop, 20)
}

for (let i = 0; i < 2; i++) {
  app.execute()
}

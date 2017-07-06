const app = new App()

const battery = new App.nodes.BatteryNode()
battery.x = 100
battery.y = 100
app.nodes.push(battery)

const textNode = new App.nodes.RandomWordGeneratorNode()
textNode.x = 200
textNode.y = 150
textNode.inputs[0] = {type: 'node', node: battery}
textNode.inputs[1] = {
  type: 'value', value: 'Apple,Banana,Chair,Rainbow,Unicorn'}
app.nodes.push(textNode)

const cycler = new App.nodes.NumberCyclerNode()
cycler.x = 200
cycler.y = 50
cycler.inputs[0] = {type: 'node', node: battery}
cycler.inputs[1] = {type: 'value', value: 0}
cycler.inputs[2] = {type: 'value', value: 1}
cycler.inputs[3] = {type: 'value', value: 0.5}
app.nodes.push(cycler)

const greaterThanHalf = new App.nodes.ComparisonNode()
greaterThanHalf.x = 300
greaterThanHalf.y = 50
greaterThanHalf.inputs[0] = {type: 'value', value: '>'}
greaterThanHalf.inputs[1] = {type: 'node', node: cycler}
greaterThanHalf.inputs[2] = {type: 'value', value: 0.5}
app.nodes.push(greaterThanHalf)

const convertToPulse = new App.nodes.PulsifierNode()
convertToPulse.x = 400
convertToPulse.y = 50
convertToPulse.inputs[0] = {type: 'node', node: greaterThanHalf}
app.nodes.push(convertToPulse)

const echoer = new App.nodes.LoggerNode()
echoer.x = 500
echoer.y = 100
echoer.inputs[0] = {type: 'node', node: convertToPulse}
echoer.inputs[1] = {type: 'node', node: textNode}
app.nodes.push(echoer)

app.appendElementsTo(document.body)
app.deselect()

const fakePalette = document.createElement('div')
fakePalette.id = 'fake-palette'
Object.assign(fakePalette.style, {
  position: 'fixed',
  top: '30px',
  left: '30px'
})
document.body.appendChild(fakePalette)

const addPaletteButton = (name, nodeClass) => {
  const btn = document.createElement('button')
  btn.appendChild(document.createTextNode(name))
  btn.addEventListener('click', () => {
    const node = Reflect.construct(nodeClass, [])
    node.x = app.scrollX + 50 + Math.random() * 80
    node.y = app.scrollY + 50 + Math.random() * 80
    app.nodes.push(node)
  })
  fakePalette.appendChild(btn)
}

addPaletteButton('Battery', App.nodes.BatteryNode)
addPaletteButton('Pulsifier', App.nodes.PulsifierNode)
addPaletteButton('Memory', App.nodes.MemoryNode)
addPaletteButton('Logger', App.nodes.LoggerNode)
addPaletteButton('Calculator', App.nodes.CalculatorNode)
addPaletteButton('Comparison', App.nodes.ComparisonNode)
addPaletteButton('Conditional Picker', App.nodes.ConditionalPickerNode)
addPaletteButton('Number Cycler', App.nodes.NumberCyclerNode)
addPaletteButton('Random Word Generator', App.nodes.RandomWordGeneratorNode)

const drawLoop = function() {
  app.fillParent()
  app.draw()
  requestAnimationFrame(drawLoop)
}

drawLoop()

const executeLoop = function() {
  app.execute()
  setTimeout(executeLoop, 20)
}

executeLoop()

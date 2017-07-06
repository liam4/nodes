const app = new App()

const battery = new App.nodes.BatteryNode()
battery.x = 100
battery.y = 100
app.nodes.push(battery)

const textNode = new App.nodes.RandomWordGeneratorNode()
textNode.x = 200
textNode.y = 150
textNode.words = ['Apple', 'Banana', 'Chair', 'Rainbow', 'Unicorn']
textNode.inputs[0] = {type: 'node', node: battery}
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
greaterThanHalf.inputs[0] = {type: 'node', node: battery}
greaterThanHalf.inputs[1] = {type: 'value', value: '>'}
greaterThanHalf.inputs[2] = {type: 'node', node: cycler}
greaterThanHalf.inputs[3] = {type: 'value', value: 0.5}
app.nodes.push(greaterThanHalf)

const convertToPulse = new App.nodes.PulsifierNode()
convertToPulse.x = 400
convertToPulse.y = 50
convertToPulse.inputs[0] = {type: 'node', node: greaterThanHalf}
app.nodes.push(convertToPulse)

const echoer = new App.nodes.EchoerNode()
echoer.x = 500
echoer.y = 100
echoer.inputs[0] = {type: 'node', node: convertToPulse}
echoer.inputs[1] = {type: 'node', node: textNode}
app.nodes.push(echoer)

app.deselect()

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

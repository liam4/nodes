// TODO: Wave generator
// TODO: Comparison operators!!

const COLOR_CONTROL = [200, 131, 48]
const COLOR_OUTPUT = [138, 35, 215]
const COLOR_OPERATORS = [92, 138, 18]

App.nodes = {
  BatteryNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Battery',
        description: 'Always outputs true',
        color: COLOR_CONTROL
      })

      this.inputs = [
        null // 0 - Activate (power)
      ]
    }

    execute() {
      this.output = true
    }
  },

  PulsifierNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Pulsifier',
        description: 'Converts an input to a pulse',
        color: COLOR_CONTROL
      })

      this.inputs = [
        null // 0 - Activate (power)
      ]
    }

    execute() {
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
  },

  EchoerNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Echoer',
        description: 'Echoes and stores its input',
        color: COLOR_OUTPUT
      })

      this.inputs = [
        null, // 0 - Activate (power)
        null  // 1 - Value
      ]
    }

    execute() {
      if (this.getInput(0)) {
        this.output = this.getInput(1)
        console.log(this.output)
      }
    }
  },

  NumberCyclerNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Number Cycler',
        description: 'Cycles a number in a range',
        color: COLOR_OPERATORS
      })

      this.inputs = [
        null, // 0 - Activate (power)
        null, // 1 - Low-limit value
        null, // 2 - High-limit value
        null  // 3 - Incrementor (per second)
      ]
    }

    execute() {
      if (this.getInput(0)) {
        if (!this.date) {
          this.date = Date.now()
        }

        const low = this.getInput(1)
        const high = this.getInput(2)
        const incrementor = this.getInput(3)

        const seconds = (Date.now() - this.date) / 1000
        const delta0 = (seconds * incrementor) % (high - low)
        this.output = low + delta0
      } else {
        this.date = null
        this.output = 0
      }
    }
  },

  ComparisonNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Comparison',
        description: 'Compares two numbers',
        color: COLOR_OPERATORS
      })

      this.inputs = [
        null, // 0 - Activate (power)
        null, // 1 - Comparison operator ('<', '>', '=')
        null, // 2 - First value
        null  // 3 - Second value
      ]
    }

    execute() {
      if (this.getInput(0)) {
        const operator = this.getInput(1)
        const value1 = this.getInput(2)
        const value2 = this.getInput(3)

        if (operator === '=') {
          this.output = value1 === value2
        } else if (operator === '<') {
          this.output = value1 < value2
        } else if (operator === '>') {
          this.output = value1 > value2
        }
      }
    }
  },

  RandomWordGeneratorNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Random Word Generator',
        description: 'Outputs a random word',
        color: COLOR_OPERATORS
      })

      this.inputs = [
        null // 0 - Activate (power)
      ]
    }

    execute() {
      if (this.getInput(0)) {
        const index = Math.floor(Math.random() * this.words.length)
        this.output = this.words[index]
      }
    }
  }
}

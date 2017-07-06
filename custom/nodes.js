// TODO: Wave generator. (Done!)
// TODO: Comparison operators!! (Done!)

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

      this.inputSchema = [
        {name: 'Activated?', type: 'boolean'}
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

  MemoryNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Memory',
        description: 'Remembers its input until overwritten',
        color: COLOR_CONTROL
      })

      this.inputSchema = [
        {name: 'Activated?', type: 'boolean'},
        {name: 'Value', type: 'string'}
      ]
    }

    execute() {
      if (this.getInput(0)) {
        this.output = this.getInput(1)
      }
    }
  },

  LoggerNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Logger',
        description: 'Prints its input',
        color: COLOR_OUTPUT
      })

      this.inputSchema = [
        {name: 'Activated?', type: 'boolean'},
        {name: 'Value', type: 'string'}
      ]
    }

    execute() {
      if (this.getInput(0)) {
        console.log(this.getInput(1))
      }
    }
  },

  CalculatorNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Calculator',
        description: 'Performs a math operation on two numbers',
        color: COLOR_OPERATORS
      })

      this.inputSchema = [
        {name: 'Operator', type: 'string', select: [
          '+', '-', '/', '*', '^', '%'
        ]},
        {name: 'First value', type: 'number'},
        {name: 'Second value', type: 'number'}
      ]
    }

    execute() {
      const operator = this.getInput(0)
      const a = parseFloat(this.getInput(1))
      const b = parseFloat(this.getInput(2))

      if (operator === '+') this.output = a + b
      else if (operator === '-') this.output = a - b
      else if (operator === '*') this.output = a * b
      else if (operator === '/') this.output = a / b
      else if (operator === '^') this.output = a ** b
      else if (operator === '%') this.output = a % b
      else this.output = 0
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

      this.inputSchema = [
        {name: 'Operator', type: 'string', select: ['<', '>', '=']},
        {name: 'First value', type: 'number'},
        {name: 'Second value', type: 'number'}
      ]
    }

    execute() {
      const operator = this.getInput(0)
      const value1 = this.getInput(1)
      const value2 = this.getInput(2)

      if (operator === '=') {
        this.output = value1 === value2
      } else if (operator === '<') {
        this.output = value1 < value2
      } else if (operator === '>') {
        this.output = value1 > value2
      }
    }
  },

  ConditionalPickerNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Conditional Picker',
        description: 'Picks one value or another based on a condition',
        color: COLOR_OPERATORS
      })

      this.inputSchema = [
        {name: 'Condition', type: 'boolean'},
        {name: 'True value', type: 'any'},
        {name: 'False value', type: 'any'}
      ]
    }

    execute() {
      if (this.getInput(0) === true) {
        this.output = this.getInput(1)
      } else {
        this.output = this.getInput(2)
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

      this.inputSchema = [
        {name: 'Activated?', type: 'boolean'},
        {name: 'Low limit', type: 'number'},
        {name: 'High limit', type: 'number'},
        {name: 'Rate (n/1s)', type: 'number'}
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

  RandomWordGeneratorNode: class extends App.Node {
    constructor() {
      super()

      Object.assign(this, {
        name: 'Random Word Generator',
        description: 'Outputs a random word',
        color: COLOR_OPERATORS
      })

      this.inputSchema = [
        {name: 'Activated?', type: 'boolean'},
        {name: 'Word list', type: 'string'}
      ]
    }

    execute() {
      if (this.getInput(0) && this.getInput(1)) {
        const words = this.getInput(1).split(',')

        const index = Math.floor(Math.random() * words.length)
        this.output = words[index]
      }
    }
  }
}

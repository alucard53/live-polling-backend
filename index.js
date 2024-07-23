import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import Express from 'express'

const app = Express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
  }
})

app.use(cors())

app.get('/', (_, res) => {
  res.json({ 'status': 'ok' })
})

let response = null
let question = null
let count = 0
const hasAnswered = new Map()

io.on('connection', (socket) => {
  console.log('new conn', socket.id)
  hasAnswered.set(socket.id, false)
  count++

  // If there is already a question being polled, and student was not there when 
  if (question !== null) {
    socket.emit('question', {
      prompt: question.prompt,
      options: question.options.map(option => option.value)
    })
  }

  // new question is added
  socket.on('newQuestion', q => {
    hasAnswered.delete(socket.id) // remove teacher id from map
    question = q

    // set initial response and student count
    count = io.engine.clientsCount - 1
    response = {
      prompt: q.prompt,
      options: q.options.map(option => ({ ...option, count: 0 }))
    }

    // send question to students
    io.emit('question', {
      prompt: q.prompt,
      time: q.time,
      options: q.options.map(option => option.value)
    })
  })

  // student submits answer
  socket.on('answer', (answer) => {
    hasAnswered.set(socket.id, true)

    if (!response || count <= 0) {
      console.log('expired/nonexistent question')
      return
    }

    count--
    if (answer !== null) {
      response.options[answer].count++
    }
    io.emit('poll', response)

    if (count === 0) {
      io.emit('allanswered')
      count = 0
      response = null
      question = null
    }
  })

  socket.on('disconnect', () => {
    // student disconnects before answering
    if (hasAnswered.has(socket.id) && !hasAnswered.get(socket.id)) {
      count--
    }
    hasAnswered.delete(socket.id)

    if (count === 0) {
      io.emit('allanswered')
      count = 0
      response = null
      question = null
    }
    console.log(`${socket.id} disconnected`)
  })
})

server.listen(3000, () => {
  console.log('Server started')
})

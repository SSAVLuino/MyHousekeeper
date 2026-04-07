import express from 'express'
import projects from './routes/projects'
import assets from './routes/assets'
import deadlines from './routes/deadlines'

const app = express()
app.use(express.json())

app.use('/projects', projects)
app.use('/assets', assets)
app.use('/deadlines', deadlines)

export default app

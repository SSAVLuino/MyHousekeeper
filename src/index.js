import express from 'express'
import assetsRoutes from './routes/assets.js'
import deadlinesRoutes from './routes/deadlines.js'

const app = express()
app.use(express.json())

app.use('/api/assets', assetsRoutes)
app.use('/api/deadlines', deadlinesRoutes)

export default app

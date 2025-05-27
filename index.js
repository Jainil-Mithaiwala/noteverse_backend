import dotenv1 from "dotenv"
import express from 'express'
import router from './Route.js'
import http from 'http'
import cors from 'cors'
import fileUpload from 'express-fileupload' 
import { Config } from "./config/Init.js"

if (!["uat", "production"].includes(process.env.NODE_ENV)) {
    dotenv1.config({ path: ".env" })
}

dotenv1.config()
const port = Config.port //PORT ON SERVER RUNS

const app = express()
const server = http.createServer(app)

app.use(fileUpload())
app.use(cors({ origin: true, exposedHeaders: ['key', 'token', 'unqkey'] }))
app.use(express.json({ limit: '50mb' }))
app.use("/", router)//API ROUTES

// if (process.env.CRONJOB_SERVER === "cronjobserver") {
//     console.log("SCHEDULE ON");
//     var Schedule = new _Schedule();
//     Schedule.RunSchedules();
// }
server.listen(port, '0.0.0.0', function () {
    console.log('Node app is running on port ' + port)
})

export { server }
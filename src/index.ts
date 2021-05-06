import http from "http"
import { CMD_FgCyan, CMD_Reset } from "./utilities/color_references"
import { Server } from "socket.io"
import onConnect from "./logic"

// Make sure that port is valid
if (isNaN(process.env.PORT as unknown as number)) {
	throw new Error(`[${process.env.PORT}] is not a valid port`)
}

const server = http.createServer()
const io = new Server(server)

io.sockets.on('connection', onConnect);

server.listen(process.env.PORT, () => {
	console.log(`${CMD_FgCyan}Server listening on port ${process.env.PORT}${CMD_Reset}`)
})
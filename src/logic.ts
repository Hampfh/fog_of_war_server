import { Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { 
	createRoom, 
	deleteConnection, 
	getConnection, 
	getConnectionCount, 
	getRooms, 
	joinRoom, 
	listLobbiesFormatted, 
	setConnection 
} from "./state";

export default function onConnect(socket: Socket<DefaultEventsMap, DefaultEventsMap>) {
	setConnection(socket.id)

	// Join the main lobby
	socket.join("main_lobby")

	console.log("New Connection! Total connections:", getConnectionCount())

	socket.on("list_rooms", async () => {
		socket.emit("list_rooms", listLobbiesFormatted())
	})

	socket.on("join_room", async roomCode => {
		const success = joinRoom(socket.id, roomCode)
		if (success) {
			try {
				await socket.join(roomCode)
				socket.emit("join_room_res", true)
				socket.leave("main_lobby")
			} catch {
				socket.emit("join_room_res", false)
				return
			}
		}
		socket.to(roomCode).emit("opponent_connect", "")
	})

	socket.on("create_room", async () => {
		const roomCode = createRoom(socket.id)
		if (roomCode.length <= 0)
			socket.emit("create_room_res", false)
		else {
			try {
				await socket.join(roomCode)
				socket.emit("create_room_res", roomCode)

				socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
				socket.leave("main_lobby")
			} catch {
				socket.emit("create_room_res", false)
			}
		}
	})

	socket.on("opponent", data => {
		const connection = getConnection(socket.id)
		if (connection?.activeLobby) {
			socket.to(connection.activeLobby).emit("opponent", data)
		}
		else
			socket.emit("opponent", false)
	})

	socket.on("disconnect", () => {
		const connection = getConnection(socket.id)
		if (connection && connection.activeLobby) {
			socket.to(connection.activeLobby).emit("opponent_disconnect")
		}
		// Remove connection and leave room
		const lobbyDeleted = deleteConnection(socket.id)
		if (lobbyDeleted) {
			socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
		}
		console.log("Client left! Total connections:", getConnectionCount())
	})

	socket.on("error", error => {
		console.warn(error)
	})
}
import { Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { 
	createRoom, 
	deleteConnection, 
	getConnection, 
	getConnectionCount, 
	getRooms, 
	joinRoom, 
	setConnection 
} from "./state";

export default function onConnect(socket: Socket<DefaultEventsMap, DefaultEventsMap>) {
	setConnection(socket.id)

	console.log("New Connection! Total connections:", getConnectionCount())

	socket.on("list_rooms", async (data) => {
		const rawRooms = getRooms()
		const rooms: { id: string, members: number }[] = []
		for (const [id, room] of rawRooms.entries()) {
			rooms.push({ id, members: room.members.length })
		}
		
		socket.emit("list_rooms_res", JSON.stringify(rooms))
	})

	socket.on("join_room", async roomCode => {
		const success = joinRoom(socket.id, roomCode)
		if (success) {
			try {
				await socket.join(roomCode)
				socket.emit("join_room_res", true)
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
		deleteConnection(socket.id)
		console.log("Client left! Total connections:", getConnectionCount())
	})

	socket.on("error", error => {
		console.warn(error)
	})
}
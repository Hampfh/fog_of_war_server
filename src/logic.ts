import { Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { 
	createRoom, 
	deleteConnection, 
	getConnection, 
	getConnectionCount, 
	getRooms, 
	getState, 
	joinRoom, 
	setConnection 
} from "./state";

export default function onConnect(socket: Socket<DefaultEventsMap, DefaultEventsMap>) {
	setConnection(socket.id)

	console.log("New Connection! Total connections:", getConnectionCount())

	socket.on("list_rooms", async () => {
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
			await socket.join(roomCode)
			socket.emit("join_room_res", true)
			return
		}
		socket.emit("join_room_res", false)
		socket.to(roomCode).emit("opponent_connect")
	})

	socket.on("create_room", async () => {
		const roomCode = createRoom(socket.id)
		if (roomCode.length <= 0)
			socket.emit("create_room_res", false)
		else {
			await socket.join(roomCode)
			socket.emit("create_room_res", roomCode)
		}
	})

	socket.on("opponent", data => {
		const connection = getConnection(socket.id)
		if (connection?.activeLobby) {
			socket.to(connection.activeLobby).emit(data)
		}
		else
			socket.emit("command_res", false)
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
}
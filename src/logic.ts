import { Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { 
	createRoom, 
	deleteConnection, 
	getConnection, 
	getConnectionCount, 
	getRooms, 
	joinRoom, 
	leaveCurrentRoom, 
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

		const connection = getConnection(socket.id)
		if (!connection) {
			socket.emit("create_room_res", false)
			return
		}

		// If the user is currently in a lobby
		// we delete that lobby before creating
		// another one
		const lobbyDeleted = leaveCurrentRoom(connection, socket.id)
		if (lobbyDeleted) {
			socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
		}

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
		// Remove the lobby from the list (since it's full)
		socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
		socket.to(roomCode).emit("opponent_connect", "")
	})

	socket.on("set_opponent_color", async color => {
		const connection = getConnection(socket.id)
		if (!connection || !connection.activeLobby) {
			return
		}
		socket.to(connection.activeLobby).emit("set_opponent_color", color)
	})

	socket.on("create_room", async () => {

		const connection = getConnection(socket.id)
		if (!connection) {
			socket.emit("create_room_res", false)
			return
		}

		// If the user is currently in a lobby
		// we delete that lobby before creating
		// another one
		const lobbyDeleted = leaveCurrentRoom(connection, socket.id)
		if (lobbyDeleted) {
			socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
		}

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

	socket.on("resign", async () => {
		const connection = getConnection(socket.id)
		if (!connection || !connection.activeLobby) {
			socket.emit("resign_res", false)
			return
		}

		socket.to(connection.activeLobby).emit("resign", "")
		socket.emit("resign_res", true)
	})

	socket.on("set_name", async (data: string) => {
		const connection = getConnection(socket.id)
		if (!connection || data.length < 1) {
			socket.emit("set_name_res", false)
			return
		}

		// Set name of user
		connection.name = data
	})

	socket.on("send_name", async () => {

		const connection = getConnection(socket.id)
		if (!connection) {
			socket.emit("get_opponent_name_res", false)
			return
		}

		const result = getOpponent()
		if (!result) {
			socket.emit("get_opponent_name_res", false)
			return
		}

		const { id } = result

		socket.to(id).emit("get_opponent_name", connection.name ?? "")
	})

	socket.on("get_opponent_name", async () => {
		
		const result = getOpponent()
		if (!result) {
			socket.emit("get_opponent_name_res", false)
			return
		}

		const { opponent } = result

		socket.emit("get_opponent_name", opponent.name ?? "")
	})

	socket.on("play_again", async () => {
		const connection = getConnection(socket.id)
		if (!connection || !connection.activeLobby) {
			socket.emit("play_again_res", false)
			return
		}
		
		socket.to(connection.activeLobby).emit("play_again", "")
		socket.emit("play_again_res", true)
	})

	socket.on("opponent_leave_lobby", async () => {
		const connection = getConnection(socket.id)
		if (!connection || !connection.activeLobby) {
			socket.emit("opponent_leave_lobby_res", false)
			return
		} 
		socket.to(connection.activeLobby).emit("opponent_leave_lobby", "")

		// Remove the player from the lobby
		const room = getRooms().get(connection.activeLobby)
		const roomCode = connection.activeLobby.slice()

		await socket.join("main_lobby")
		socket.leave(roomCode)

		if (!room) {
			socket.emit("opponent_leave_lobby_res", false)
			connection.activeLobby = undefined
			return
		}

		// If the user is the last in the room, remove the room
		if (room.members.length < 2) {
			console.log("DELETE LOBBY")
			getRooms().delete(roomCode)
			connection.activeLobby = undefined
			socket.emit("opponent_leave_lobby_res", true)
			socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
			return
		}

		// Remove the user from the lobby
		const index = room.members.findIndex(current => current === socket.id)
		if (index > -1) {
			room.members.splice(index, 1)
			console.log("User left room, new room: ", room)
		}
		socket.to(roomCode).emit("opponent_leave_lobby", true)
		socket.to("main_lobby").emit("list_rooms", listLobbiesFormatted())
	})

	socket.on("leave_lobby", async () => {
		// TODO
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

	function getOpponent() {
		const connection = getConnection(socket.id)
		if (!connection || !connection.activeLobby) {
			return
		}

		// Fetch room
		const rooms = getRooms()
		const room = rooms.get(connection.activeLobby)
		if (!room) {
			return
		}

		// Find the opponent
		const opponentId = room.members.find(current => current != socket.id)
		if (!opponentId) {
			return
		}

		// Fetch opponent connction
		const opponentConnection = getConnection(opponentId)
		if (!opponentConnection) {
			return
		}

		return { opponent: opponentConnection, id: opponentId }
	}
}
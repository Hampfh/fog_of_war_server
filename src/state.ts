import Crypto from "crypto"

type SocketId = string
type LobbyCode = string

export interface IConnection {
	name?: string
	activeLobby?: LobbyCode
}

interface ILobby {
	members: SocketId[]
}

interface IState {
	connections: Map<SocketId, IConnection>
	lobbies: Map<LobbyCode, ILobby>
}

const state: IState = {
	connections: new Map(),
	lobbies: new Map()
}

export function getState() {
	return state
}

export function getConnectionCount() {
	return state.connections.size
}

export function setConnection(socket: string, name?: string) {
	state.connections.set(socket, {
		name
	})
}

export function getConnection(socket: string) {
	return state.connections.get(socket)
}

export function deleteConnection(socketId: string): boolean {
	const connection = state.connections.get(socketId)
	if (!connection) {
		return false
	}

	const deletedLobby = leaveCurrentRoom(connection, socketId)
	state.connections.delete(socketId)
	return deletedLobby
}

export function leaveCurrentRoom(connection: IConnection, socketId: string): boolean {

	// Remove connection from lobby if in one
	if (connection.activeLobby) {
		const lobby = state.lobbies.get(connection.activeLobby)
		if (lobby && lobby.members.length > 1) {
			const memberIndex = lobby.members.findIndex(current => current === socketId)
			lobby.members.splice(memberIndex, 1)
			return false
		}
		// If the connection is last connection in the room
		// then remove the room
		else if (lobby) {
			state.lobbies.delete(connection.activeLobby)
			return true
		}
	}
	return false
}

export function createRoom(socketId: SocketId): string {
	const connection = getConnection(socketId)
	if (!connection) 
		return ""

	const roomCode = Crypto.randomBytes(2).toString("hex");

	// Add room to connection
	connection.activeLobby = roomCode
	// Add room
	state.lobbies.set(roomCode, {
		members: [socketId]
	})

	return roomCode
}

export function joinRoom(socketId: SocketId, roomCode: string): boolean {
	const lobby = state.lobbies.get(roomCode)
	if (!lobby)
		return false

	// Cannot have more than 2 members
	if (lobby.members.length > 1)
		return false

	const connection = state.connections.get(socketId)
	if (!connection) {
		console.warn("This should not happen, could not find connection")
		return false
	}

	// Add room to connection
	connection.activeLobby = roomCode

	// Add connection to lobby
	lobby.members.push(socketId)


	return true
}

export function getRooms() {
	return state.lobbies
}

export function listLobbiesFormatted() {
	// When a room is created we send the room to all listeners
	const rawRooms = getRooms()
	let rooms: string = ""
	for (const [id, room] of rawRooms.entries()) {
		if (room.members.length < 2) {
			rooms += `${id}:${room.members.length};`
		}
	}
	return rooms
}
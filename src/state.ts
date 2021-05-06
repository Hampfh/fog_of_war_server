import { v4 as uuid } from "uuid"

type SocketId = string
type LobbyCode = string

interface IConnection {
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

export function deleteConnection(socketId: string) {
	const connection = state.connections.get(socketId)
	const activeLobby = connection?.activeLobby

	// Remove connection from lobby if in one
	if (activeLobby) {
		const lobby = state.lobbies.get(activeLobby)
		if (lobby && lobby.members.length > 1) {
			const memberIndex = lobby.members.findIndex(current => current === socketId)
			lobby.members.splice(memberIndex, 1)
		}
		// If the connection is last connection in the room
		// then remove the room
		else if (lobby) {
			state.lobbies.delete(activeLobby)
		}
	}

	state.connections.delete(socketId)
}

export function createRoom(socketId: SocketId): string {
	const connection = getConnection(socketId)
	if (!connection) 
		return ""

	const roomCode = uuid()

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
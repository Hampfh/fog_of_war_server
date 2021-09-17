# Fog of war server
This application serves as the server for the fog of war client game created in rust. This server does NOT include any real game logic, all logic is performed on the client. The only job of the server is to forward information and keep track of active connections and rooms.
  
The client application can be found [here](https://github.com/einbergisak/Fog-of-War-Chess).

## Installation
1. First make sure you have nodejs installed on your system. 
2. In the root directiory create a file named `.env`. In this folder add a port argument and assign it a valid port number:
```
PORT=8080
```
3. Install dependencies
```
npm install
```
4. Build server (convert typescript to javascript)
```
npm build
```
5. Run the server
```
npm start
```

## Dependencies
* Socket.io
* Typescript
* Express.js
* dotenv.js
* uuid
* morgan

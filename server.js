var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var cors = require('cors')

app.use(cors())
var fs = require('fs');

app.get('/products/:id', function (req, res, next) {
	res.json({msg: 'This is CORS-enabled for all origins!'})
})
/////////////////////////////////////////////////////////

const {networkInterfaces} = require('os');

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
	for (const net of nets[name]) {
		// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
		if (net.family === 'IPv4' && !net.internal) {
			if (!results[name]) {
				results[name] = [];
			}
			results[name].push(net.address);
		}
	}
}
/////////////////////////////////////////////////////////

let userList = [];
let board = [];
let moderators = [];
let msgGroupList = {};
let votos = [];
let audiencia = {};
let boards = [];
io.on('connection', (socket) => {

	// The front end calls the sending message interface, and the back end receives and broadcasts
	socket.on('login', (userInfo) => {
		userList.push(userInfo);
		socket.join(userInfo.group);

		io.to(userInfo.group).emit('num', userList.length);
		io.to(userInfo.group).emit('msgGrSystemNotice', {
			serverIP: results['venet0:0'],
			sendId:   socket.id,
			groupId:  userInfo.group,
			msg:      {"chat": userInfo.userName + ' star in group!'},
			system:   true
		});
		if (userInfo.userName === 'Board') {
			boards[userInfo.sid] = socket.id;
		}
		if (userInfo.userName === 'Moderador') {
			boards[userInfo.sid] = socket.id;
		}
	})

	socket.on('sendMsg', (data) => {
		// console.log('sendMsg: '+JSON.stringify(data))
		data.serverIP = results['venet0:0']
		socket.to(data.id).emit('receiveMsg', data)
	})

	socket.on('sendMsgGroup', (data) => {
		//	console.log('Nome: '+data.userName+' Msg: '+ data.msg)
		data.serverIP = results['venet0:0']
		io.to(data.groupId).emit('num', userList.length);
		io.to(data.groupId).emit('receiveMsgGroup', data);
	})

	socket.on('sendPaxVoto', (data) => {
		data.serverIP = results['venet0:0']
		votos.push(data);

		io.to(data.groupId).emit('receiveVotoPax', data);
	})

	socket.on('sendData', (data) => {
		if (data.ids)
			data.ids.forEach(id => {
				data.serverIP = results['venet0:0']
				io.to(id).emit('auth', data);
				console.log('sendData: ' + id)
			});
	})

	// Create group msg
	socket.on('createMsgGroup', data => {
		socket.join(data.groupId);
		msgGroupList[data.groupId] = data;
	})

	// Join group msg
	socket.on('joinMsgGroup', data => {
		socket.join(data.info.groupId);
	})

	socket.on('leave', data => {
		socket.leave(data.groupId, () => {
			let member = msgGroupList[data.groupId].member;
			let i = -1;
			member.forEach((item, index) => {
				if (item.id === socket.id) {
					i = index;
				}
				io.to(item.id).emit('leaveMsgGroup', {
					serverIP: results['venet0:0'],
					id:       socket.id, // The id of the person who left the group msg
					groupId:  data.groupId,
					msg:      data.userName,
					system:   true
				})
			});
			if (i !== -1) {
				member.splice(i)
			}
		});
	})

	// Exit (built-in event)
	socket.on('disconnect', () => {
		msgGroupList = {};
		userList = userList.filter(item => item.id != socket.id)
		io.emit('quit', socket.id)
	})
})

http.listen(3000, () => {
	console.log('https://inviteweb-ws.jelastic.saveincloud.net/')
});

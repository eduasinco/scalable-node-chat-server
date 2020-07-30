const express = require('express');
const app = express();
const WebSocket = require('ws');
require('express-ws')(app);
const redis = require("redis");

const subscriber = redis.createClient({
  url: "redis://localhost:6379"
});
const publisher = subscriber.duplicate();
const PORT = 3000

const WS_CHAT_CHANNEL = "ws:chat";
let CHAT_ROOMS = {};

app.ws('/chat/:id', function(ws, req) {
  if (!(req.params.id in CHAT_ROOMS)) {
    CHAT_ROOMS[req.params.id] = new Set();
  }
  CHAT_ROOMS[req.params.id].add(ws)
  ws.onmessage = (msg) => {
    publisher.publish(WS_CHAT_CHANNEL, JSON.stringify({id: req.params.id, message: msg.data}));
  };
  ws.onclose = () => {
    if (CHAT_ROOMS[req.params.id].has(ws)) {
      CHAT_ROOMS[req.params.id].delete(ws)
    }
  }
  ws.onerror = (err) => {
    console.log(err.message)
  };
});
subscriber.on("message", (channel, data) => {
  if (channel === WS_CHAT_CHANNEL) {
    const data_json = JSON.parse(data)
    if (data_json.id in CHAT_ROOMS) {
      for (let client of CHAT_ROOMS[data_json.id]) {
        client.send(JSON.stringify(data_json.message));
      }
    }
  }
});
subscriber.subscribe(WS_CHAT_CHANNEL);



const WS_NOT_CHANNEL = "ws:notifications";
let NOT_ROOMS = {};

app.ws('/notifications/:id', function(ws, req) {
  if (!(req.params.id in NOT_ROOMS)) {
    NOT_ROOMS[req.params.id] = new Set();
  }
  NOT_ROOMS[req.params.id].add(ws)
  ws.onmessage = (msg) => {
    publisher.publish(WS_NOT_CHANNEL, JSON.stringify({id: req.params.id, message: msg.data}));
  };
  ws.onclose = () => {
    if (NOT_ROOMS[req.params.id].has(ws)) {
      NOT_ROOMS[req.params.id].delete(ws)
    }
  }
  ws.onerror = (err) => {
    console.log(err.message)
  };
});
subscriber.on("message", (channel, data) => {
  if (channel === WS_NOT_CHANNEL) {
    const data_json = JSON.parse(data)
    if (data_json.id in NOT_ROOMS) {
      for (let client of NOT_ROOMS[data_json.id]) {
        client.send(JSON.stringify(data_json.message));
      }
    }
  }
});
subscriber.subscribe(WS_NOT_CHANNEL);

// app.get('/:where/:id/:message', function(req, res, next){
//     const ws = new WebSocket("ws://127.0.0.1:" + PORT + "/" + req.params.where + "/" + req.params.id + "/");
//     const message = req.params.message
//     ws.onopen = () => {
//         ws.send(JSON.stringify({message: message}))
//     }
//
//     res.send("OK");
// });

app.listen(PORT);

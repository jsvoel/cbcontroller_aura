'use strict';

let clients = [];
let roscbpublisher = null;

const rosnodejs = require('rosnodejs');
const std_msgs = rosnodejs.require('std_msgs').msg;

let rosnamespace = '/speech/'

function connectToRos(nodehandle, namespace){
  let sub = nodehandle.subscribe(namespace + 'chatbotcontroller_out', std_msgs.String, (data) => {
    rosnodejs.log.info("OUT: " + data.data);
    clients.forEach((ws, index) => {
      ws.send(data.data);
    })
  });
  roscbpublisher = nodehandle.advertise(namespace + 'chatbotcontroller_in', std_msgs.String);
  console.log("Connected to ROS :D")
}

rosnodejs.initNode('ChatbotController').then((rosnode) => {
  rosnode.getParam('chatbotcontrollernamespace').then(
    function (namespace) {
      connectToRos(rosnode, namespace);
    },
    function (notavail) {
      console.log("namespace not set as ros parameter 'chatbotcontrollernamespace', using default '/'");
      connectToRos(rosnode, '/');
    }
  );
});

module.exports.ws_handler = function (ws, req) {
    // put websocket on active client list
  rosnodejs.log.info("Client connected");
  clients.push(ws);
  ws.on('message', function (msg) {
      // setup actions to take when a message is received
      rosnodejs.log.info("IN: " + msg);
      let rosmsg = new std_msgs.String();
      rosmsg.data = msg;
      if(roscbpublisher !== null){
        roscbpublisher.publish(rosmsg);
      }
  });
  ws.on('close', function (msg) {
      // remove websocket from active client list
      rosnodejs.log.info("Client disconnected");
      clients = clients.filter(item => item !== ws);
  });
}

let os = require('os');
let ifaces = os.networkInterfaces();
let internalip = null;

Object.keys(ifaces).forEach(function (ifname) {
  let alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (internalip === null){
      internalip = iface.address;
    }
    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }
    ++alias;
  });
});

module.exports.serverip = internalip;

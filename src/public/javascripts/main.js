let robot_websocket = null;
let robot_websocket_connected = false;
let robot_websocket_button = null;
let robot_websocket_state = null;
let robot_chatbot_state = null;

class SwitchButton {
    constructor(click_class) {
        this.last = null;
        this.default_class = "";
        this.click_class = click_class;
    }

    switch(new_id) {
        if (this.last !== null) {
            this.last.className = this.default_class;
        }
        this.last = document.getElementById(new_id);
        this.default_class = this.last.className;
        this.last.className = this.click_class;
    }

    get text() {
        let tx = this.last.lastChild.innerHTML;
        if(tx){
          return tx;
        }

        return this.last.innerHTML;
    }
}

class ChatbotState {
    constructor() {
        this.state_display = document.getElementById("chatbot_state");
        this.sttper = document.getElementById("chatbot_stt_percent");
        this.stttext = document.getElementById("chatbot_stt_text");
        this.answer_box = document.getElementById("chatbot_answers_box");
        this.navigation_box = document.getElementById("chatbot_navigation_box");
        this.last_answer = new SwitchButton('clickedanswer');
        this.last_navi = new SwitchButton('clickednavigation');
        this.micstate = document.getElementById('microphone_state');
        this.micbutton = document.getElementById('microphone_button');
    }

    processRosMsg(msg) {
        msg = JSON.parse(msg);
        switch (msg.type) {
            case "state":
                // display current state of chatbot controller node in ROS
                this.state_display.innerHTML = msg.text;
                break;
            case "stt":
                // show reception of speech
                this.sttper.innerHTML = msg.confidence.toFixed(2) * 100 + "%";
                this.stttext.innerHTML = msg.text;
                break;
            case "answers":
                // clear current answer list
                while (this.answer_box.firstChild) {
                    this.answer_box.removeChild(this.answer_box.lastChild);
                }
                // build new answer list
                let answer_box = this.answer_box;
                msg.answers.forEach(function (item, index) {
                    let ansid = "answer_" + index;
                    let divans = document.createElement('div');
                    divans.setAttribute('id', ansid + '_content');
                    divans.appendChild(document.createTextNode(item.text))
                    let divconf = document.createElement('div');
                    divconf.appendChild(document.createTextNode(item.confidence.toFixed(2) * 100 + "%"));
                    let divnode = document.createElement("div");
                    divnode.setAttribute("id", ansid);
                    divnode.setAttribute("class", "answer");
                    divnode.setAttribute("onclick", "robot_chatbot_state.onAnswerClick(this.id)");
                    divnode.appendChild(divconf);
                    divnode.appendChild(divans);
                    answer_box.appendChild(divnode);
                    answer_box.appendChild(document.createElement("br"));
                });
                answer_box.removeChild(answer_box.lastChild); // remove trailing BR
                break;
            case "navigation":
                // build navigation list
                break;
            case "toggle":
                if (msg.what == "microphone") {
                    this.micstate.innerHTML = msg.text;
                    if(msg.text == 'Enabled') {
                      this.micbutton.className = "col-2 microphonestateon"
                    }
                    else {
                      this.micbutton.className = "col-2 microphonestateoff"
                    }
                }
        }
    }

    onAnswerClick(answer_id) {
        this.last_answer.switch(answer_id);
        let msg = {
            'type': 'click_answer',
            'text': this.last_answer.text
        };
        roboWebsockSend(JSON.stringify(msg));
    }

    onNaviClick(navi_id) {
        this.last_navi.switch(navi_id);
        let msg = {
            'type': 'click_navigation',
            'text': this.last_navi.text
        };
        roboWebsockSend(JSON.stringify(msg));
    }

    onToggleMic() {
        let msg = {
            'type': 'toggle',
            'what': 'microphone'
        };
        roboWebsockSend(JSON.stringify(msg));
    }
}

function main_startup() {
    console.log("i hate webdev");
    robot_chatbot_state = new ChatbotState();
    connect_robot('button_connect', 'serverip', 'ws_state');
}

function connect_robot(id_connect_button, id_input_ip, id_ws_state) {
    if (!robot_websocket_connected) {
        robot_websocket_button = document.getElementById(id_connect_button);
        robot_websocket_state = document.getElementById(id_ws_state);
        let input_robot_ip = document.getElementById(id_input_ip);
        if (!input_robot_ip.value.match(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
            alert("You have entered an invalid IP address!");
            return;
        }
        let connectionip = "ws://" + input_robot_ip.value + ":3000/ros";
        //var connectionip = "wss://echo.websocket.org";
        console.log(connectionip);
        robot_websocket = new WebSocket(connectionip);
        robot_websocket.onopen = function (evt) {
            console.log("Robowebsocket connected!");
            robot_websocket_connected = true;
            robot_websocket_button.className = "col-2 connectedwebsock";
            robot_websocket_state.innerHTML = "Connected";
        };
        robot_websocket.onclose = function (evt) {
            console.log("Robowebsocket disconnected! Event: " + evt.code);
            robot_websocket_connected = false;
            robot_websocket = null;
            robot_websocket_button.className = "col-2 disconnectedwebsock";
            if (evt.code == 1006) {
                robot_websocket_state.innerHTML = "Close with error";
            } else {
                robot_websocket_state.innerHTML = "Disconnected";
            }
        };
        robot_websocket.onmessage = roboWebsockRecv;
        robot_websocket.onerror = function (evt) {
            console.log("Websocket Error: " + evt);
        };
    }
    else {
        if (robot_websocket !== null) {
            robot_websocket.close();
            robot_websocket = null;
        }
    }
}

function roboWebsockRecv(evt) {
    console.log("RECV: " + evt.data);
    robot_chatbot_state.processRosMsg(evt.data);
}

function roboWebsockSend(msg) {
    if (robot_websocket_connected) {
        console.log("SENT: " + msg);
        robot_websocket.send(msg);
    }
}

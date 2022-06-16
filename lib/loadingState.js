
const WebSocket = require('ws');

const { loading_state } = require('./enums.js');

class LoadingState {

    constructor(){
        this.state = loading_state.INITIALIZE;
        this.active = true;

        this.wss = new WebSocket.Server({ noServer: true });

        // Send current state (if connected after state change)
        this.wss.on( 'connection', ws => { this.sendState(ws); } );
    }

    setState( state ){
        this.state = state;
        this.wss.clients.forEach( client => { // Update all clients connected
            if( client.readyState === WebSocket.OPEN ){ this.sendState(client); }
        });
    }

    // Upgrade client conenction to WS
    handleUpgrade( req, socket, head ){
        this.wss.handleUpgrade( req, socket, head, ws => {
            this.wss.emit( 'connection', ws, req );
        });
    }

    sendState( ws ){
        ws.send(JSON.stringify({ state: this.state }));
    }

    close(){
        this.active = false;
        this.wss.close();
    }
}

module.exports = LoadingState;

const Container = ( process.env.NODE_ENV != 'production' ) ? require('./containers/exec.js') : require('./containers/tmux.js');

const { loading_state } = require('../enums.js');

class NodeJSWeb {

    constructor( project ){
        this.project = project;
        this.container = undefined;
    }

    middleware( req, res, next ){
        this.project.proxy( ...arguments );
    }

    async start(){
        // Setup
        await this.project.openPort();
        this.project.createProxy();

        // Install
        this.container = new Container( this.project.dir, this.project.port );
        await this.container.run( 'npm i' );

        // Run
        this.project.loading.setState( loading_state.STARTUP );
        this.container.run( this.project.environment.start || 'npm run start' );

        // Wait for project to start
        await this.project.waitPort();
    }

    async shutdown(){
        await this.container.kill();
    }
}

module.exports = NodeJSWeb;
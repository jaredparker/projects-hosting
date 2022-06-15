
const Container = ( process.env.NODE_ENV != 'production' ) ? require('./containers/exec.js') : require('./containers/tmux.js');

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

        // Run
        this.container = new Container( this.project.dir, this.project.port );
        await this.container.run( 'npm i' );
        this.container.run( `npm run start` );

        // Wait for project to start
        await this.project.waitPort();
    }

    async shutdown(){
        await this.container.kill();
    }
}

module.exports = NodeJSWeb;
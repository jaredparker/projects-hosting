
const getPort = require('get-port');
const waitPort = require('wait-port');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { project_state } = require('./enums.js');
const storages = require('./storages/index.js');
const environments = require('./environments/index.js');

class Project {

    constructor({ src, environment }){

        // Details
        this.src = src;
        this.environment = environment;

        // Runtime
        this.state = project_state.IDLE;
        this.dir   = ''; // Working directory
        this.env   = undefined;
        this.port  = undefined;
        this.proxy = undefined;

    }

    middleware( req, res, next ){
        this.env.middleware( ...arguments );
    }

    async start(){

        // Wait till app at a state where it can be started again
        if( this.state == project_state.SHUTDOWN ){
            await new Promise(( resolve, reject ) => {
                const check = setInterval( _ => {
                    if( this.state != project_state.SHUTDOWN ){
                        clearInterval(check);
                        resolve();
                    }
                }, 200 );
            });
        };

        // Don't run app if already being ran
        if( this.state == project_state.STARTUP ) return false;
        if( this.state == project_state.RUNNING ) return true;

        this.state = project_state.STARTUP;

        // Download files
        if( !this.dir ){
            this.dir = await storages[this.src.host].fetch( this.src.loc );
        }

        // Create & Start environment
        this.env = new environments[this.environment.name]( this );
        await this.env.start();

        this.state = project_state.RUNNING;
        return true;
    }

    async shutdown(){
        this.state = project_state.SHUTDOWN;

        // Close environment
        await this.env.shutdown();

        // Reset
        this.env   = undefined;
        this.port  = undefined;
        this.proxy = undefined;

        this.state = project_state.IDLE;
    }

    async clearCache(){
        if( this.state == project_state.RUNNING ) throw new Error('Cannot clear cache while the project is running.');

        this.state = project_state.SHUTDOWN;

        // Clear working files
        await storages[this.src.host].clear( this.src.loc );

        // Reset
        this.dir = '';
        
        this.state = project_state.IDLE;
    }

    // Helper functions

    async openPort(){
        const port = await getPort({port: getPort.makeRange(3000, 3999)});
        this.port = port;
        return port;
    }

    async waitPort(){
        return await waitPort({ port: this.port, output: 'silent' });
    }

    createProxy(){
        const proxy = createProxyMiddleware(
            `/`,
            {
                target:`http://localhost:${this.port}`,
                ws: true,
                changeOrigin: true,
                logLevel: 'error'
            }
        );
        this.proxy = proxy;
        return proxy;
    }
}

module.exports = Project;

const getPort = require('get-port');
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
        this.port  = 0;
        this.proxy = undefined;

    }

    middleware( req, res, next ){
        this.env.middleware( ...arguments );
    }

    async start(){
        this.state = project_state.STARTUP;

        // Download files
        this.dir = await storages[this.src.host].fetch( this.src.loc );

        // Create & Start environment
        this.env = new environments[this.environment.name]( this );
        await this.env.start();

        this.state = project_state.RUNNING;
    }

    // Helper functions

    async openPort(){
        const port = await getPort({port: getPort.makeRange(3000, 3999)});
        this.port = port;
        return port;
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
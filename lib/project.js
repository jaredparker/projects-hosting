
const getPort = require('get-port');
const waitPort = require('wait-port');
const { createProxyMiddleware } = require('http-proxy-middleware');

const LoadingState = require('./loadingState.js');

const { project_state, loading_state } = require('./enums.js');
const storages = require('./storages/index.js');
const environments = require('./environments/index.js');

class Project {

    constructor({ src, environment }){

        // Details
        this.src = src;
        this.environment = environment;

        // Startup
        this.loading = undefined;

        // Runtime
        this.instanceID = new Date().getTime();
        this.state = project_state.IDLE;
        this.dir   = undefined; // Working directory
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
            await this.waitStateEnd( project_state.SHUTDOWN );
        };

        // Don't run app if already being ran
        if( this.state == project_state.STARTUP ) return false;
        if( this.state == project_state.RUNNING ) return true;

        this.state = project_state.STARTUP;
        this.loading = new LoadingState();

        // Download files
        if( !this.dir ){
            // ~ error for if storage type doesn't exist
            this.dir = await storages[this.src.host].fetch( this.src.loc, this.instanceID );
        }

        // Create & Start environment
        // ~ error for if environment type doesn't exist
        this.env = new environments[this.environment.kind]( this );
        await this.env.start();

        this.state = project_state.RUNNING;
        this.loading.setState( loading_state.READY );
        this.loading.close();
        this.loading = undefined;
        return true;
    }

    async shutdown(){
        if( this.state == project_state.SHUTDOWN ) return false;
        if( this.state == project_state.IDLE     ) return true;

        this.state = project_state.SHUTDOWN;

        // Close environment
        await this.env.shutdown();

        // Reset
        this.env   = undefined;
        this.port  = undefined;
        this.proxy = undefined;

        this.state = project_state.IDLE;

        return true;
    }

    async clearCache(){

        // Wait till app at a state where it can be cleared
        if( this.state == project_state.SHUTDOWN ){
            await this.waitStateEnd( project_state.SHUTDOWN );
        }

        // Don't clear app if already cleared or data in use
        if( this.dir   == undefined ) return true;
        if( this.state != project_state.IDLE ) return false;

        this.state = project_state.CLEARING;

        // Reset
        this.dir = undefined;

        // Clear working files
        await storages[this.src.host].clear( this.src.loc, this.instanceID );
        
        this.state = project_state.IDLE;

        return true;
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

    waitStateEnd( state=project_state.SHUTDOWN ){
        return new Promise(( resolve, reject ) => {
            const check = setInterval( _ => {
                if( this.state != state ){
                    clearInterval(check);
                    resolve();
                }
            }, 100 );
        });
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

const Queue = require('queue');
const getPort = require('get-port');
const waitPort = require('wait-port');
const { createProxyMiddleware } = require('http-proxy-middleware');

const LoadingState = require('./loadingState.js');

const { project_state, loading_state } = require('./enums.js');
const storages = require('./storages/index.js');
const environments = require('./environments/index.js');

class Project {

    constructor({ id, src, environment, timeouts, password }){

        // Details
        this.id = id;
        this.src = src;
        this.environment = environment;
        this.timeouts = timeouts;
        this.password = password;

        // Management
        this.loading = undefined;
        this.shutdownTimeout = undefined;
        this.clearCacheTimeout = undefined;
        this.activeConnections = 0;

        // Runtime
        this.instanceID = new Date().getTime();
        this.state = project_state.IDLE;
        this.dir   = undefined; // Working directory
        this.env   = undefined;
        this.port  = undefined;
        this.proxy = undefined;

        this.queue = new Queue({ concurrency: 1, autostart: true });
    }

    addJob( job ){
        return new Promise(( resolve, reject ) => {
            this.queue.push( async cb => {
                const result = await job();
                cb(); resolve( result );
            });
        });
    }

    // Handle project requests

    upgrade( req, socket, head ){
        if( this.env.upgrade ){
            this.env.upgrade( ...arguments );
        }
    }

    middleware( req, res, next ){
        if( this.activeConnections <= 0 ){
            this.setShutdownTimeout();
        }

        this.env.middleware( ...arguments );
    }

    // Project actions (lauching/shutdown/clear)

    async start(){
        return this.addJob( async _ => {

            // Don't run app if already running
            if( this.state == project_state.RUNNING ) return;

            this.state = project_state.STARTUP;
            this.loading = new LoadingState();
            clearTimeout( this.clearCacheTimeout );

            // Download files
            if( !this.dir ){
                // ~ error for if storage type doesn't exist
                this.dir = await storages[this.src.host].fetch( this.src.loc, this.instanceID );
            }

            // Create & Start environment
            // ~ error for if environment type doesn't exist
            this.env = new environments[this.environment.kind]( this );
            await this.env.start();

            this.setShutdownTimeout();

            this.state = project_state.RUNNING;
            this.loading.setState( loading_state.READY );
            this.loading.close();
            this.loading = undefined;
        });
    }

    async shutdown(){
        return this.addJob( async _ => {

            // Don't run shutdown if already shutdown
            if( this.state == project_state.IDLE     ) return;

            this.state = project_state.SHUTDOWN;

            // Close environment
            await this.env.shutdown();

            // Reset
            this.env   = undefined;
            this.port  = undefined;
            this.proxy = undefined;

            this.state = project_state.IDLE;
        });
    }

    async clearCache(){
        return this.addJob( async _ => {

            // Don't clear app if already cleared or data in use
            if( this.dir   == undefined ) return;
            if( this.state != project_state.IDLE ) return;

            this.state = project_state.CLEARING;

            // Reset
            this.dir = undefined;

            // Clear working files
            await storages[this.src.host].clear( this.src.loc, this.instanceID );
            
            this.state = project_state.IDLE;
        });
    }

    setShutdownTimeout( delay=this.timeouts.shutdown ){
        clearTimeout( this.shutdownTimeout );
        this.shutdownTimeout = setTimeout( _ => { this.shutdown(); this.setClearCacheTimeout() }, delay );
    }

    setClearCacheTimeout( delay=this.timeouts.cache ){
        this.clearCacheTimeout = setTimeout( _ => { this.clearCache(); }, delay );
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

        const onOpen = _ => {
            this.activeConnections ++;

            clearTimeout( this.shutdownTimeout );
        }

        const onClose = _ => {
            this.activeConnections --;

            if( this.activeConnections <= 0 ){
                this.setShutdownTimeout();
            }
        }

        const proxy = createProxyMiddleware(
            `/`,
            {
                target:`http://localhost:${this.port}`,
                changeOrigin: true,
                ws: false,
                logLevel: 'error',
                onOpen, onClose
            }
        );
        this.proxy = proxy;
        return proxy;
    }
}

module.exports = Project;
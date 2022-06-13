
const { project_state } = require('./enums.js');
const storage = require('./storages/index.js');

class Project {

    constructor({ src }){

        // Details
        this.src = src;

        // Runtime
        this.state = project_state.IDLE;
        this.dir  = ''; // Working directory

    }

    middleware( req, res, next ){
        res.sendFile(req.originalUrl, {root: this.dir});
    }

    async start(){
        this.state = project_state.STARTUP;

        // Download files
        this.dir = await storage[this.src.host].fetch( this.src.loc ); // dir = downloaded location

        // test
        setTimeout(() => {
           this.state = project_state.IDLE;
           storage[this.src.host].clear( this.src.loc );
        }, 5000)

        console.log(this.dir);

        this.state = project_state.RUNNING;
    }
}

module.exports = Project;

const { project_state } = require('./enums.js');

class Project {

    constructor({ src }){

        // Details
        this.src = src;

        // Runtime
        this.state = project_state.IDLE;

    }

    middleware( req, res, next ){

    }

    async start(){

        // Download files

    }
}

module.exports = Project;
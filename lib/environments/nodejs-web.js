
class NodeJSWeb {

    constructor( project ){
        this.project = project;
    }

    middleware( req, res, next ){
        this.project.proxy( ...arguments );
    }

    async start(){
        await this.project.openPort();
        this.project.createProxy();
        console.log(this.project.port);
    }

    async shutdown(){
        
    }
}

module.exports = NodeJSWeb;
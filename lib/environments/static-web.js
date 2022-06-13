
class StaticWeb {

    constructor( project ){
        this.project = project;
    }

    middleware( req, res, next ){
        res.sendFile(req.originalUrl, {root: this.project.dir});
    }

    async start(){}
}

module.exports = StaticWeb;
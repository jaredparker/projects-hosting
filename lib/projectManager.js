
const Project = require('./project.js');

const db = require('projects-db');
const models = db.models;

const { project_state } = require('./enums.js');

class ProjectManager {

    constructor({  }){
        this.projects = {};
        this.loadProjects();

        this.loaded = false;
    }

    async loadProjects(){
        const projects = await models.Project.find({});

        for( let projectData of projects ){
            this.projects[projectData.id] = new Project( projectData );
        }
        
        this.loaded = true;
        // ~ Create stream to keep data updated
    }

    middleware(){

        const self = this;
        
        return async function( req, res, next ){

            // Await till all project data loaded
            if( !self.loaded ){
                await new Promise(( resolve, reject ) => {
                    const check = setInterval( _ => {
                        console.log(self.loaded);
                        if( self.loaded ){
                            clearInterval(check);
                            resolve();
                        }
                    }, 1000 );
                });
            }

            if( req.subdomains?.length <= 0 ) return;
            const projectID = req.subdomains[0];
            const project   = self.projects[projectID];
            
            // Check requested app exists
            if( !project ) return res.send(`Sorry, but '${projectID}' doesn't exist!`); // ~ add error view

            // Check if app running
            if( project.state == project_state.RUNNING ){
                return project.middleware( ...arguments );
            }

            // Launch app if not starting up
            if( project.state == project_state.IDLE ){
                project.start();
            }

            // Loading screen for user
            setTimeout( _ => {

                // Project loaded quickly, send directly to app
                if( project.state == project_state.RUNNING ){
                    return project.middleware( ...arguments );
                }

                // Show loading progress
                return res.send('Loading...');
                //res.sendFile( path.join(__dirname, '../views/loading.html') );

            }, 500 ); // ~ to be even faster: show project as soon as it loads
        }
    }
}

module.exports = ProjectManager;
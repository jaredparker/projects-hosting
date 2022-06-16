
const path = require( 'path' );

const Project = require('./project.js');

const db = require('projects-db');
const models = db.models;

const { project_state } = require('./enums.js');

class ProjectManager {

    constructor(){
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

    handleUpgrade(){
        const self = this;

        // Socket connections for loading state
        return async function( req, socket, head ){
            if( req.url != '/__loading_state__' ){
                socket.destroy();
                return;
            };

            // Get project
            const subdomains = req.headers.host.split('.').reverse().slice(2);
            if( subdomains.length <= 0 ) return;
            const projectID = subdomains[0];
            const project   = self.projects[projectID];

            if( project.loading ){
                project.loading.handleUpgrade( ...arguments );
            }
        };
    }

    middleware(){
        const self = this;
        
        return async function( req, res, next ){

            // Await till all project data loaded
            if( !self.loaded ){
                await new Promise(( resolve, reject ) => {
                    const check = setInterval( _ => {
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

            // Attempt to launch app (validation built into .start())
            project.start()
            
            // Quick load (bypass project loading view)
            .then( loaded => {

                if( loaded && quickLoadTimeout ){
                    clearTimeout( quickLoadTimeout ); // stop response being handled by loading view
                    return project.middleware( ...arguments );
                }

            });
            
            // Render project loading view (no quick load)
            let quickLoadTimeout = setTimeout( _ => {
                quickLoadTimeout = undefined; // stop response being handled by quick load

                // Show loading progress
                return res.sendFile(path.join( __dirname, '../views/loading.html' ));

            }, 500 ); // ~ quick load timeout might need adjusting
        }
    }
}

module.exports = ProjectManager;
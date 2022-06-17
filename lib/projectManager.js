
const path = require('path');
const jwt  = require('jsonwebtoken');

const Project = require('./project.js');

const db = require('projects-db');
const models = db.models;

const { project_state } = require('./enums.js');

class ProjectManager {

    constructor(){
        this.projectIDs = {};
        this.projects = {};
        this.loadProjects();

        this.loaded = false;
    }

    async loadProjects(){
        const projects = await models.Project.find({});

        for( let projectData of projects ){
            this.projects[projectData.id] = new Project( projectData );
            this.projectIDs[projectData._id] = projectData.id;
        }
        this.loaded = true;

        // Watch stream to keep data updated
        models.Project.watch().on( 'change', async data => {

            let projectData;

            switch( data.operationType ){

                // Change project details
                case 'update':

                    projectData = await models.Project.findOne( data.documentKey );
                    const newProject = new Project( projectData ); // easier to create new instance
                    const oldProject = this.projects[newProject.id];

                    // Safe to update project (project not running)
                    if( oldProject.state == project_state.IDLE ){
                        this.projects[oldProject.id] = newProject;

                        oldProject.clearCache();

                        break;
                    }

                    // Project was running before, so startup again before switching
                    await newProject.start(); // ! will resolve promise if project during start up (automatic from project creation)
                    this.projects[oldProject.id] = newProject;

                    await oldProject.shutdown();
                    oldProject.clearCache();

                    break;

                // Add new project
                case 'insert':

                    projectData = data.fullDocument;
                    this.projects[projectData.id] = new Project( projectData );
                    this.projectIDs[projectData._id] = projectData.id;

                    break;

                // Remove project
                case 'delete':

                    const docID = data.documentKey._id.valueOf();

                    const project = this.projects[this.projectIDs[docID]];
                    delete this.projects[project.id];
                    delete this.projectIDs[docID];

                    await project.shutdown();
                    project.clearCache();

                    break;
            }
        });
    }

    upgradeMiddleware(){
        const self = this;

        // Socket connections for loading state
        return async function( req, socket, head ){

            // Get project
            const subdomains = req.headers.host.split('.').reverse().slice(2);
            if( subdomains.length <= 0 ) return;
            const projectID = subdomains[0];
            const project   = self.projects[projectID];

            // Check requested app exists
            if( !project ) return socket.destroy();

            // Check if app running
            if( project.state == project_state.RUNNING ){
                return project.upgrade( ...arguments );
            }
            
            // Check if app starting
            if( project.loading && req.url == '/__loading_state__' ){
                return project.loading.handleUpgrade( ...arguments );
            };

            return socket.destroy();
        };
    }

    projectMiddleware(){
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

            // Authentication (project password protected)
            if( project.password ){

                const tokenName = `__${projectID}_token__`;
                const jwtExpiry = 1800; // 30 minutes
                const jwtMinRefresh = 600; // 10 minutes

                function createJWT(){
                    const token = jwt.sign({ project: project.id }, process.env.JWT_KEY, {
                        algorithm: "HS256",
                        expiresIn: jwtExpiry,
                    });

                    res.cookie( tokenName, token, { maxAge: jwtExpiry * 1000 } );
                }

                // Login
                if( req.url == '/__auth__' ){
                    const { password } = req.body;

                    // Auth success
                    if( await db.comparePasswords( password, project.password ) ){

                        // Create jwt
                        createJWT();
                        return res.end();

                    // Auth failure
                    } else {
                        return res.status(401).send('Invalid Credential');
                    }
                }

                // Check Authenticated
                try {
                    const payload = jwt.verify( req.cookies[tokenName], process.env.JWT_KEY );

                    if( payload.project != project.id ) throw new Error('User not Authenticated for this project');
                    if( payload.iat * 1000 < project.instanceID ) throw new Error('New instance has been made since last auth'); // password might have changed
        
                    // Refresh token on requests instead of refresh route
                    const nowSeconds = Math.round( new Date().getTime() / 1000 );
                    if( nowSeconds - payload.iat > jwtMinRefresh ){ // Only refresh after time elapsed
                        createJWT();
                    }

                } catch {
                    // Request Authentication (render password entry)
                    return res.sendFile(path.join( __dirname, '../views/auth.html' ));
                }
            }

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
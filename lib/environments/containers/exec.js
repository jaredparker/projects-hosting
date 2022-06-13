
const { exec } = require('child_process');
const kill     = require('tree-kill-promise');

class ExecContainer {

    constructor( dir, port ){
        this.options = {
            cwd: dir,
            env: {
                ...process.env,
                PORT: port
            }
        }
        this.process = undefined;
    }

    async run( cmd ){
        await new Promise(( resolve, reject ) => {
            this.process = exec( cmd, this.options, function( err, stdout, stderr ){
                //console.log(err);
                //console.log(stdout);
                //console.log(stderr);
                resolve();
            });
        });
    }

    async kill(){
        await kill( this.process.pid );
    }
}

module.exports = ExecContainer;

const project_state = {
    IDLE: 'idle', // Available to startup
    STARTUP: 'startup', // Setting up working directory and instance
    RUNNING: 'running', // Instance running
    SHUTDOWN: 'shutdown' // Instance being closed
}

module.exports = { project_state };
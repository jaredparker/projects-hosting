
const project_state = {
    IDLE: 'idle', // Available to startup
    STARTUP: 'startup', // Setting up working directory and instance
    RUNNING: 'running', // Instance running
    SHUTDOWN: 'shutdown', // Instance being closed
    CLEARING: 'clearing' // Instance data being removed
}

const loading_state = {
    INITIALIZE: 'initialize',
    STARTUP: 'startup',
    READY: 'ready'
}


module.exports = { project_state, loading_state };
/**
 * @class
 * @version 1.0
 * @name Config 
 * @description Loads a config file and stores the data for easy access across the system
 * @param {string,undefined} path
 */
function Config(path){
    // load the Node.js fileSystem handler
    let fs = require('fs');
    let config;

    // check if path was supplied
    if(typeof path === "undefined"){
        // if not use the default
        path = "./config.json";
    }

    // check the config file exists
    if(!fs.existsSync(path)){
        // if not throw to stop execution
        throw `Unable to locate config file '${path}'`;
    }

    // read the config file this is blocking the system can continue without this loaded
    let configContent = fs.readFileSync(path);

    // save the config in our cache
    config = JSON.parse(configContent);

    /**
     * @private
     * @name Config.get
     * @description read the config and returns the value if it exists otherwise returns the given defaultValue
     * @param {string} name 
     * @param {*} defaultValue 
     */
    let get = (name, defaultValue) =>{
        if(typeof config[name] === "undefined"){
            return defaultValue;
        }
        return config[name];
    }

    /**
     * @public
     * @name Config.get
     * @description read the config and returns the value if it exists otherwise returns the given defaultValue
     * @param {string} name 
     * @param {*} defaultValue 
     */
    this.get = (name, defaultValue) => {
        return get(name, defaultValue);
    }
}

// export the function so it can be instanciated
module.exports = Config;
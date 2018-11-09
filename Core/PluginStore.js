/**
 * @class
 * @name PluginStore
 * @description the plugin store manager handles crating and loading store for plugins
 * @version 1.0
 * @param {String} path 
 */
function PluginStore(path){
    // load the Node.js fileSystem handler
    let fs = require('fs');

    // check if path is set
    if(typeof path === "undefined"){
        // it's not use the default
        path = "stores";
    }

    // check the path exists Blocking
    if(!fs.existsSync(path)){
        // no create the directory them
        fs.mkdirSync(path);
    }else{
        // check that the path is not directory
        if(!fs.lstatSync(path).isDirectory()){
            throw `Unable to set the store directory to ${path} it's not a directory`;
        }
    }

    /**
     * @private
     * @name PluginStore.Store
     * @description create or loads a store for the given plugin
     * @param {String} pluginName 
     */
    function Store(pluginName){
        // hold the store as an object
        let store = {};
        // build the file path for the store
        let filePath = `${path}/${pluginName}.json`;

        // check if the store exists blocking
        if(fs.existsSync(filePath)){
            // try to load the store file
            try{
                let fc = fs.readFileSync(filePath);
                store = JSON.parse(fc);
            }catch(ex){
                // could not load it
                console.error(`Plugin store for plugin '${pluginName}' is corrupted store is empty`)
                store = {};
            }
        }else{
            // it does not create it with an empty object
            fs.writeFileSync(filePath, JSON.stringify(store, null, 4));
        }

        /**
         * @private
         * @name PluginStore.Store.SaveUpdate
         * @description saves the store object into the plugin's store file
         */
        let SaveUpdate = () => {
            fs.writeFileSync(filePath, JSON.stringify(store, null, 4));
        }

        /**
         * @private
         * @name PluginStore.Store.rm
         * @description the rm method allowing the plugin to remove information
         * @param {String} name
         */
        let rm = (name) => {
            delete store[name];
            SaveUpdate();
        };

        /**
         * @private
         * @name PluginStore.Store.set
         * @description the set method allowing the plugin to save information
         * @param {String} name 
         * @param {*} value 
         */
        let set = (name, value) => {
            store[name] = value;
            SaveUpdate();
        };

        /**
         * @private
         * @name PluginStore.Store.get
         * @description trys to get the value from the store if it does not exist will give defaultValue
         * @param {String} name 
         * @param {*} defaultValue 
         */
        let get = (name, defaultValue) => {
            if(typeof store[name] === "undefined"){
                return defaultValue; 
            }
            return store[name];
        };

        /**
         * @public
         * @name PluginStore.Store.set
         * @description the set method allowing the plugin to save information
         * @param {String} name 
         * @param {*} value 
         */
        this.set = (name, value) => {
            return set(name, value);
        }

        /**
         * @public
         * @name PluginStore.Store.get
         * @description trys to get the value from the store if it does not exist will give defaultValue
         * @param {String} name 
         * @param {*} defaultValue 
         */
        this.get = (name, defaultValue) => {
            return get(name, defaultValue);
        }

        /**
         * @public
         * @name PluginStore.Store.rm
         * @description the rm method allowing the plugin to remove information
         * @param {String} name 
         */
        this.rm = (name) => {
            return rm(name);
        }
    }

    /**
     * @public
     * @name PluginStore.getPluginStore
     * @description load the store object for this given plugin
     * @param {String} pluginName 
     */
    this.getPluginStore = (pluginName) => {
        return new Store(pluginName);
    }

}

module.exports = PluginStore
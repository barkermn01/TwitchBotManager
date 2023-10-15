// lock the plugins being loaded into a scope that prevents access to the node proccess though scope locking vars
( (proccess) => {
    /**
     * @class
     * @name Plugins
     * @description The Plugin manager responcible for loading plugins.
     * @version 1.0
     * @param {string} path 
     * @param {object} accessors 
     */
    function Plugins(path, accessors){
        // load the Node.js fileSystem handler
        let fs = require('fs');
        // load the Node.js child process system
        let proc = require('child_process');
        // create store object for loaded plugins
        let loadedPlugins = {};
        // create sotre object for the loaded plugins parsed plugin.json
        let pluginMeta = {};

        /**
         * @private
         * @name Plugins.PluginManager
         * @description This is the function plugins have access to to obtain information from this object
         * @version 1.0
         */
        function PluginManager(){
            /**
             * @name getLoadedPlugins
             * @description returns a list of the installed plugins
             */
            this.getLoadedPlugins = () => {
                return loadedPlugins;
            }

            /**
             * @name getPluginMeta
             * @description provides access to the plugin meta data for a plugin name
             * @param {string} pluginName 
             */
            this.getPluginMeta = (pluginName) => {
                return pluginMeta[pluginName];
            }
        }

        /**
         * @private
         * @name Plugins.getPlugins
         * @description scans the plugin directory for plugin directories
         * @returns {Promise<success, fail>} did we get the plugins or did we fail to
         */
        let getPlugins = () => {
            return new Promise((resolve, reject) => {
                if(fs.existsSync(path)){
                    fs.readdir(path, {}, (err, files) => {
                        resolve(files);
                    });
                }else{
                    reject(`Path '${path}' does not exist`);
                }
            });
        }

        /**
         * @private
         * @name Plugins.getPluginMeta
         * @description checks for and tries to load the meta information of the plugin
         * @param {string} PluginName the name of the plugin to load the meta for
         * @returns {Promise<success,fail>} we're we able to load the meta data for the plugin
         */
        let getPluginMeta = (PluginName) => {
            return new Promise((res, rej) => {
                let pluginCfgPath = `${path}/${PluginName}/plugin.json`;
                // does file exist
                if(fs.existsSync(pluginCfgPath)){
                    // try to load it's meta
                    let dContent = fs.readFileSync(pluginCfgPath);
                    let js = JSON.parse(dContent);
                    pluginMeta[PluginName] = js;
                    // success 
                    res(js);
                }else{
                    // fail for an unknown reason
                    rej();
                }
            });
        }

        /**
         * @private
         * @name Plugins.checkPluginRequires
         * @description checks if a plugin requires any NPM libraries we don't have installed and tries to install them
         * @param {Object} requires object of npm module name as key with value at target version
         * @param {String} pluginName the name of the plugin we're loading requires for
         * @returns {Promise<success, fail>} we're we able to install the requries for this plugin
         */
        let checkPluginRequires = (requires, pluginName) => {
            return new Promise((res, rej) => {
                try{
                    // check if there are any requries for the plugin
                    if( Object.getOwnPropertyNames(requires).length > 0){
                        // there is so go though them
                        Object.keys(requires).forEach((name) => {
                            try{
                                // try to load the requires
                                require.resolve(`${name}`);
                            }catch(ex){
                                let version = requires[name];
                                // could not load it lets try to isntall it
                                console.log(`installing '${name}@${version}' for plugin '${pluginName}'`);
                                proc.exec(`npm install ${name}@${version}`, () => {
                                    console.log(`installed ${name}@${version}`);
                                });
                            }
                        });
                    }
                    // success
                    res();
                }catch(ex){
                    // something went wrong fail it
                    rej(ex);
                }
            });
        }

        /**
         * @private
         * @name Plugins.checkPluginCanLoad
         * @description check if the plugins class file exists and can be loaded into node
         * @param {String} pluginName the name of the plugin to check we can load it
         * @param {String} pluginFile the name of the class file supplied in the meta for this plugin
         */
        let checkPluginCanLoad = (pluginName, pluginFile) => {
            return new Promise((res, rej) => {
                // build the plugin's class files path
                let req = `${path}/${pluginName}/${pluginFile}`
                // check it exists blocking
                let fileState = fs.existsSync(`./${req}.js`);
                let test = fs.readFileSync(`./${req}.js`).toString();
                //debugger;
                if(fileState){
                    // it exists try to load it in a safe manner
                    let plugin = require.resolve(`../${req}.js`);
                    res(plugin);
                }else{
                    // could not find or load the plugin
                    rej(`Plugin is invalid can't find or load class for ${pluginFile}`);
                }
            });
        }

        /**
         * @private
         * @name Plugins.unloadPlugin
         * @description loads the plugin and supplies checks for bind methods then calls them if they exist also provide access to system that allow access.
         * @param {String} pluginName the name of the plugin to unload
         */
        let unloadPlugin = async(PluginName) => {
            getPluginMeta(pluginName).then((inMeta) => {
                return new Promise( (p, f) => {
                    if(typeof loadedPlugins[PluginName][meta.plugin.unload] === "function"){
                        loadPlugin[PluginName][meta.plugin.unload]();
                        p();
                    }else{
                        f("no method");
                    }
                });
            });
        }

        /**
         * @private
         * @name Plugins.loadedPlugins
         * @description loads the plugin and supplies checks for bind methods then calls them if they exist also provide access to system that allow access.
         * @param {String} pluginName the name of the plugin to load
         * @param {String} pluginPath the name of the class file supplied in the meta for this plugin
         */
        let loadPlugin = (pluginName, pluginPath) => {
            return new Promise((res, rej) => {
                try{
                    // create an instance of the plugin class
                    let pluginClass = require(pluginPath, { process: process.exiting });
                    let plugin = new pluginClass({
                        "plugins":new PluginManager()
                    });
                    let meta;
                    getPluginMeta(pluginName).then((inMeta) => { 
                        meta = inMeta; 

                        // check that this plugin has injection methods
                        if(typeof meta.injection === "object"){
                            // check that this plugin has injection methods for the Web Server
                            if(typeof meta.injection.Web){
                                // check does this plugin want to bind into the web server
                                if(typeof plugin[meta.injection.Web.Hosting] === "function"){
                                    // it's there then run it giving it access to the setHandler method of the web server
                                    plugin[meta.injection.Web.Hosting](accessors.WebServer.setHandler);
                                }else{
                                    console.error(`plugin '${pluginName}' meta defined injection.Web.Hosting but the method '${meta.injection.Web.Hosting}' does not exist`);
                                }
                                // check does this plugin want to add to the Web UI Navigation
                                if(typeof plugin[meta.injection.Web.MenuRegister] === "function"){
                                    // it's there then run it giving it access to the setHandler method of the web server
                                    plugin[meta.injection.Web.MenuRegister]((url) => {accessors.WebServer.registerMenuLink(pluginName, url)});
                                }else{
                                    console.error(`plugin '${pluginName}' meta defined injection.Web.MenuRegister but the method '${meta.injection.Web.MenuRegister}' does not exist`);
                                }
                            }
                            // check does this plugin have injection method Store access
                            if(typeof meta.injection.State === "object"){
                                // check does this plugin want to save information
                                if(typeof plugin[meta.injection.State.Get] === "function"){
                                    // it's there create or load an existing store for this plugin
                                    let store = accessors.Store.getPluginStore(pluginName);
                                    // run the method giving it access to it's store
                                    plugin[meta.injection.State.Get](store);
                                }else{
                                    console.error(`plugin '${pluginName}' meta defined injection.Store.Register but the method '${meta.injection.Store.Register}' does not exist`);
                                }
                            }
                            // check does this plugin have injection methods for Twitch Chat
                            if(typeof meta.injection.TwitchChat === "object"){
                                // check does this plugin want to have twitch chat commands
                                if(typeof meta.injection.TwitchChat.Command === "string"){
                                    // check does this plugin want to register twich command
                                    if(typeof plugin[meta.injection.TwitchChat.SendMessage] === "function"){
                                        // it does call the method giving it access to the twich registerCommandHandler method so it can register it's handlers for commands
                                        plugin[meta.injection.TwitchChat.SendMessage](accessors.TwitchChat.registerCommandHandler);
                                        console.error(`plugin '${pluginName}' meta defined injection.TwitchChat.Command the method '${meta.injection.TwitchChat.SendMessage}' not exist`);
                                    }
                                }
                                // check does this plugin want to have access to read messages
                                if(typeof meta.injection.TwitchChat.AllMessages === "string"){
                                    // check does this plugin want to handle all chat messages from twich 
                                    if(typeof plugin[meta.injection.TwitchChat.AllMessages] === "function"){
                                        // it does ok give it access to the registation system so it can register it's handlers
                                        plugin[meta.injection.TwitchChat.AllMessages](accessors.TwitchChat.registerMessageHandler);
                                    }else{
                                        console.error(`plugin '${pluginName}' meta defined injection.TwitchChat.AllMessages but the method '${meta.injection.TwitchChat.AllMessages}' does not exist`);
                                    }
                                }
                                // check does this plugin want to have access to write messages
                                if(typeof meta.injection.TwitchChat.SendMessage === "string"){
                                    // check does this plugin want to access send unprompted Twich messages
                                    if(typeof plugin[meta.injection.TwitchChat.SendMessage] === "function"){
                                        // it does give it access to the Twich message writer
                                        plugin[meta.injection.TwitchChat.SendMessage](accessors.TwitchChat.getWriter());
                                    }else{
                                        console.error(`plugin '${pluginName}' meta defined injection.TwitchChat.SendMessag but the method '${meta.injection.TwitchChat.SendMessage}' does not exist`);
                                    }
                                }
                            }
                        }
                        // save the plugin so we don't lose it
                        loadedPlugins[pluginName] = plugin;
                        // success
                        res(plugin);
                    });
                }catch(ex){
                    // something went wrong the plugin is broken fail
                    rej(ex);
                }
            });
        }

        /**
         * @public
         * @name Plugins.unload
         * @description goes though all plugins and calls there unload events if they have one
         */
        this.unload = async () => {
            loadedPlugins.forEach((plugin, pluginName) => {
                this.unloadPlugin(pluginName).then(() =>{}, (f) => {});
            });
        }

        // get all the plugins installed
        getPlugins().then((plugins) => {
            // then go though them one by one
            plugins.forEach(pluginName => {
                (async () => {
                    // get this plugins meta information
                    getPluginMeta(pluginName).then(meta => {
                        // check does this plugin require any NPM libraries if so load them
                        checkPluginRequires(meta.requires, pluginName).then(() =>{
                            // is the plugin ok to load
                            checkPluginCanLoad(pluginName, meta.plugin.file).then(plugin => {
                                // load the plugin
                                loadPlugin(pluginName, plugin).then(plugnExec => {
                                    // plugin loaded call the init method
                                    if(typeof meta.plugin.init === "function"){
                                        plugnExec[meta.plugin.init]();
                                    }
                                }).catch(err => {
                                    // the init method failed or we could not load the plugin
                                    console.error(`failed to init plugin '${pluginName}' with error '${err}' ${err.stack}`);
                                });
                            }).catch(path => {
                                // the plugin will not load something is wrong with it
                                console.error(`failed to load plugin '${pluginName}' with error '${path}' ${err.stack}`)
                            })
                        }).catch(err => {
                            // the plugin said it requried something we could not install
                            console.error(`failed to install required for plugin '${pluginName}' with error '${err}' ${err.stack}`);
                        })
                    }).catch((err) => {
                        // we could not load the meta for this plugin
                        console.error(`Error: failed to load the plugin meta for plugin '${pluginName}' ${err}`);
                    })
                })();
            });
        }).catch((ex) => { 
            // an unknown error occured.
            console.error("\rex"); 
        });
    }

    module.exports = Plugins;
})();
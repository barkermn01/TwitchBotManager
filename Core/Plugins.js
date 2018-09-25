( (proccess) => {
    function Plugins(path, accessors){
        let fs = require('fs');
        let proc = require('child_process');
        let loadedPlugins = {};

        function PluginManager(){
            this.getLoadedPlugins = () => {
                return loadedPlugins;
            }
        }

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

        let getPluginDetails = (dir) => {
            return new Promise((res, rej) => {
                let pluginCfgPath = `${path}/${dir}/plugin.json`;
                if(fs.existsSync(pluginCfgPath)){
                    let dContent = fs.readFileSync(pluginCfgPath);
                    let js = JSON.parse(dContent);
                    res(js);
                }else{
                    rej();
                }
            });
        }

        let checkPluginRequires = (requires, pluginName) => {
            return new Promise((res, rej) => {
                try{
                    if( Object.getOwnPropertyNames(requires).length > 0){
                        requires.forEach((version, name) => {
                            try{
                                require.resolve(`../${req}`);
                            }catch(ex){
                                console.log(`installing '${name}@${version}' for plugin '${pluginName}'`);
                                proc.exec(`npm install ${name}@${version}`);
                            }
                        });
                    }
                    res();
                }catch(ex){
                    rej(ex);
                }
            });
        }

        let checkPluginCanLoad = (pluginName, pluginFile) => {
            return new Promise((res, rej) => {
                let req = `${path}/${pluginName}/${pluginFile}`
                let fileState = fs.existsSync(`${req}.js`);
                if(fileState){
                    let plugin = require.resolve(`../${req}`);
                    res(plugin);
                }else{
                    rej(`Plugin meta is invalid can't find ${pluginFile}`);
                }
            });
        }

        let loadPlugin = (pluginName, pluginPath) => {
            return new Promise((res, rej) => {
                try{
                    let pluginClass = require(pluginPath);
                    let plugin = new pluginClass({
                        "plugins":new PluginManager()
                    });
                    if(typeof plugin.registerWebHandlers === "function"){
                        plugin.registerWebHandlers(accessors.WebServer.setHandler);
                    }
                    if(typeof plugin.connectToStore === "function"){
                        let store = accessors.Store.getApplicationStore(pluginName);
                        plugin.connectToStore(store);
                    }
                    if(typeof plugin.registerTwitchCommandHandler === "function"){
                        plugin.registerTwitchCommandHandler(accessors.Twitch.registerCommandHandler);
                    }
                    if(typeof plugin.registerTwitchMessageHandler === "function"){
                        plugin.registerTwitchMessageHandler(accessors.Twitch.registerTrigger);
                    }
                    if(typeof plugin.registerTwitchChatTrigger === "function"){
                        plugin.registerTwitchChatTrigger(accessors.Twitch.getWriter());
                    }
                    loadedPlugins[pluginName] = plugin;
                    res(plugin);
                }catch(ex){
                    rej(ex);
                }
            });
        }

        getPlugins().then((plugins) => {
            plugins.forEach(pluginName => {
                getPluginDetails(pluginName).then(meta => {
                    checkPluginRequires(meta.requires, pluginName).then(() =>{
                        checkPluginCanLoad(pluginName, meta.init).then(plugin => {
                            loadPlugin(pluginName, plugin).then(plugnExec => {
                                plugnExec.init();
                            }).catch(err => {
                                console.error(`failed to init plugin'${pluginName}' with error '${err}'`);
                            });
                        }).catch(path => {
                            console.error(`failed to load plugin '${pluginName}'`)
                        })
                    }).catch(err => {
                        console.error(`failed to install required for plugin '${pluginName}' with error '${err}'`);
                    })
                }).catch(() => {
                    console.error(`Error: failed to load the plugin meta for plugin '${pluginName}'`);
                })
            });
        }).catch((ex) => { 
            console.error("\rex"); 
        });
    }

    module.exports = Plugins;
})();
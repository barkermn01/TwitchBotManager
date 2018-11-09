// load the core libraries
const Core = require('./Core/Core.js');

// load the node.js readline hadnler
const readline = require('readline');

// setup the readline handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let argOffset = 0;
process.argv.forEach((itm, key) => {
    if(itm === "index.js"){
        argOffset = key+1;
    }
})

// set the config file
const configFile = (typeof process.argv[2] === "undefined" || process.argv[2] === "")? "config.json":process.argv[2];
// load the confic class
const config = new Core.Config(configFile);

/* Start the WebServer */
const web = new Core.WebServer(config.get("WebServer"));
web.startServer(config.get("WebServer").port);
console.log(`WebServer is running on ${config.get("WebServer").port} serving static content from '${config.get("WebServer").directory}'.`);

/* open the plugin stores so plugins can store info */
const pluginStore = new Core.PluginStore(config.get("Plugins").storeDirectory);
console.log(`Plugins State Storage loaded from '${config.get("Plugins").storeDirectory}'.`);

let plugins;
/* Load the Twitch connector */
new Core.TwitchChat(config.get("Twitch")).then( (twitchChat) => {
    console.log(`Twitch Connected to channel '${config.get("Twitch").channelName}'.`);
    /* Load the plugin loader */
    plugins = new Core.Plugins(config.get("Plugins").directory, {
        "Store":pluginStore,
        "TwitchChat":twitchChat,
        "WebServer":web
    });
    console.log(`Plugins from '${config.get("Plugins").directory}' have been loaded.`);
}).catch(err => {
    // something went wrong is the Twich Connector
    console.log(`Failed to load the Twich Connector ${err}`);
});

// setup an exit handler to shut down proccesses better
let onExit = () => {
    rl.close()
    if(plugins){ plugins.unload(); }
    web.exit();
    process.exit();
};

/* handle user input to exit the server */
rl.on('line', function(line) {
    if(line === "exit"){ onExit(); }
});

/* handle operating system exit on the server */
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

/* Launch the browser */
if(config.get("OpenManagerAutomaticly")){
    (() => {
        let cp = require('child_process');
        let os = require('os');
        switch(os.platform()){
            case "darwin":
            childProc.exec(`open -a "Google Chrome" http://localhost:${config.get("WebServer").port}/`);
            break;
            case "win32":
                cp.exec(`start chrome http://localhost:${config.get("WebServer").port}/`);
            break;
            default:
                console.warn(`Could not start chrome please open http://localhost:${config.get("WebServer").port}/ in your web browser`);
            break;
        }
    })();
}
const WebServer = require('./Core/WebServer');
const PluginStore = require ('./Core/PluginStore');
const Plugins = require ('./Core/Plugins');
const Config = require('./Core/Config');
const Twitch = require('./Core/Twitch');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const configFile = (typeof process.argv[2] === "undefined" || process.argv[2] === "")? "config.json":rocess.argv[2];
const config = new Config(configFile);

let exiting = false;

/* Start the WebServer */
const web = new WebServer(config.get("WebServer"));
web.startServer(config.get("WebServer").port);
console.log(`WebServer is running on ${config.get("WebServer").port} serving static content from '${config.get("WebServer").directory}'.`);

/* open the plugin stores so plugins can store info */
const pluginStore = new PluginStore(config.get("Plugins").storeDirectory);
console.log(`Plugins State Storage loaded from '${config.get("Plugins").storeDirectory}'.`);

/* Load the Twitch connector */
new Twitch(config.get("Twitch")).then( (twitch) => {
    console.log(`Twitch Connected to channel '${config.get("Twitch").channelName}'.`);
    /* Load the plugin loader */
    const plugins = new Plugins(config.get("Plugins").directory, {
        "Store":pluginStore,
        "Twitch":twitch,
        "WebServer":web
    });
    console.log(`Plugins from '${config.get("Plugins").directory}' have been loaded.`);
});

let onExit = () => {
    rl.close()
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
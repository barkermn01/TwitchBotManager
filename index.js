// load the core libraries
const WebServer = require('./Core/WebServer');
const PluginStore = require ('./Core/PluginStore');
const Plugins = require ('./Core/Plugins');
const Config = require('./Core/Config');
const Twitch = require('./Core/Twitch');

// load the node.js readline hadnler
const readline = require('readline');

// setup the readline handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// set the config file
const configFile = (typeof process.argv[2] === "undefined" || process.argv[2] === "")? "config.json":rocess.argv[2];
// load the confic class
const config = new Config(configFile);

/* Start the WebServer */
const web = new WebServer(config.get("WebServer"));
web.startServer(config.get("WebServer").port);
console.log(`WebServer is running on ${config.get("WebServer").port} serving static content from '${config.get("WebServer").directory}'.`);

/* open the plugin stores so plugins can store info */
const pluginStore = new PluginStore(config.get("Plugins").storeDirectory);
console.log(`Plugins State Storage loaded from '${config.get("Plugins").storeDirectory}'.`);

/* Load the Twitch connector */
new TwitchChat(config.get("Twitch")).then( (twitchChat) => {
    console.log(`Twitch Connected to channel '${config.get("Twitch").channelName}'.`);
    /* Load the plugin loader */
    const plugins = new Plugins(config.get("Plugins").directory, {
        "Store":pluginStore,
        "TwitchChat":twitchChat,
        "WebServer":web
    });
    console.log(`Plugins from '${config.get("Plugins").directory}' have been loaded.`);
});

// setup an exit handler to shut down proccesses better
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
const WebServer = require('./WebServer');
const PluginStore = require ('./PluginStore');
const Plugins = require ('./Plugins');
const Config = require('./Config');
const TwitchChat = require('./TwitchChat');

module.exports = {
    "WebServer":WebServer,
    "PluginStore":PluginStore,
    "Plugins":Plugins,   
    "Config":Config,
    "TwitchChat":TwitchChat
}
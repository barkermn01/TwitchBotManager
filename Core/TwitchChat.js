/**
 * @class
 * @name TwichChat
 * @description the Twitch chat manager
 * @version 1.0
 * @param {Object} config 
 * @returns {Promise} if we're connected to twitch.
 */
function TwitchChat(config){
    return new Promise((loaded, failed) => {
        // load the npm library twitch-bot
        let TwitchBot = require("twitch-bot");
        // store the registered command handlers
        let commandHandler = [];
        // store the registered message handlers
        let chatHandlers = [];
        // are we connected to twitch default no
        let connected = false;

        // create the connection to twich using the config settings
        let Bot = new TwitchBot({
            username: config.username,
            oauth: config.oauth,
            channels: Object.values(config.channnels)
        });

        /**
         * @private
         * @name TwitchChat.registerCommandHandler
         * @param {String} cmd the command to register to 
         * @param {String} desc the description of what this command does
         * @param {function} handler the handler function that must return a Promise
         */
        let registerCommandHandler = (cmd, desc, handler) => {
            // check that the parameters are correct
            if(typeof cmd !== "string"){
                throw "[incorrect_params] Twitch.registerHandler arguments incorrect my supply a string command, string description and a function that returns a Promise";
            }
            if(typeof desc !== "string"){
                throw "[incorrect_params] Twitch.registerHandler arguments incorrect my supply a string command, string description and a function that returns a Promise";
            }
            if(typeof handler !== "function" ){
                throw "[incorrect_params] Twitch.registerHandler arguments incorrect my supply a string command, string description and a function that returns a Promise";
            }

            return new Promise((res, rej) => {
                // check if the command has been registered already
                let commandRegPrev = false;
                commandHandler.forEach((itm) => {
                    if(typeof itm[cmd] !== "undefined"){
                        commandRegPrev = true;
                    }
                });
                // it has been oh trigger and error to the plugin to it can handle it
                if(commandRegPrev){
                    rej(`Command '${cmd}' already registered`)
                }
                // the command and description are to long for the help command to present it.
                if(`${config.commandChar}${cmd}: ${desc}`.length > 500){
                    let descLeng = 500 - itm.cmd.length - 4;
                    rej(`description is to long it must be less than ${descLeng}`);
                }
                // save the command handler
                commandHandler.push({"handler":handler, "cmd":cmd, "desc":desc});
                // success
                res();
            });
        }

        /**
         * @private
         * @name testConnection
         * @description checks if the connection to twitch has been successfull after 10 config time
         */
        let testConnection = setTimeout(() => {
            if(!connected){ console.error("Failed to connect to Twitch!") }
            clearTimeout(testConnection);
            failed();
        }, config.connectionTimeout*1000)

        
        this.registerCommandHandler = (command, description, handler) => {
            registerCommandHandler(command, description, handler);
        }
        
        this.registerCommandHandler(config.helpCommand, "Shows this list of commands", (command, isMod, argv, respond) => {
            return new Promise((res, rej) => {
                try{
                    let msg = "";
                    commandHandler.forEach(itm => {
                        let commandStr = `${config.commandChar}${itm.cmd}: ${itm.desc} `;
                        if((msg+commandStr).length > 500){
                            respond(msg);
                            msg = "";
                        }
                        msg += commandStr;
                    });
                    respond(msg);
                    res();
                }catch(ex){
                    rej(ex);
                }
            });
        });

        /**
         * @private
         * @name TwitchChat.registerMessageHandler
         * @param {fucntion} handler the handler function that must return a Promise
         */
        let registerMessageHandler = (handler) => {
            chatHandlers.push(handler);
        }

        /**
         * @private
         * @name TwitchChat.registerMessageHandler
         * @param {fucntion} handler the handler function that must return a Promise
         */
        this.registerMessageHandler = (handler) => {
            registerMessageHandler(handler);
        }

        /**
         * @public
         * @name TwichChat.getWriter
         * @description returns a function that can send chat messages to the channel
         */
        this.getWriter = () => {
            return (message, cb) => {
                Bot.say(message, config.channelName, cb);
            }
        }

        // register to the event for when the bot connects
        Bot.on('join', () => {
            // conencted clear the error notice timeout
            clearTimeout(testConnection)

            // register to the event for when the bot connects
            Bot.on('message', msg => {

                // check that that we have event handler's bouns
                if(Object.getOwnPropertyNames(commandHandler).length > 0){
                    // go this each command handler
                    commandHandler.forEach(itm => {
                        // break the messages up by space
                        let msgParts = msg.message.split(" ");
                        // check that the command matches this command handler
                        if(msgParts[0] === `${config.commandChar}${itm.cmd}`)
                        {
                            // it does ok was this posed by a mod
                            let isMod = (`${msg.username}` === config.channelName || msg.mod);
                            // call the handler function giving it the command, if the user is a mod, the reset of the message parts
                            // and a link to respond to the channel that sent the message
                            itm.handler(itm.cmd, isMod, msgParts.shift(), (message) =>{
                                Bot.say(message, msg.channel);
                            }
                            ).then( () =>{}).catch(err => {
                                // the plugin errored 
                                console.error(`Command '${msg.message}' failed with the plugin with error '${err}'.`);
                            });
                        }
                    });
                }

                // go thoough each chat handler and send them the message
                if(chatHandlers.length > 0){
                    chatHandlers.forEach(handler => {
                      handler(msg);  
                    })
                }

            })
            // we're connected to twich
            loaded(this);
        })

        // a error with twitch happened log it.
        Bot.on('error', err => {
            console.log(err)
        });
    })
}

module.exports = TwitchChat;
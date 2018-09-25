function Twitch(config){
    return new Promise((loaed, failed) => {
        let TwitchBot = require("twitch-bot");
        let commandHandler = [];
        let chatHandlers = [];
        let connected = false;

        let Bot = new TwitchBot({
            username: config.username,
            oauth: config.oauth,
            channels: [config.channelName],
        });

        let registerCommandHandler = (cmd, desc, handler) => {
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
                let commandRegPrev = false;
                commandHandler.forEach((itm) => {
                    if(typeof itm[cmd] !== "undefined"){
                        commandRegPrev = true;
                    }
                });
                if(commandRegPrev){
                    rej(`Command '${cmd}' already registered`)
                }
                if(`${config.commandChar}${cmd}: ${desc}`.length > 500){
                    let descLeng = 500 - itm.cmd.length - 4;
                    rej(`description is to long it must be less than ${descLeng}`);
                }
                commandHandler.push({"handler":handler, "cmd":cmd, "desc":desc});
                res();
            });
        }

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

        let registerMessageHandler = (handler) => {
            chatHandlers.push(handler);
        }

        this.getWriter = () => {
            return (message) => {
                Bot.say(message, `#${config.channelName}`);
            }
        }

        Bot.on('join', () => {
            clearTimeout(testConnection)

            Bot.on('message', msg => {

                /* proccess registered event handlers */
                if(Object.getOwnPropertyNames(commandHandler).length > 0){
                    commandHandler.forEach(itm => {
                        let msgParts = msg.message.split(" ");
                        if(msgParts[0] === `${config.commandChar}${itm.cmd}`)
                        {
                            let isMod = (`${msg.username}` === config.channelName || msg.mod);
                            itm.handler(itm.cmd, isMod, msgParts.shift(), (message) =>{
                                Bot.say(message, msg.channel);
                            }
                            ).then( () =>{}).catch(err => {
                                console.error(`Command '${msg.message}' failed with the plugin with error '${err}'.`);
                            });
                        }
                    });
                }

                if(chatHandlers.length > 0){
                    chatHandlers.forEach(handler => {
                      handler(msg);  
                    })
                }

            })
            loaed(this);
        })

        Bot.on('error', err => {
            console.log(err)
        });
    })
}

module.exports = Twitch;
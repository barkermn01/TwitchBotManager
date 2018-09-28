# Twitch Bot Manager
A Simple to use Framework for creating Twitch bots.
Provides a range of tools to help developers quickly and easily build objective code bot's in Node.js

### Tools provded 
* Plugin Storage
* Twitch handler methods
* Web server static hosting and dynamic programing interface.

### How to run
this system is built in Node.js to use it make sure you have the latest node installed. then clone or download this repository. and open a terminal or command prompt windown `cd` to the directory of the files for this code base and to run use the command `node index.js`.

## Configuring the framework to connect to your twitch.
Things you will need 
1) a Twitch channel to use the bot on
2) a Twitch Bot account for the bot

### How to setup
1) open config.json for editing
2) endit the "Twitch" section of the config to and setup like so
    1) `username` - this is the username of your bot
    2) `oauth` - this is your oauth token from https://twitchapps.com/tmi/ make sure to use your bot account.
    3) `channelName` - this is the name of the channel you would like the bot to operate on normally your username
    4) `commandChar` is the character that plugins register commands again including the twitch helper that be default setups up the command help so with it set to `!` in twitch chat you would send `!help`
    5) `helpCommand` - this is the command used to show the help as example above,
    6) `connectionTimeout` - this is the time to wait for the bot to connec to twich after this it will show and error
 
```json
...
    "Twitch":{
        "username":"botuserUsername",
        "oauth":"oauth:******",
        "channelName":"channelName",
        "commandChar":"!",
        "helpCommand":"help",
        "connectionTimeout":"10"
    },
...
```

### Plugin example
you can find an example plugin at https://github.com/barkermn01/TwitchBotManager_ExampleBot

# License
GPLv2 or later

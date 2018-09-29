/**
 * @class
 * @name WebServer
 * @description The Web server maanger class allows plugins to register.
 * @param {Object} config 
 */
function WebServer(config){
    // load the Node.js http system
    let http = require('http');
    // load the Node.js url handler
    let url = require('url');
    // load the Node.js fileSystem handler
    let fs = require('fs');

    // hold the registerd path's and there handlers
    let pathHandlers = [];

    // hold the log handlers if we're using them
    let accessLog = false;
    let errorLog = false;

    // store the registered menu handlers
    let menuHandlers = {};

    // get the config if the access log is enabled
    if(config.accessLog.enabled){
        // build the access log file path
        let logFile = `${config.accessLog.filePath}.log`;
        // are we archiving the access old log
        if(config.accessLog.archive && fs.existsSync(logPath)){
            // archive it
            fs.renameSync(logFile, `${config.accessLog.filePath}.arc_${dStr}.log`);
        }

        // open the access login in append mode or write mode depending on the settings
        accessLog = fs.createWriteStream(logFile, { flags: (config.accessLog.append)?"a":"w", autoClose:true});
    }
    
    // get the config if the error log is enabled
    if(config.errorLog.enabled){
        // build the error log file path
        let logFile = `${config.errorLog.filePath}.log`;
        // are we archiving the error old log
        if(config.errorLog.archive && fs.existsSync(logPath)){
            // archive it
            fs.renameSync(logFile, `${config.errorLog.filePath}.arc_${dStr}.log`);
        }

        // open the error login in append mode or write mode depending on the settings
        errorLog = fs.createWriteStream(logFile, { flags: (config.errorLog.append)?"a":"w", autoClose:true});
    }

    
    let Server = http.createServer(async (req, resp) =>{
        let ip = req.connection.remoteAddress;
        // if the access log is being used log this request
        if(accessLog){
            let date = new Date();
            let dStr = `${date.getFullYear()}${date.getMonth()+1}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;
            accessLog.write(`[${ip}_${dStr}] request to access ${req.url}\r\n`);
        }
        // hold if we have finished this request
        for(let key = pathHandlers.length-1; key >= 0; key--){
            let responded = false;
            // check the registered handlers backwards to the glovab of the server (static hosting) can be used
            if(req.url.match(pathHandlers[key].path)){
                await pathHandlers[key].handler(req).then((re) => {
                    // check if the status has been sent though otherwise assume it's a 200
                    if(typeof re.status === "undefined"){
                        re.status = 200;
                    }
                    // send the headers
                    resp.writeHead(re.status, re.headers);
                    // send the content
                    resp.write(re.body);
                    // close the connection
                    resp.end();
                    responded = true;
                }).catch((ex) => {
                    // an error occured send a 500 internal server error.
                    resp.writeHead(500, {"content-type":"text/html"});
                    // send the content
                    resp.write(`<!DOCTYPE>
                    <html>
                        <head>
                            <title>500 Internal server error</title>
                        </head>
                        <body>
                            <h1>500 Internal server error</h1>
                            ${ex}
                        </body>
                    </html>`);
                    // record the error in the error log
                    if(errorLog){
                        let date = new Date();
                        let dStr = `${date.getFullYear()}${date.getMonth()+1}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;
                        errorLog.write(`[${ip}_${dStr}] Error ${ex} at ${(new Error).stack.split('\n')[2]}\r\n`);
                    }
                    resp.end();
                    responded = true;
                });
            }
            if(responded){
                break;
            }
        }
    });

    /**
     * @private
     * @name WebServer.PluginAccess.setHandler
     * @param {RegExp} reg regular expreassion to match
     * @param {Promise<success,fail>} handler the handler function for this web server
     */
    let setHandler = (reg, handler) => {
        // check the paramerts are correct
        if( !(reg instanceof RegExp) ){
            throw "[incorrect_params] WebServer.PluginAccess.setHandler arguments incorrect my supply a RegExp and a function that returns a Promise";
        }
        if( typeof handler !== "function"  ){
            throw "[incorrect_params] WebServer.PluginAccess.setHandler arguments incorrect my supply a RegExp and a function that returns a Promise";
        }
        // push the handler
        pathHandlers.push({
            "path":reg,
            "handler":handler
        });
    };

    /**
     * @public 
     * @name WebServer.PluginAccess.setHandler
     * @param {RegExp} reg regular expreassion to match
     * @param {Promise<success,fail>} handler the handler function for this web server
     */
    this.setHandler = (reg, handler) => {
        return setHandler(reg, handler);
    }

    /**
     * @private 
     * @name WebServer.PluginAccess.RegisterMenu
     * @description Allows a plugin to register an endpoint for the Web UI
     * @param {string} the url you want your menu link to point to.
     */
    let registerMenuLink = (pluginName, url) => {
        if( typeof url !== "string"){
            throw "[incorrect_param] WebServer.PluginAccess.registerMenuLink requires a url path"
        }
        if(typeof menuHandlers[pluginName] !== "undefined"){
            throw `Plugin '${pluginName}' already has a nav binding can only be called once`;
        }
        menuHandlers[pluginName] = url;
    }

    /**
     * @public 
     * @name WebServer.PluginAccess.RegisterMenu
     * @description Allows a plugin to register an endpoint for the Web UI
     * @param {string} the url you want your menu link to point to.
     */
    this.registerMenuLink = (pluginName, url) => {
        return registerMenuLink(pluginName, url);
    }

    /**
     * @private
     * @name WebServer.startServer
     * @description starts the server listening
     * @param {Number} port 
     */
    let startServer = (port) => {
        Server.listen(port)
    };

    /**
     * @public
     * @name WebServer.startServer
     * @description starts the server listening
     * @param {Number} port 
     */
    this.startServer = (port) => {
        startServer(port);
    }

    /**
     * @private
     * @name WebServer.exit
     * @description shut's down the server and closes the logs
     */
    let exit = () => {
        if(accessLog){ accessLog.end(); }
        if(errorLog){ accessLog.end(); }
        Server.close();
    }

    /**
     * @private
     * @name WebServer.exit
     * @description shut's down the server and closes the logs
     */
    this.exit = () => {
        exit();
    }

    // create the default (static server) handling
    setHandler(new RegExp(".*"), (request) => {
        return new Promise((resolve, reject) =>{
            // load the npm library mime-type
            let mine = mime = require('mime-types');

            // parse the user
            let urlParts = url.parse(request.url);
            // get the config path and url path requested
            let filePath = config.path+urlParts.pathname;

            // check if this is a directory if so default it to the index.html
            if(filePath.substr(filePath.length - 1) === "/"){
                filePath += "index.html";
            }

            // check the file exists
            if(fs.existsSync(filePath)){
                // read the file blocking and send it to the brwoser
                resolve({
                    "status":200, 
                    "headers":{"content-type":mine.lookup(filePath)},
                    "body":fs.readFileSync(filePath)
                }); 
            }else{
                // the file could not be found trigger a 404
                resolve({
                    "status":404, 
                    "headers":{"content-type":"text/html"},
                    "body":`<!DOCTYPE>
                        <html>
                            <head>
                                <title>404 File not found</title>
                            </head>
                            <body>
                                <h1>404 File not found.</h1>
                            </body>
                        </html>`
                });
            }
        });
    });

    // create the handler to get the menu
    setHandler(new RegExp("\/tbm_menu\.json"), request => {
        return new Promise((resolve, reject) => {
            try{
                resolve({
                    status:200,
                    headers:{"content-type":"application/json"},
                    body:JSON.stringify(menuHandlers, null, 4)
                });
            }catch(err){
                reject(err)
            }
        });
    })
}

module.exports = WebServer;
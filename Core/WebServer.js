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

    let loggedInSession;

    // store the registered menu handlers
    let menuHandlers = {};

    // get the config if the access log is enabled
    if(config.accessLog.enabled){
        // build the access log file path
        let logFile = `${config.accessLog.filePath}.log`;
        // are we archiving the access old log
        if(config.accessLog.archive && fs.existsSync(config.accessLog.archivePath)){
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
        if(config.errorLog.archive && fs.existsSync(config.errorLog.archivePath)){
            // archive it
            fs.renameSync(logFile, `${config.errorLog.filePath}.arc_${dStr}.log`);
        }

        // open the error login in append mode or write mode depending on the settings
        errorLog = fs.createWriteStream(logFile, { flags: (config.errorLog.append)?"a":"w", autoClose:true});
    }

    let defaultAccessControlHeaders = { 
        "Access-Control-Allow-Headers": "Content-Type, *",
        "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
        "Access-Control-Expose-Headers": "Set-Cookie, *",
        "Access-Control-Allow-Credentials": "true",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    };

    function extend(target) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function (source) {
            for (var prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    }
    
    
    let Server = http.createServer(async (req, resp) =>{
        let ip = req.connection.remoteAddress;
        let accessControlHeaders = extend(defaultAccessControlHeaders, {"Access-Control-Allow-Origin": (req.headers.origin)?req.headers.origin:req.headers.host});
        if(req.method === "OPTIONS"){
            // send the headers
            resp.writeHead(200, accessControlHeaders);
            // send the content
            resp.write("");
            // close the connection
            resp.end();
            responded = true;
            return;
        }
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
                    
                    // check of the handler wants to ignore login if not check loggin
                    if(typeof re.overrideLogin === "undefined" || !re.overrideLogin){
                        let cookies = {};
                        let parsed = false;
                        if(typeof req.headers.cookie !== "undefined"){
                            let cookiesRaw = req.headers.cookie.split(";");
                            cookiesRaw.forEach(element => {
                                let parts = element.split("=");
                                cookies[parts[0]] = parts[1];
                            });
                            parse = true;
                        }
                        if(!parsed && loggedInSession !== cookies.sess){
                            resp.writeHead(403, {"content-type":"text/html"});
                            // send the content
                            resp.write(`<!DOCTYPE>
                            <html>
                                <head>
                                    <title>403 Forbidden</title>
                                </head>
                                <body>
                                    <h1>403 Forbidden</h1>
                                    <hr />
                                    <div>You don't have access to this resource.</div>
                                </body>
                            </html>`);
                            resp.end();
                            responded = true;
                        }
                    }
                    if(!responded){
                        // send the headers
                        resp.writeHead(re.status, extend(re.headers, accessControlHeaders));
                        // send the content
                        resp.write(re.body);
                        // close the connection
                        resp.end();
                        responded = true;
                    }
                }).catch((ex) => {
                    let trace = ex.stack;
                    console.warn(`Error 500 '${ex}': ${trace}`);
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
                            <hr />
                            <pre>${trace}</pre>
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
            // parse the user
            let urlParts = url.parse(request.url);
            // get the config path and url path requested
            let filePath = config.directory + urlParts.path;

            // check if this is a directory if so default it to the index.html
 
            // if it's a directory add index.html to the path
            if(filePath.substr(filePath.length - 1) === "/"){
                console.log("changing to index");
                filePath += "index.html";
            }

            // check the file exists
            if(fs.existsSync(filePath)){
                // read the file blocking and send it to the brwoser
                resolve({
                    "status":200, 
                    "headers":{"content-type":require('mime-types').lookup(filePath)},
                    "overrideLogin":true,
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

    // create a handler to check the login
    /**
     * @param {RegExp} pattern what address to match for this
     */
    setHandler(new RegExp("\/tbm_login\.json"), req => {
        return new Promise((resolve, reject) => {
            if(req.method == "POST"){
                req.setEncoding('utf8');
                req.on('data', (body) => {
                    let data = JSON.parse(body);
                    if(data.username === config.access.admin.username && data.password === config.access.admin.password){
                        const uuidv5 = require('uuid/v5');
                        loggedInSession = uuidv5(req.headers.host.split(":")[0], uuidv5.DNS);
                        let d = new Date();
                        d.setMinutes(d.getMinutes()+30);
                        resolve({
                            status:200,
                            headers:{"content-type":"application/json", "Set-Cookie":`sess=${loggedInSession};Expires=${d};Path=/;`},
                            overrideLogin:true,
                            body:JSON.stringify({"Login":"success"}, null, 4)
                        });
                    }else{
                        resolve({
                            status:200,
                            headers:{"content-type":"application/json"},
                            overrideLogin:true,
                            body:JSON.stringify({"Login":"invalid"}, null, 4)
                        });
                    }
                });
            }else{
                resolve({
                    status:200,
                    headers:{"content-type":"application/json"},
                    overrideLogin:true,
                    body:JSON.stringify({"Login":"invalid"}, null, 4)
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
    });

    setHandler(new RegExp("\/tbm_checklogin\.json"), request => {
        return new Promise((resolve, reject) => {
            try{
                resolve({
                    status:200,
                    headers:{"content-type":"application/json"},
                    overrideLogin:true,
                    body:JSON.stringify({"state":loggedInSession? "yes":"no"}, null, 4)
                });
            }catch(err){
                reject(err)
            }
        });
    });
}

module.exports = WebServer;
function WebServer(config){
    let http = require('http');
    let url = require('url');
    let fs = require('fs');

    let pathHandlers = [];

    let accessLog = false;
    let errorLog = false;

    let date = new Date();
    let dStr = `${date.getFullYear()}${date.getMonth()+1}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;

    if(config.accessLog.enabled){
        let logFile = `${config.accessLog.filePath}.log`;
        if(config.accessLog.archive && fs.existsSync(logPath)){
            console.log(`archived access log ${logFile} to ${config.accessLog.filePath}.arc_${dStr}.log`);
            fs.renameSync(logFile, `${config.accessLog.filePath}.arc_${dStr}.log`);
        }

        console.log(`opened access log file ${logFile}`);
        accessLog = fs.createWriteStream(logFile, { flags: (config.accessLog.append)?"a":"w", autoClose:true});
    }
    
    if(config.errorLog.enabled){
        let logFile = `${config.errorLog.filePath}.log`;
        if(config.errorLog.archive && fs.existsSync(logPath)){
            console.log(`archived error log ${logFile} to ${config.errorLog.filePath}.arc_${dStr}.log`);
            fs.renameSync(logFile, `${config.errorLog.filePath}.arc_${dStr}.log`);
        }

        console.log(`opened access log file ${logFile}`);
        errorLog = fs.createWriteStream(logFile, { flags: (config.errorLog.append)?"a":"w", autoClose:true});
    }

    let Server = http.createServer(async (req, resp) =>{
        let timeStr = `[${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}] `;
        let ip = req.connection.remoteAddress;
        if(accessLog){
            accessLog.write(`[${ip}_${timeStr}] request to access ${req.url}\r\n`);
        }
        var finished = false;
        for(let key = pathHandlers.length-1; key >= 0; key--){
            if(req.url.match(pathHandlers[key].path)){
                await pathHandlers[key].handler(req).then((re) => {
                    if(typeof re.status === "undefined"){
                        re.status = 200;
                    }
                    resp.writeHead(re.status, re.headers);
                    resp.write(re.body);
                    resp.end();
                    finished = true;
                }).catch((ex) => {
                    resp.writeHead(500, {"content-type":"text/html"});
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
                    if(errorLog){
                        errorLog.write(`[${ip}_${timeStr}] Error at ${(new Error).stack.split('\n')[2]}\r\n`);
                    }
                    resp.end();
                    finished = true;
                });
            }
        }
    });

    let setHandler = (reg, handler) => {
        if( !(reg instanceof RegExp) ){
            throw "[incorrect_params] WebServer.setHandler arguments incorrect my supply a RegExp and a function that returns a Promise";
        }
        if( typeof handler !== "function"  ){
            throw "[incorrect_params] WebServer.setHandler arguments incorrect my supply a RegExp and a function that returns a Promise";
        }
        pathHandlers.push({
            "path":reg,
            "handler":handler
        });
    };

    this.setHandler = (reg, handler) => {
        setHandler(reg, handler);
    }

    let startServer = (port) => {
        Server.listen(port)
    };

    this.startServer = (port) => {
        startServer(port);
    }

    let exit = () => {
        if(accessLog){ accessLog.end(); }
        if(errorLog){ accessLog.end(); }
        Server.close();
    }

    this.exit = () => {
        exit();
    }

    this.setHandler(new RegExp(".*"), (request) => {
        return new Promise((resolve, reject) =>{
            let mine = mime = require('mime-types');
            let urlParts = url.parse(request.url);
            let filePath = config.path+urlParts.pathname;

            if(filePath.substr(filePath.length - 1) === "/"){
                filePath += "index.html";
            }

            if(fs.existsSync(filePath)){
                resolve({
                    "status":200, 
                    "headers":{"content-type":mine.lookup(filePath)},
                    "body":fs.readFileSync(filePath)
                }); 
            }else{
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
}

module.exports = WebServer;
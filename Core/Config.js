function Config(path){
    let fs = require('fs');
    let config;

    if(typeof path === "undefined"){
        path = "./config.json";
    }

    if(!fs.existsSync(path)){
        throw `Unable to locate config file '${path}'`;
    }

    let configContent = fs.readFileSync(path);
    config = JSON.parse(configContent);

    let get = (name, defaultValue) =>{
        if(typeof config[name] === "undefined"){
            return defaultValue;
        }
        return config[name];
    }

    this.get = (name, defaultValue) => {
        return get(name, defaultValue);
    }
}

module.exports = Config;
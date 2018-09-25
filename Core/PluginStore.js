function PluginStore(path){
    let fs = require('fs');

    if(typeof path === "undefined"){
        path = "stores";
    }

    if(!fs.existsSync(path)){
        fs.mkdirSync(path);
    }

    function PluginStore(appName){
        let store = {};

        let filePath = `${path}/${appName}.json`;
        if(fs.existsSync(filePath)){
            let fc = fs.readFileSync(filePath);
            store = JSON.parse(fc);
        }else{
            fs.writeFileSync(filePath, JSON.stringify(store, null, 4));
        }

        let SaveUpdate = () => {
            fs.writeFileSync(filePath, JSON.stringify(store, null, 4));
        }

        let set = (name, value) => {
            store[name] = value;
            SaveUpdate();
        };

        let get = (name, defaultValue) => {
            if(typeof store[name] === "undefined"){
                return defaultValue; 
            }
            return store[name];
        };

        this.set = (name, value) => {
            set(name, value);
        }

        this.get = (name, defaultValue) => {
            get(name, defaultValue);
        }
    }

    this.getApplicationStore = (appName) => {
        return new PluginStore(appName);
    }

}

module.exports = PluginStore
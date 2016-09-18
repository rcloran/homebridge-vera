var Service, Characteristic, Accessory, uuid;

var Veraconfig      = {};
var debug           = require("debug")('VeraLink');
var request         = require("then-request");
var hashing         = require("create-hash");

module.exports = function (homebridge)
{
    if(typeof homebridge !== "undefined")
    {
        Service         = homebridge.hap.Service;
        Characteristic  = homebridge.hap.Characteristic;
        Accessory       = homebridge.hap.Accessory;
        uuid            = homebridge.hap.uuid;
        console.log("VeraLink initializing");
        homebridge.registerPlatform("homebridge-veralink", "Vera", VeraLinkPlatform);
    }
};

function VeraLinkPlatform(log, config)
{
    var Veraconfig  = loadconfig();
    this.log        = log;
    this.rooms      = {};
    this.HAPNode     = {'request':request, 'uuid':uuid, 'Accessory':Accessory, 'Service':Service, 'Characteristic':Characteristic, 'debug':debug, 'hashing':hashing, 'return': true};

    defaults = {'bridged': true,'includesensor': false, 'ignorerooms': [], 'ignoredevices': [], 'securitypoll': 2000};

    Veraconfig = merge_options(defaults, Veraconfig);
    Veraconfig = merge_options(Veraconfig,config);

    if(typeof config.veraIP === "undefined")
    {
        console.log("\033[31m No configuration found, please write your configuration on .homebridge/config.json \033[0m");
        console.log("\033[31m or add your configuration file to "+home+"/.veralink/config.js \033[0m");
        process.exit();
    }

    this.functions   = require('./lib/functions.js')(this.HAPNode,Veraconfig);
    this.verainfo = null;
}

VeraLinkPlatform.prototype = {
    getVeraInfo: function()
    {
        debug("getVeraInfo()")
        if (this.verainfo) return Promise.resolve(this.verainfo);
        return this.functions.getVeraInfo(Veraconfig.veraIP).then(function(res) {
            this.verainfo = res;
            return res;
        })
    },
    accessories: function(callback)
    {
        var that = this;
        this.getVeraInfo().done(function(verainfo) {
            var foundAccessories = [];
            devices = that.functions.processall(verainfo);
            devices.forEach(function(device)
            {
                foundAccessories.push(that.createAccessory(device, that));
            });
            callback(foundAccessories);
        })
    },
    createAccessory: function(device,platform) {
        device.getServices = function() {
            return this.services;
        };
        device.platform 	= platform;
        device.name		= device.displayName;
        device.model		= "VeraDevice";
        device.manufacturer     = "IlCato";
        device.serialNumber	= "<unknown>";
        return device;
    }
};

function loadconfig()
{
    var fs = require('fs');
    home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    try {
        fs.accessSync(home+'/.veralink', fs.F_OK);

        try {
            fs.accessSync(home+'/.veralink/config.js', fs.F_OK);
            return require('./config.js');
        } catch(e) {
            return {};
        }
    } catch (e) {
        try {
            fs.mkdirSync(home+'/.veralink');
            return {};
        } catch(e) {
            if ( e.code != 'EEXIST' ) throw e;
        }
    }
}

function merge_options(obj1,obj2)
{
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

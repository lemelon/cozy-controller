fs = require 'fs'

## Global variables
conf = {}
configFile = '/etc/cozy/controller.json'

###
    Read configuration file
        * Use default configuration if file doesn't exist
        * Return error if configuration file is not a correct json
###
readFile = (callback) ->
    if fs.existsSync configFile
        try
            unless process.env.NODE_ENV is 'test'
                data = require configFile
            else
                data = fs.readFileSync configFile, 'utf8'
                data = JSON.parse(data)
            callback null, data
        catch
            callback null, {}
    else
        callback null, {}

###
    Initialize configuration
        * Use configuration store in configuration file or default configuration
        * conf : Current configuration
###
module.exports.init = (callback) ->
    readFile (err, data) ->
        if err?
            callback err
        else
            conf =
                npm_registry :   data.npm_registry or false
                npm_strict_ssl : data.npm_strict_ssl or false
                dir_app_log :    data.dir_app_log or '/usr/local/var/log/cozy'
                dir_app_bin :    data.dir_app_bin or '/usr/local/cozy/apps'
                dir_app_data :   data.dir_app_data or '/usr/local/var/cozy'
                file_token :     data.file_token or '/etc/cozy/stack.token'
                bind_ip_proxy:   data.bind_ip_proxy or '0.0.0.0'
                display_bind:    data.bind_ip_proxy?
            conf.file_stack =    data.file_stack or conf.dir_app_bin + '/stack.json'
            if process.env.BIND_IP_PROXY
                conf.bind_ip_proxy = process.env.BIND_IP_PROXY
            if data.env?
                conf.env =
                    global:         data.env.global or false
                    "data-system":  data.env['data-system'] or false
                    home:           data.env.home or false
                    proxy:          data.env.proxy or false
            callback()

###
    Return configuration for <arg>
###
module.exports.get = (arg) ->
    return conf[arg]
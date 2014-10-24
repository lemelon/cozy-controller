// Generated by CoffeeScript 1.8.0
var americano, application, autostart, controller, init;

americano = require('americano');

init = require('./server/initialize');

autostart = require('./server/lib/autostart');

controller = require('./server/lib/controller');

application = module.exports = function(callback) {
  var displayError, err, exitProcess, options, stopProcess;
  if ((process.env.USER != null) && process.env.USER !== 'root') {
    err = "Are you sure, you are root ?";
    console.log(err);
    if (callback != null) {
      return callback(err);
    }
  } else {
    options = {
      name: 'controller',
      port: process.env.PORT || 9002,
      host: process.env.HOST || "127.0.0.1",
      root: __dirname
    };
    if (process.env.NODE_ENV == null) {
      process.env.NODE_ENV = "development";
    }
    init.init((function(_this) {
      return function(err) {
        if (err != null) {
          console.log("Error during configuration initialization : ");
          console.log(err);
          if (callback != null) {
            callback(err);
          }
        }
        return autostart.start(function(err) {
          if (err == null) {
            console.log("### START SERVER ###");
            return americano.start(options, function(app, server) {
              server.once('close', function(code) {
                console.log("Server close with code " + code);
                return controller.stopAll((function(_this) {
                  return function() {
                    process.removeListener('uncaughtException', displayError);
                    process.removeListener('exit', exitProcess);
                    process.removeListener('SIGTERM', stopProcess);
                    return console.log("All application are stopped");
                  };
                })(this));
              });
              if (callback != null) {
                return callback(app, server);
              }
            });
          } else {
            console.log("Error during autostart : ");
            console.log(err);
            if (callback != null) {
              return callback(err);
            }
          }
        });
      };
    })(this));
    displayError = function(err) {
      console.log("WARNING : ");
      console.log(err);
      return console.log(err.stack);
    };
    exitProcess = function(code) {
      console.log("Process exit with code " + code);
      return controller.stopAll((function(_this) {
        return function() {
          process.removeListener('uncaughtException', displayError);
          process.removeListener('SIGTERM', stopProcess);
          return process.exit(code);
        };
      })(this));
    };
    stopProcess = function() {
      console.log("Process is stopped");
      return controller.stopAll((function(_this) {
        return function() {
          return process.exit(code);
        };
      })(this));
    };
    process.on('uncaughtException', displayError);
    process.once('exit', exitProcess);
    return process.once('SIGTERM', stopProcess);
  }
};

if (!module.parent) {
  application();
}

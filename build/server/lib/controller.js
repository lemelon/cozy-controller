// Generated by CoffeeScript 1.8.0
var App, config, drones, fs, installDependencies, log, npm, path, repo, running, spawner, stack, stackApps, startApp, stopApp, stopApps, type, updateApp, user,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

fs = require('fs');

spawner = require('./spawner');

npm = require('./npm');

repo = require('./repo');

user = require('./user');

stack = require('./stack');

config = require('./conf').get;

log = require('printit')();

type = [];

type['git'] = require('./git');

App = require('./app').App;

path = require('path');

drones = [];

running = [];

stackApps = ['home', 'data-system', 'proxy'];


/*
    Start Application <app>
        * check if application isn't started
        * start process
        * add application in drones and running
 */

startApp = function(app, callback) {
  if (running[app.name] != null) {
    return callback('Application already exists');
  } else {
    return spawner.start(app, function(err, result) {
      var _ref;
      if (err != null) {
        return callback(err);
      } else if (result == null) {
        err = new Error('Unknown error from Spawner.');
        return callback(err);
      } else {
        drones[app.name] = result.pkg;
        running[app.name] = result;
        console.log(app.name);
        if (_ref = app.name, __indexOf.call(stackApps, _ref) >= 0) {
          stack.addApp(app, function() {});
        }
        return callback(null, result);
      }
    });
  }
};


/*
    Stop all applications in tab <apps>
 */

stopApps = function(apps, callback) {
  var app;
  if (apps.length > 0) {
    app = apps.pop();
    return stopApp(app, function() {
      log.info("" + app + ":stop application");
      return stopApps(apps, callback);
    });
  } else {
    drones = [];
    return callback();
  }
};


/*
    Stop application <name>
        * Stop process
        * Catch event exit (or error)
        * Delete application in running
 */

stopApp = function(name, callback) {
  var err, monitor, onErr, onStop;
  monitor = running[name].monitor;
  onStop = function() {
    monitor.removeListener('error', onErr);
    monitor.removeListener('exit', onStop);
    monitor.removeListener('stop', onStop);
    return callback(null, name);
  };
  onErr = function(err) {
    log.error(err);
    monitor.removeListener('stop', onStop);
    monitor.removeListener('exit', onStop);
    return callback(err, name);
  };
  monitor.once('stop', onStop);
  monitor.once('exit', onStop);
  monitor.once('error', onErr);
  try {
    delete running[name];
    return monitor.stop();
  } catch (_error) {
    err = _error;
    log.error(err);
    return onErr(err);
  }
};


/*
    Update application <name>
        * Recover drone
        * Git pull
        * install new dependencies
 */

updateApp = function(name, callback) {
  var app;
  app = drones[name];
  log.info("" + name + ":update application");
  return type[app.repository.type].update(app, function(err) {
    if (err != null) {
      return callback(err);
    } else {
      return installDependencies(app, 2, function(err) {
        if (err != null) {
          return callback(err);
        } else {
          return callback(null, app);
        }
      });
    }
  });
};


/*
    Install depdencies of application <app> <test> times
        * Try to install dependencies (npm install)
        * If installation return an error, try again (if <test> isnt 0)
 */

installDependencies = function(app, test, callback) {
  test = test - 1;
  return npm.install(app, function(err) {
    if ((err != null) && test === 0) {
      return callback(err);
    } else if (err != null) {
      log.info('TRY AGAIN ...');
      return installDependencies(app, test, callback);
    } else {
      return callback();
    }
  });
};


/*
    Remove application <name> from running
        Userfull if application exit with timeout
 */

module.exports.removeRunningApp = function(name) {
  return delete running[name];
};


/*
    Install applicaton defineed by <manifest>
        * Check if application isn't already installed
        * Create user cozy-<name> if necessary
        * Create application repo for source code
        * Clone source in repo
        * Install dependencies
        * If application is a stack application, add application in stack.json
        * Start process
 */

module.exports.install = function(manifest, callback) {
  var app;
  app = new App(manifest);
  app = app.app;
  if ((drones[app.name] != null) || fs.existsSync(app.dir)) {
    log.info("" + app.name + ":already installed");
    log.info("" + app.name + ":start application");
    return startApp(app, callback);
  } else {
    drones[app.name] = app;
    return user.create(app, function(err) {
      if (err != null) {
        return callback(err);
      } else {
        log.info("" + app.name + ":git clone");
        return type[app.repository.type].init(app, function(err) {
          if (err != null) {
            return callback(err);
          } else {
            log.info("" + app.name + ":npm install");
            return installDependencies(app, 2, function(err) {
              if (err != null) {
                return callback(err);
              } else {
                log.info("" + app.name + ":start application");
                return startApp(app, callback);
              }
            });
          }
        });
      }
    });
  }
};


/*
    Start aplication defined by <manifest>
        * Check if application is installed
        * Start process
 */

module.exports.start = function(manifest, callback) {
  var app, err;
  app = new App(manifest);
  app = app.app;
  if ((drones[app.name] != null) || fs.existsSync(app.dir)) {
    drones[app.name] = app;
    return startApp(app, function(err, result) {
      if (err != null) {
        return callback(err);
      } else {
        return callback(null, result);
      }
    });
  } else {
    err = new Error('Cannot start an application not installed');
    return callback(err);
  }
};


/*
    Stop application <name>
        * Check if application is started
        * Stop process
 */

module.exports.stop = function(name, callback) {
  var err;
  if (running[name] != null) {
    return stopApp(name, callback);
  } else {
    err = new Error('Cannot stop an application not started');
    return callback(err);
  }
};


/*
    Stop all started applications
        Usefull when controller is stopped
 */

module.exports.stopAll = function(callback) {
  return stopApps(Object.keys(running), callback);
};


/*
    Uninstall application <name>
        * Check if application is installed
        * Stop application if appplication is started
        * Remove from stack.json if application is a stack application
        * Remove code source
        * Delete application from drones (and running if necessary)
 */

module.exports.uninstall = function(name, callback) {
  var app, err, userDir;
  if (drones[name] != null) {
    if (running[name] != null) {
      log.info("" + name + ":stop application");
      running[name].monitor.stop();
      delete running[name];
    }
    if (__indexOf.call(stackApps, name) >= 0) {
      log.info("" + name + ":remove from stack.json");
      stack.removeApp(name, function(err) {
        return log.error(err);
      });
    }
    app = drones[name];
    return repo["delete"](app, function(err) {
      log.info("" + name + ":delete directory");
      if (drones[name] != null) {
        delete drones[name];
      }
      if (err != null) {
        return callback(err);
      } else {
        return callback(null, name);
      }
    });
  } else {
    userDir = path.join(config('dir_source'), name);
    if (fs.existsSync(userDir)) {
      app = {
        name: name,
        dir: userDir,
        logFile: config('dir_log') + name + ".log",
        backup: config('dir_log') + name + ".log-backup"
      };
      return repo["delete"](app, function(err) {
        log.info("" + name + ":delete directory");
        if (drones[name] != null) {
          delete drones[name];
        }
        if (err != null) {
          return callback(err);
        } else {
          return callback(null, name);
        }
      });
    } else {
      err = new Error('Cannot uninstall an application not installed');
      return callback(err);
    }
  }
};


/*
    Update an application <name>
        * Check if application is installed
        * Stop application if application is started
        * Update code source (git pull / npm install)
        * Restart application if it was started
 */

module.exports.update = function(name, callback) {
  var err;
  if (drones[name] != null) {
    if (running[name] != null) {
      log.info("" + name + ":stop application");
      return stopApp(name, function(err) {
        return updateApp(name, function(err) {
          var app;
          if (err != null) {
            return callback(err);
          } else {
            app = drones[name];
            return startApp(app, function(err, result) {
              log.info("" + name + ":start application");
              return callback(err, result);
            });
          }
        });
      });
    } else {
      return updateApp(name, callback);
    }
  } else {
    err = new Error('Application is not installed');
    log.error(err);
    return callback(err);
  }
};


/*
    Add application <app> in drone
        Usefull for autostart
 */

module.exports.addDrone = function(app, callback) {
  drones[app.name] = app;
  return callback();
};


/*
    Return all applications (started or stopped)
 */

module.exports.all = function(callback) {
  return callback(null, drones);
};


/*
    Return all started applications
 */

module.exports.running = function(callback) {
  var apps, key, _i, _len, _ref;
  apps = {};
  _ref = Object.keys(running);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    key = _ref[_i];
    apps[key] = drones[key];
  }
  return callback(null, apps);
};

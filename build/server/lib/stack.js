// Generated by CoffeeScript 1.10.0
var Client, addDatabase, addInDatabase, config, controllerAdded, dsHost, dsPort, fs, log, path, permission;

fs = require('fs');

path = require('path');

Client = require('request-json-light').JsonClient;

log = require('printit')();

config = require('./conf').get;

permission = require('../middlewares/token');

controllerAdded = false;

dsHost = process.env.DATASYSTEM_HOST || 'localhost';

dsPort = process.env.DATASYSTEM_PORT || 9101;


/*
    addDatabse:
        * test: number of tests (if app is data-system)
        * app: app to add to database
    Add <app> in database. Try <test> time if app is data-system
    (data-system should be started to add it in database)
 */

addDatabase = function(attempt, app) {
  if (attempt > 0) {
    return addInDatabase(app, function(err) {
      if (app.name === 'data-system' && (err != null)) {
        return setTimeout(function() {
          return addDatabase(attempt - 1, app);
        }, 1000);
      }
    });
  }
};


/*
    addInDatase:
        * app: application to add to database
    Add <app> in database:
        * Check if application isn't alread store in database
        * If it the case, update it (keep lastVersion added by home)
        * If not, add new document for this application
 */

addInDatabase = function(app, callback) {
  var clientDS;
  clientDS = new Client("http://" + dsHost + ":" + dsPort);
  clientDS.setBasicAuth('home', permission.get());
  return clientDS.post('/request/stackapplication/all/', {}, function(err, res, body) {
    var appli, application, i, len, requestPath;
    application = null;
    if (err == null) {
      for (i = 0, len = body.length; i < len; i++) {
        appli = body[i];
        appli = appli.value;
        if (appli.name === app.name) {
          if (application != null) {
            requestPath = "data/" + appli._id + "/";
            clientDS.del("data/" + appli._id + "/", function(err, res, body) {
              if (err != null) {
                return log.warn(err);
              }
            });
          } else {
            application = appli;
          }
        }
      }
    }
    if (application !== null) {
      if (application.version === app.version && (application.git != null)) {
        return callback();
      } else {
        app.lastVersion = application.lastVersion;
        requestPath = "data/" + application._id + "/";
        return clientDS.put(requestPath, app, function(err, res, body) {
          if (err == null) {
            if (app.name === 'controller') {
              controllerAdded = true;
            }
          }
          return callback(err);
        });
      }
    } else {
      return clientDS.post('/data/', app, function(err, res, body) {
        if ((err == null) && ((body != null ? body.error : void 0) != null)) {
          err = body.error;
        }
        if (err == null) {
          if (app.name === 'controller') {
            controllerAdded = true;
          }
        }
        return callback(err);
      });
    }
  });
};


/*
    Add application <app> in stack.json
        * read stack file
        * parse date (in json)
        * add application <app>
        * write stack file with new stack applications
 */

module.exports.addApp = function(app, callback) {
  var manifest;
  fs.readFile(config('file_stack'), 'utf8', function(err, data) {
    var error;
    try {
      data = JSON.parse(data);
    } catch (error) {
      data = {};
    }
    data[app.name] = app;
    return fs.open(config('file_stack'), 'w', function(err, fd) {
      var length;
      length = data.length;
      data = JSON.stringify(data, null, 2);
      return fs.write(fd, data, 0, length, 0, callback);
    });
  });
  manifest = path.join(config('dir_app_bin'), app.name, 'package.json');
  return fs.readFile(manifest, function(err, data) {
    var appli, controller, controllerPath;
    if (err) {
      return log.warn('Error when read package.json');
    } else {
      data = JSON.parse(data);
      appli = {
        name: app.name,
        version: data.version,
        git: app.repository.url,
        docType: "StackApplication"
      };
      addDatabase(5, appli);
      if (!controllerAdded) {
        controllerPath = path.join(__dirname, '..', '..', '..', 'package.json');
        if (fs.existsSync(controllerPath)) {
          data = require(controllerPath);
          controller = {
            docType: "StackApplication",
            name: "controller",
            version: data.version,
            git: "https://github.com/cozy/cozy-controller.git"
          };
          return addInDatabase(controller, function(err) {
            if (err != null) {
              return log.warn(err);
            }
          });
        }
      }
    }
  });
};


/*
    Remove application <name> from stack.json
        * read stack file
        * parse date (in json)
        * remove application <name>
        * write stack file with new stack applications
 */

module.exports.removeApp = function(name, callback) {
  return fs.readFile(config('file_stack'), 'utf8', function(err, data) {
    var error;
    try {
      data = JSON.parse(data);
    } catch (error) {
      data = {};
    }
    delete data[name];
    return fs.open(config('file_stack'), 'w', function(err, fd) {
      return fs.write(fd, JSON.stringify(data), 0, data.length, 0, callback);
    });
  });
};

// Generated by CoffeeScript 1.10.0
var config, controller, exec, forever, fs, log, path, token;

forever = require('forever-monitor');

fs = require('fs');

path = require('path');

exec = require('child_process').exec;

token = require('../middlewares/token');

controller = require('../lib/controller');

log = require('printit')();

config = require('../lib/conf').get;


/*
    Start application <app> with forever-monitor and carapace
 */

module.exports.start = function(app, callback) {
  var env, environment, fd, foreverOptions, i, j, key, len, len1, pwd, ref, ref1, ref2, ref3, ref4, result;
  result = {};
  if (this.appliProcess) {
    this.appliProcess.stop();
  }
  if ((ref = app.name) === "home" || ref === "proxy" || ref === "data-system") {
    pwd = token.get();
  } else {
    pwd = app.password;
  }
  env = {
    NAME: app.name,
    TOKEN: pwd,
    USER: app.user,
    USERNAME: app.user,
    HOME: app.dir,
    NODE_ENV: process.env.NODE_ENV,
    APPLICATION_PERSISTENT_DIRECTORY: app.folder
  };
  if (process.env.DB_NAME != null) {
    env.DB_NAME = process.env.DB_NAME;
  }
  if ((ref1 = config("env")) != null ? ref1[app.name] : void 0) {
    environment = config("env")[app.name];
    ref2 = Object.keys(environment);
    for (i = 0, len = ref2.length; i < len; i++) {
      key = ref2[i];
      env[key] = environment[key];
    }
  }
  if ((ref3 = config("env")) != null ? ref3.global : void 0) {
    environment = config("env").global;
    ref4 = Object.keys(environment);
    for (j = 0, len1 = ref4.length; j < len1; j++) {
      key = ref4[j];
      env[key] = environment[key];
    }
  }
  foreverOptions = {
    fork: true,
    silent: true,
    max: 5,
    stdio: ['ipc', 'pipe', 'pipe'],
    cwd: app.dir,
    logFile: app.logFile,
    outFile: app.logFile,
    errFile: app.errFile,
    env: env,
    killTree: true,
    killTTL: 0,
    command: 'node'
  };
  if (fs.existsSync(app.logFile)) {
    app.backup = app.logFile + "-backup";
    if (fs.existsSync(app.backup)) {
      fs.unlinkSync(app.backup);
    }
    fs.renameSync(app.logFile, app.backup);
  }
  if (fs.existsSync(app.errFile)) {
    app.backupErr = app.errFile + "-backup";
    if (fs.existsSync(app.backupErr)) {
      fs.unlinkSync(app.backupErr);
    }
    fs.renameSync(app.errFile, app.backupErr);
  }
  fd = [];
  fd[0] = fs.openSync(app.logFile, 'w');
  fd[1] = fs.openSync(app.errFile, 'w');
  foreverOptions.options = ['--plugin', 'net', '--plugin', 'setgid', '--setgid', app.user, '--plugin', 'setgroups', '--setgroups', app.user, '--plugin', 'setuid', '--setuid', app.user];
  if (app.name === "proxy") {
    foreverOptions.options = foreverOptions.options.concat(['--bind_ip', config('bind_ip_proxy')]);
  }
  return fs.readFile(app.dir + "/package.json", 'utf8', function(err, data) {
    var appliProcess, carapaceBin, onError, onExit, onPort, onRestart, onStart, onStderr, onTimeout, ref5, responded, server, start, timeout;
    data = JSON.parse(data);
    server = app.server;
    if (((ref5 = data.scripts) != null ? ref5.start : void 0) != null) {
      start = data.scripts.start.split(' ');
      app.startScript = path.join(app.dir, start[1]);
      if (start[0] === "coffee") {
        foreverOptions.options = foreverOptions.options.concat(['--plugin', 'coffee']);
      }
    }
    if ((start == null) && server.slice(server.lastIndexOf("."), server.length) === ".coffee") {
      foreverOptions.options = foreverOptions.options.concat(['--plugin', 'coffee']);
    }
    fs.stat(app.startScript, function(err, stats) {
      if (err != null) {
        return callback(err);
      }
    });
    foreverOptions.options.push(app.startScript);
    carapaceBin = path.join(require.resolve('cozy-controller-carapace'), '..', '..', 'bin', 'carapace');
    appliProcess = new forever.Monitor(carapaceBin, foreverOptions);
    responded = false;
    onExit = function() {
      app.backup = app.logFile + "-backup";
      app.backupErr = app.errFile + "-backup";
      fs.rename(app.logFile, app.backup);
      fs.rename(app.errFile, app.backupErr);
      appliProcess.removeListener('error', onError);
      clearTimeout(timeout);
      log.error('Callback on Exit');
      if (callback) {
        return callback(new Error(app.name + " CANT START"));
      } else {
        log.error(app.name + " HAS FAILLED TOO MUCH");
        return setTimeout((function() {
          return appliProcess.exit(1);
        }), 1);
      }
    };
    onError = function(err) {
      if (!responded) {
        err = err.toString();
        responded = true;
        callback(err);
        appliProcess.removeListener('exit', onExit);
        appliProcess.removeListener('message', onPort);
        return clearTimeout(timeout);
      }
    };
    onStart = function(monitor, data) {
      return result = {
        monitor: appliProcess,
        process: monitor.child,
        data: data,
        pid: monitor.childData.pid,
        pkg: app,
        fd: fd
      };
    };
    onRestart = function() {
      return log.info(app.name + ":restart");
    };
    onTimeout = function() {
      appliProcess.removeListener('exit', onExit);
      appliProcess.stop();
      controller.removeRunningApp(app.name);
      err = new Error('Error spawning application');
      log.error('callback timeout');
      return callback(err);
    };
    onPort = function(info) {
      if (!responded && (info != null ? info.event : void 0) === 'port') {
        responded = true;
        result.port = info.data.port;
        callback(null, result);
        appliProcess.removeListener('exit', onExit);
        appliProcess.removeListener('error', onError);
        appliProcess.removeListener('message', onPort);
        return clearTimeout(timeout);
      }
    };
    onStderr = function(err) {
      err = err.toString();
      return fs.appendFile(app.errFile, err, function(err) {
        if (err != null) {
          return console.log(err);
        }
      });
    };
    appliProcess.start();
    timeout = setTimeout(onTimeout, 8000000);
    appliProcess.once('exit', onExit);
    appliProcess.once('error', onError);
    appliProcess.once('start', onStart);
    appliProcess.on('restart', onRestart);
    appliProcess.on('message', onPort);
    return appliProcess.on('stderr', onStderr);
  });
};

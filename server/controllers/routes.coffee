applications = require './applications'
disk = require './disk'
index = require './index'
token = require '../middlewares/token'

module.exports =

    '': get: index.index

    'apps/:name/start':
        post: [
            token.check
            applications.start
        ]

    'apps/:name/install':
        post: [
            token.check
            applications.install
        ]

    "apps/:name/change-branch/:branch":
        post: [
            token.check
            applications.changeBranch
        ]

    # Old route
    'drones/:name/start':
        post: [
            token.check
            applications.install
        ]

    'apps/:name/stop':
        post: [
            token.check
            applications.stop
        ]

    # Old route
    'drones/:name/stop':
        post: [
            token.check
            applications.stop
        ]

    'apps/:name/update':
        post: [
            token.check
            applications.update
        ]

    'apps/update-stack':
        post: [
            token.check
            applications.updateStack
        ]

    'apps/restart-controller':
        post: [
            token.check
            applications.restartController
        ]

    # Old route
    'drones/:name/light-update':
        post: [
            token.check
            applications.update
        ]

    'apps/:name/uninstall':
        post: [
            token.check
            applications.uninstall
        ]

    # Old route
    'drones/:name/clean':
        post: [
            token.check
            applications.uninstall
        ]

    'apps/all':
        get: [
            token.check
            applications.all
        ]

    'apps/started':
        get: [
            token.check
            applications.running
        ]

    # Old routes
    'drones/running':
        get: [
            token.check
            applications.running
        ]

    'diskinfo':
        get: [
            token.check
            disk.info
        ]

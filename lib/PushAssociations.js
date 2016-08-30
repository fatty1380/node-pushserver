var mongoose = require('mongoose');
var config = require('./Config');
var _ = require('lodash');

// Init
var PushAssociation;

var initialize = _.once(function () {
    var db = mongoose.connect(config.get('mongodbUrl'));
    mongoose.connection.on('error', errorHandler);

    var pushAssociationSchema = new db.Schema({
        user: {
            type: 'String',
            required: true
        },
        type: {
            type: 'String',
            required: true,
            enum: ['ios', 'android'],
            lowercase: true
        },
        token: {
            type: 'String',
            required: true
        }
    });

    // I must ensure uniqueness accross the two properties because two users can have the same token (ex: in apn, 1 token === 1 device)
    pushAssociationSchema.index({ user: 1, token: 1 }, { unique: true });

    PushAssociation = db.model('PushAssociation', pushAssociationSchema);

    return module.exports;
});

var add = function (user, deviceType, token) {
    var pushItem = new PushAssociation({user: user, type: deviceType, token: token});
    pushItem.save();
};

var updateTokens = function (fromToArray) {
    fromToArray.forEach(function (tokenUpdate) {
        PushAssociation.findOneAndUpdate({token: tokenUpdate.from}, {token: tokenUpdate.to}, function (err) {
            if (err) console.error(err);
        });
    });
};

var getAll = function (callback) {
    var wrappedCallback = outputFilterWrapper(callback);

    PushAssociation.find(wrappedCallback);
};

var getForUser = function (user, callback) {
    var wrappedCallback = outputFilterWrapper(callback);

    PushAssociation.find({user: user}, wrappedCallback);
};

var getForUsers = function (users, callback) {
    var wrappedCallback = outputFilterWrapper(callback);

    var userIDs = _.map(users, function (u) {

        if (_.isString(u)) {
            return new mongoose.Types.ObjectId(u);
        }
        if (_.isObject(u)) {
            return u;
        }
    });


    console.log({ func: 'getForUsers', users: userIDs }, 'Looking up users');

    return PushAssociation.where('user')
        .in(userIDs)
        .exec(wrappedCallback);
};

var removeForUser = function (user) {
    
    console.log({ func: 'removeForUser', users: userIDs }, 'NOT Removing users');
    return;

    PushAssociation.remove({user: user}, function (err) {
        if (err) console.dir(err);
    });
};

var removeDevice = function (token) {
    
    console.log({ func: 'removeDevice', users: userIDs }, 'NOT Removing users');
    return;

    PushAssociation.remove({token: token}, function (err) {
        if (err) console.log(err);
    });
};

var removeDevices = function (tokens) {
    
    console.log({ func: 'removeDevices', users: userIDs }, 'NOT Removing users');
    return;

    PushAssociation.remove({token: {$in: tokens}}, function (err) {
        if (err) console.log(err);
    });
};

var outputFilterWrapper = function (callback) {
    return function (err, pushItems) {
        if (err) return callback(err, null);

        var items = _.map(pushItems, function (pushItem) {
            return _.pick(pushItem, ['user', 'type', 'token'])
        });

        return callback(null, items);
    }
};

var initWrapper = function (object) {
    return _.transform(object, function (newObject, func, funcName) {
        if(!_.isFunction(func)) return newObject[funcName] = func;

        newObject[funcName] = function () {
            if (_.isUndefined(PushAssociation)) {
                initialize();
            }

            return func.apply(null, arguments);
        };
    });
};

var errorHandler = function(error) {
    console.error('ERROR: ' + error);
};

module.exports = initWrapper({
    add: add,
    updateTokens: updateTokens,
    getAll: getAll,
    getForUser: getForUser,
    getForUsers: getForUsers,
    removeForUser: removeForUser,
    removeDevice: removeDevice,
    removeDevices: removeDevices
});
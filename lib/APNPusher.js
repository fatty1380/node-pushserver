/**
 * Created with JetBrains WebStorm.
 * User: smile
 * Date: 13/06/13
 * Time: 16:42
 * To change this template use File | Settings | File Templates.
 */


var config = require('./Config');
var _ = require('lodash');
var apn = require('apn');
var pushAssociations = require('./PushAssociations')

var push = function (tokens, payload) {
    console.log('Pushing Payload: %s', JSON.stringify(payload, null, 2));
    apnSender().pushNotification(payload, tokens);
};

var buildPayload = function (options) {
    console.log('Creating Payload: %s', JSON.stringify(options, null, 2));
    var notif = new apn.Notification(options.payload);

    console.log('Base Notification: %s', JSON.stringify(notif, null, 2));

    notif.expiry = options.expiry || 0;
    notif.alert = options.alert;
    notif.badge = options.badge;
    notif.sound = options.sound;

    console.log('Mod Notification: %s', JSON.stringify(notif, null, 2));
    debugger;
    // More options:
    notif.contentAvailable = !!options.contentAvailable;

    console.log('Last Notification: %s', JSON.stringify(notif, null, 2));
    return notif;
};

var apnSender = _.once(function () {
    var apnConnection = new apn.Connection(config.get('apn').connection);

    apnConnection.on('transmissionError', onTransmissionError);
    initAppFeedback();

    return apnConnection;
});

var onTransmissionError = function (errorCode, notification, recipient) {
    console.error('Error while pushing to APN: ' + errorCode);
    // Invalid token => remove device
    if (errorCode === 8 && recipient.token) {
        var token = recipient.token.toString('hex').toUpperCase();

        console.log('Invalid token: (NOT) removing device ' + token);
        // pushAssociations.removeDevice(token);
    }
};

var onFeedback = function (deviceInfos) {
    console.log('Feedback service, number of devices to remove: ' + deviceInfos.length);

    if (deviceInfos.length > 0) {
        pushAssociations.removeDevices(deviceInfos.map(function (deviceInfo) {
            return deviceInfo.device.token.toString('hex');
        }));
    }
};

var initAppFeedback = function () {
    var apnFeedback = new apn.Feedback(config.get('apn').feedback)

    apnFeedback.on('feedback', onFeedback);
};

module.exports = {
    push: push,
    buildPayload: buildPayload
}

const _ = require('lodash');
const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account');

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: "https://speak-up-android.firebaseio.com"
});

const MAXIMUM_MATCHING_TIME = 10000;

let userResponse = new Map();
let appTopics = null;

let db = firebaseAdmin.database();
let userRef = db.ref("users");
let topicRef = db.ref("topics");

function matchingUsers () {
    userRef.orderByChild('status').equalTo('matching').on('value', (snapshot) => {

        let data = snapshot.val();
        if (!data)
            return;

        let userIds = Object.keys(data);

        for (let i = 0; i < userIds.length; i++) {
            for (let j = i + 1; j < userIds.length; j++) {

                let user1 = data[userIds[i]];
                user1.id = userIds[i];

                let user2 = data[userIds[j]];
                user2.id = userIds[j];

                let matched = checkIsMatchable(user1, user2);

                if (matched) {
                    let selectedTopic = chooseTopicRandomly(matched);
                    sendMatchingResponse(user1, user2, selectedTopic);
                    return;
                }
            }
        }
    })
}

function checkIsMatchable(user1, user2) {
    if (user1.level != user2.level)
        return false;

    let commonInterestedTopic = _.intersection(user1.interestedTopics, user2.interestedTopics);
    if (commonInterestedTopic.length == 0)
        return false;

    return commonInterestedTopic;
}

function chooseTopicRandomly(topics) {
    let random = Math.floor(Math.random() * 10 ) % topics.length;
    let selectTopic = appTopics[topics[random]];

    return selectTopic[Math.floor(Math.random() * 100 ) % selectTopic.length];
}

function sendMatchingResponse(user, partner, topic) {
    let userRes = userResponse.get(user.id);
    let partnerRes = userResponse.get(partner.id);

    if (!userRes || !partnerRes)
        return;

    if (userRes.headersSent || partnerRes.headersSent)
        return;

    userRes.status(200).json(
        {
            partner: partner,
            selectedTopic: topic,
            makeCall: true,
        }
    );

    partnerRes.status(200).json(
        {
            partner: user,
            selectedTopic: topic,
            makeCall: false
        }
    );

    userRef.child(user.id)
        .update({status: 'matched'});

    userRef.child(partner.id)
        .update({status: 'matched'});

    userResponse.set(user.id, null);
    userResponse.set(partner.id, null);
}

new Promise((resolve, reject) => {
    topicRef.once('value', (snapshot) => {
        appTopics = snapshot.val();
        resolve();
    });
}).then(matchingUsers);

module.exports.matchUsers = (req, res, next) => {

    let userId = req.params.userId;
    userResponse.set(userId, res);

    userRef.child(userId)
        .update({
            status: 'matching'
        });

    setTimeout(() => {
        let response = userResponse.get(userId);
        if (response && !response.headersSent) {
            userRef.child(userId).update({status: 'online'});
            response.status(400).json({message: 'Partner not found'});
            userResponse.set(userId, null);
        }
    }, MAXIMUM_MATCHING_TIME);
};
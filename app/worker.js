import 'dotenv/config'
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();

import * as photoModel from './photo_model.js';

import ZipStream from 'zip-stream';
import { Storage } from '@google-cloud/storage'
import fetch from 'node-fetch';

import {getDatabase} from "firebase-admin/database";
import {applicationDefault, initializeApp} from "firebase-admin/app";

let photoFiles = []
let zip = new ZipStream()

initializeApp({
    credential: applicationDefault(),
    databaseURL: 'https://dmii-2024-default-rtdb.europe-west1.firebasedatabase.app'
});

function listenForMessages(subscriptionNameOrId, timeout) {
    // References an existing subscription; if you are unsure if the
    // subscription will exist, try the optimisticSubscribe sample.
    const subscription = pubsub.subscription(subscriptionNameOrId);

    // Create an event handler to handle messages
    let messageCount = 0;
    const messageHandler = async message => {
        console.log(`Received message ${message.id}:`);
        console.log(`\tData: ${message.data}`);
        messageCount += 1;

        const messageData = JSON.parse(message.data);

        const now = Date.now();
        const fileName = 'jeankenny/' + messageData.tags + '_' + now + '.zip'

        let queueItems = 0

        // const bdd = new BDD()

        // bdd.instance.uploadSuccessful = false

        const database = getDatabase();

        let storage = new Storage();

        const file = await storage
            .bucket('dmii2024bucket')
            .file(fileName);

        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/zip',
                cacheControl: 'private',
                resumable: false
            },
        });

        zip.pipe(stream)

        // get photos
        photoModel
            .getFlickrPhotos(messageData.tags, messageData.tagmode)
            .then(async photos => {
                photos.forEach(photo => {
                    photoFiles.push(photo);
                })

                async function addNextFile() {
                    let elem = photoFiles.shift()

                    if (!elem) {
                        return
                    }

                    queueItems += 1

                    let responseBuffer

                    try {
                        responseBuffer = Buffer.from(await (await fetch(elem.media.b)).arrayBuffer());
                    } catch (error) {
                        console.error(error)
                    }

                    console.log('adding ' + elem.title + ' to zip ' + fileName)

                    if (!responseBuffer) {
                        if (photoFiles.length > 0) {
                            await addNextFile()
                        } else {
                            message.ack()
                        }
                    }

                    await zip.entry(responseBuffer, {name: elem.title + '.jpg'}, async err => {
                        if (err) {
                            console.log(err)
                        }

                        if (photoFiles.length > 0) {
                            await addNextFile()
                        } else {
                            console.log("zip " + fileName + " created with :", queueItems, " items")
                            zip.finalize()
                            // bdd.instance.uploadSuccessful = true
                            const filesRef = database.ref('/jeankenny/').child(now.toString());
                            await filesRef.set({
                                file: {
                                    path: fileName
                                },
                            });

                            message.ack()
                        }
                    })
                }

                await addNextFile()
            })
            .catch(error => {
                console.error(error);
            });


    };

    // Listen for new messages until timeout is hit
    subscription.on('message', messageHandler);

    // Wait a while for the subscription to run. (Part of the sample only.)
    /* setTimeout(() => {
        subscription.removeListener('message', messageHandler);
        console.log(`${messageCount} message(s) received.`);
    }, timeout * 1000); */
}

function main(
    subscriptionNameOrId = 'dmii2-3'
) {
    listenForMessages(subscriptionNameOrId);
}

main();
import * as formValidator from './form_validator.js';
import * as photoModel from './photo_model.js';

import 'dotenv/config'
import {PubSub} from "@google-cloud/pubsub";
import {Storage} from "@google-cloud/storage";

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBMRbEW18ViCFCVdLS6lyoMfx0Z9ZGgW9U",
  authDomain: "dmii-2024.firebaseapp.com",
  projectId: "dmii-2024",
  storageBucket: "dmii-2024.appspot.com",
  messagingSenderId: "871398193932",
  appId: "1:871398193932:web:4b9e45e35be93526b96729"
};

const firebaseApp = initializeApp(firebaseConfig, 'firebase')

const auth = getAuth(firebaseApp);
auth.languageCode = 'fr';

function route(app) {
  app.get('/', async (req, res) => {
    const tags = req.query.tags;
    const tagmode = req.query.tagmode;

    const ejsLocalVariables = {
      tagsParameter: tags || '',
      tagmodeParameter: tagmode || '',
      photos: [],
      searchResults: false,
      invalidParameters: false,
    };

    // if no input params are passed in then render the view with out querying the api
    if (!tags && !tagmode) {
      return res.render('index', ejsLocalVariables);
    }

    // validate query parameters
    if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
      ejsLocalVariables.invalidParameters = true;
      return res.render('index', ejsLocalVariables);
    }

    // get photos from flickr public feed api
    return photoModel
        .getFlickrPhotos(tags, tagmode)
        .then(photos => {
          ejsLocalVariables.photos = photos;
          ejsLocalVariables.searchResults = true;
          return res.render('index', ejsLocalVariables);
        })
        .catch(error => {
          return res.status(500).send({error});
        });
  });

  app.get('/login', (req, res) => {
    return res.render('login')
  })

  app.post('/zip', async (req, res) => {
    const tags = req.query.tags
    const tagmode = req.query.tagmode;

    await createZipQueue(tags, tagmode)

    return res.redirect('/')
  });

  app.get('/download', async (req, res) => {
    let filePath = req.query.filepath;

    if (filePath) {
      let storage = new Storage();

      const options = {
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60
      };

      let archiveUrl = await storage
          .bucket('dmii2024bucket')
          .file(filePath)
          .getSignedUrl(options);

      return res.redirect(archiveUrl);
    }
  })
}

async function createZipQueue(tags, tagmode) {
  // load json content of file

  const pubsub = new PubSub();

  // Creates a new topic
  // const [topic] = await pubsub.createTopic('dmii2-3');
  // console.log(`Topic ${topic.name} created.`);

  // get existing topic
  const topic = await pubsub.topic('dmii2-3');

  // Creates a subscription on that new topic
  // const [subscription] = await topic.createSubscription('dmii2-3');

  // get existing subscription
  const subscription = await topic.subscription('dmii2-3');

  // Receive callbacks for new messages on the subscription
  subscription.on('message', (message) => {
    console.log('Received message:', message.data.toString());
    process.exit(0);
  });

  // Receive callbacks for errors on the subscription
  subscription.on('error', (error) => {
    console.error('Received error:', error);
    process.exit(1);
  });

  // Send a message to the topic
  await topic.publishMessage({
    data: Buffer.from(
        JSON.stringify({
          'tags': tags,
          'tagmode': tagmode,
        })
    ),
  });
}

export {route};

import express from 'express';
import favicon from 'serve-favicon';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import bodyParser from 'body-parser';

import './worker.js'

const app = express();
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// public assets
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use('/coverage', express.static(path.join(__dirname, '..', 'coverage')));

// ejs for view templates
app.engine('.html', ejs.__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(async (req, res, next) => {
    let ip = req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        null;

    let allowedToAccess = await TokenBucket.updateBucket(ip)

    if (allowedToAccess) {
        next()
    } else {
        return res.status(429).send({error: 'Too many request'});
    }
})

// load route
import * as routes from './route.js';
import TokenBucket from "./TokenBucket.js";
routes.route(app);

// server
const port = process.env.PORT || 3000;
app.server = app.listen(port);
console.log(`listening on port ${port}`);

export {app};

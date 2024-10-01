FROM node:alpine
COPY . /app
WORKDIR /app
CMD npm install; node app/server.js
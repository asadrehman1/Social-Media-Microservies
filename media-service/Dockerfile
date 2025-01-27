FROM node:20-alpine

WORKDIR /usr/app/src

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3003

CMD [ "node", "src/server.js" ]
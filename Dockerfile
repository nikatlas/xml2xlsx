FROM node:8-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json .

RUN npm install --production
RUN npm install nats --save

COPY . .

CMD ["npm", "start"]  # Execute moleculer-runner
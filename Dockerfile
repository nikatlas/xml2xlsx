FROM node:current-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY . .

EXPOSE 3000
EXPOSE 3001
EXPOSE 3030
EXPOSE 3031

CMD ["npm", "start"]

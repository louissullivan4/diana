FROM node:24.10.0-bullseye-slim

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3001

RUN npm run build

CMD ["npm", "run", "start"]
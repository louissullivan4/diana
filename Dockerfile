FROM node:24.10.0-bookworm-slim AS build
WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

FROM gcr.io/distroless/nodejs24-debian13
WORKDIR /usr/app
ENV NODE_ENV=production

COPY --from=build /usr/app/node_modules ./node_modules
COPY --from=build /usr/app/dist ./dist

EXPOSE 3001
CMD ["dist/discord/bot.js"]

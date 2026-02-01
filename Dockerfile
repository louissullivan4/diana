FROM node:24.10.0-bookworm-slim AS build
WORKDIR /usr/app

# Install backend dependencies
COPY package*.json ./
RUN npm install

# Build backend
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Build dashboard
COPY dashboard ./dashboard
RUN cd dashboard && npm install && npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

FROM node:24.10.0-bookworm-slim
WORKDIR /usr/app
ENV NODE_ENV=production

COPY --from=build /usr/app/node_modules ./node_modules
COPY --from=build /usr/app/dist ./dist
COPY --from=build /usr/app/dashboard/dist ./dashboard/dist

# Create data directory for plugin config persistence
RUN mkdir -p /usr/app/data && chmod 755 /usr/app/data

# Railway sets PORT env var dynamically
EXPOSE ${PORT:-3000}
CMD ["node", "dist/core/index.js"]

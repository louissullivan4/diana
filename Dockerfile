FROM node:24.10.0-bookworm-slim AS build
WORKDIR /usr/app

# Install workspace dependencies
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY dashboard ./dashboard
RUN npm ci --workspaces --include-workspace-root

# Build workspaces
COPY tsconfig.json tsconfig.base.json ./
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

FROM node:24.10.0-bookworm-slim
WORKDIR /usr/app
ENV NODE_ENV=production

COPY --from=build /usr/app/node_modules ./node_modules
COPY --from=build /usr/app/apps/server/dist ./apps/server/dist
COPY --from=build /usr/app/packages ./packages
COPY --from=build /usr/app/dashboard/dist ./dashboard/dist

# Create data directory for plugin config persistence
RUN mkdir -p /usr/app/data && chmod 755 /usr/app/data

# Railway sets PORT env var dynamically
EXPOSE ${PORT:-3000}
CMD ["node", "--dns-result-order=ipv4first", "apps/server/dist/index.js"]

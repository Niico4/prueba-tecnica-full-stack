
FROM node:24-bookworm-slim AS build

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json

RUN pnpm --filter @valorant/web... install --frozen-lockfile

COPY apps/web apps/web

ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @valorant/web build

FROM node:24-alpine

RUN npm install -g sirv-cli@3.0.0

WORKDIR /app

COPY --from=build /app/apps/web/dist ./dist

USER node

EXPOSE 4173

CMD ["sirv", "dist", "--single", "--host", "0.0.0.0", "--port", "4173"]

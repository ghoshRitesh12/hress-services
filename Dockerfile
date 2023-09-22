FROM node:18-alpine

# setting working directory
WORKDIR /app

LABEL org.opencontainers.image.description="Hress Trading Corporation Services"

RUN npm i pnpm -g

# copying config for better reuse of layers
COPY --chown=node:node package.json .

RUN pnpm i

COPY --chown=node:node . .

# setting envs
ENV NODE_ENV=production
ENV PORT=7100

# exposed port
EXPOSE 7100

# start server
CMD [ "node", "src/server.js" ]

# exit
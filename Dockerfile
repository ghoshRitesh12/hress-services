FROM node:20-alpine

# setting working directory
WORKDIR /app

LABEL org.opencontainers.image.description="Hress Trading Corporation Services"

# copying config for better reuse of layers
COPY package.json .

RUN npm i

COPY . .

# setting envs
ENV NODE_ENV=production
ENV PORT=7100

# exposed port
EXPOSE 7100

# start server
CMD [ "node", "src/server.js" ]

# exit
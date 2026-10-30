FROM node:24-alpine
WORKDIR /app
COPY engine.js layout.js style.css app.js index.html team.js ./
COPY assets/ ./assets/
COPY multiplayer/server/ ./multiplayer/server/
COPY multiplayer/migrations/ ./multiplayer/migrations/
COPY multiplayer/index.html multiplayer/app.js multiplayer/style.css ./multiplayer/
RUN mkdir /data && chown node:node /data
USER node
ENV BUS_HOST=0.0.0.0 PORT=8080 BUS_DB=/data/rooms.sqlite
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "multiplayer/server/node.mjs"]

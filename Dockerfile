FROM node:22-alpine

WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY data ./data
RUN mkdir -p /app/storage && chown -R node:node /app

USER node
ENV PORT=3000 DATA_DIR=/app/storage
EXPOSE 3000
VOLUME ["/app/storage"]
CMD ["node", "server.js"]

FROM node:22-slim
WORKDIR /app
COPY package.json index.js ./
COPY src ./src
USER node
CMD ["node", "index.js"]

FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY schema.sql ./schema.sql
COPY src ./src
EXPOSE 3000
CMD ["node","src/server.js"]

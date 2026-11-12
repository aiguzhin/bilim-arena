# Bilim Arena на своём сервере (ps.kz). Сборка: docker compose up -d --build
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]

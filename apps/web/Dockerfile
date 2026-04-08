FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

RUN npm run build:web

EXPOSE 5173

CMD ["npm", "run", "dev:web"]

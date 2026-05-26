FROM node:20-alpine AS base
WORKDIR /usr/src/app

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "start:dev"]

FROM base AS production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["node", "dist/main"]
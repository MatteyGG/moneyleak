FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN apk add --no-cache openssl3

RUN npm install

RUN npx prisma generate

COPY . .

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
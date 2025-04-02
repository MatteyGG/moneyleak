FROM node:22-alpine

WORKDIR /app

RUN sed -i 's/https/http/' /etc/apk/repositories

RUN apk add curl

COPY package*.json ./
COPY prisma ./prisma

RUN apk add --no-cache openssl3

RUN npm install

RUN npx prisma generate

COPY . .

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
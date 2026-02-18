FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY wallet-service/package*.json ./
RUN npm install
COPY wallet-service/ .
RUN npx prisma generate
EXPOSE 3007
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]

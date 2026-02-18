FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY search-service/package*.json ./
RUN npm install
COPY search-service/ .
RUN npx prisma generate
EXPOSE 3004
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]

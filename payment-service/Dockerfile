FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY proto/ /app/proto/
COPY payment-service/package*.json ./
RUN npm install
COPY payment-service/ .
RUN npx prisma generate
EXPOSE 3006 50056
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

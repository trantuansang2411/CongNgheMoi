FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copy shared
COPY shared/ /app/shared/
RUN cd /app/shared && npm install

COPY proto/ /app/proto/

# Copy service
COPY auth-service/package*.json ./
RUN npm install

COPY auth-service/ .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001 50051

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

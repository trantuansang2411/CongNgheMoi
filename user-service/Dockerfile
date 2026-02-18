FROM node:20-alpine

WORKDIR /app

COPY shared/ /app/shared/
RUN cd /app/shared && npm install

COPY proto/ /app/proto/

COPY user-service/package*.json ./
RUN npm install

COPY user-service/ .

EXPOSE 3002 50052

CMD ["npm", "start"]

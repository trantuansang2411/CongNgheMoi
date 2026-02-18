FROM node:20-alpine

WORKDIR /app

COPY shared/ /app/shared/
RUN cd /app/shared && npm install

COPY proto/ /app/proto/

COPY course-service/package*.json ./
RUN npm install

COPY course-service/ .

EXPOSE 3003 50053

CMD ["npm", "start"]

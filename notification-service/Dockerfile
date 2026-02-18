FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY notification-service/package*.json ./
RUN npm install
COPY notification-service/ .
EXPOSE 3011
CMD ["npm", "start"]

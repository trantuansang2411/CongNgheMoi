FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY proto/ /app/proto/
COPY admin-service/package*.json ./
RUN npm install
COPY admin-service/ .
EXPOSE 3012
CMD ["npm", "start"]

FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY proto/ /app/proto/
COPY learning-service/package*.json ./
RUN npm install
COPY learning-service/ .
EXPOSE 3008 50058
CMD ["npm", "start"]

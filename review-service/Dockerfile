FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY proto/ /app/proto/
COPY review-service/package*.json ./
RUN npm install
COPY review-service/ .
EXPOSE 3010
CMD ["npm", "start"]

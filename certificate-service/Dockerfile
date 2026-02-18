FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY certificate-service/package*.json ./
RUN npm install
COPY certificate-service/ .
EXPOSE 3009
CMD ["npm", "start"]

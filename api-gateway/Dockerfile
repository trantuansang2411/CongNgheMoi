FROM node:20-alpine
WORKDIR /app
COPY shared/ /app/shared/
RUN cd /app/shared && npm install
COPY api-gateway/package*.json ./
RUN npm install
COPY api-gateway/ .
EXPOSE 3000
CMD ["npm", "start"]

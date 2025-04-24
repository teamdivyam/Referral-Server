FROM node:18-slim 

WORKDIR /app

COPY package*.json ./

# Ensure dependencies are installed inside the container

RUN npm ci --production
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "./src/server.js"]

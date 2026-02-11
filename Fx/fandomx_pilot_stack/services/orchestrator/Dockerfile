FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --silent
COPY src ./src
EXPOSE 8090
CMD ["npm","start"]

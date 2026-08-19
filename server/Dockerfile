# Default just prevents the image from being unusable if run standalone.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "tsx", "gateway/index.ts"]
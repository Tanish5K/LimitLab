# Default just prevents the image from being unusable if run standalone.
FROM node:20-alpine AS build
WORKDIR /app
COPY Dashboard/package*.json ./
RUN npm install
COPY Dashboard/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
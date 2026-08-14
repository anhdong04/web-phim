FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=7000
ENV WEB_PHIM_VERSION=6.2.7
EXPOSE 7000
CMD ["node", "addon_v627.js"]

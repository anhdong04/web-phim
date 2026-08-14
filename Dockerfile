FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=7000
ENV WEB_PHIM_VERSION=5.3.0
EXPOSE 7000
CMD ["node", "addon_v530.js"]

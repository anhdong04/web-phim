FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache ffmpeg && npm install --omit=dev
COPY . .
ENV PORT=7000
ENV WEB_PHIM_VERSION=6.3.4
EXPOSE 7000
CMD ["node", "addon_v634.js"]

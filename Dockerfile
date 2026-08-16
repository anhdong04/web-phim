FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache ffmpeg chromium nss freetype harfbuzz ca-certificates ttf-freefont && npm install --omit=dev
COPY . .
ENV PORT=7000
ENV WEB_PHIM_VERSION=6.5.6
ENV HHKUNGFU_CHROMIUM_PATH=/usr/bin/chromium-browser
EXPOSE 7000
CMD ["node", "addon_v641.js"]

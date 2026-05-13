FROM node:20-alpine

# Minimal dependencies - @napi-rs/image uses prebuilt binaries
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["npm", "start"]

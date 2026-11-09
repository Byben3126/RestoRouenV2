# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx nest build


# Stage 2: Runtime
FROM gcr.io/distroless/nodejs24-debian13

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
# Images du pass Apple Wallet ; les certificats sont montés au lancement (assets/wallet/certs)
COPY --from=builder /app/assets/wallet/images ./assets/wallet/images


CMD ["dist/main.js"]

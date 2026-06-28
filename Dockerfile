# Stage 1: Build
FROM node:24-alpine AS builder

ARG SERVICE_NAME

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx nest build ${SERVICE_NAME}


# Stage 2: Runtime
FROM gcr.io/distroless/nodejs24-debian13
ARG SERVICE_NAME

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/${SERVICE_NAME}/ ./dist
COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/libs ./libs


CMD ["dist/main.js"]
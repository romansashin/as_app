# Stage 1: Client Build
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Server Setup
FROM node:20-alpine
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy server files
COPY server/package*.json ./
RUN npm install --production

COPY server/ ./

# Copy client dist from builder stage
COPY --from=client-builder /app/client/dist ./../client/dist

EXPOSE 4000

ENV NODE_ENV=production

CMD ["npm", "start"]


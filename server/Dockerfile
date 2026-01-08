# Stage 1: Client Build
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY ../client/package*.json ./
RUN npm install
COPY ../client/ ./
RUN npm run build

# Stage 2: Server Setup
FROM node:20-alpine
WORKDIR /app

# Copy server files
COPY package*.json ./
RUN npm install --production

COPY . .

# Copy client dist from builder stage
COPY --from=client-builder /app/client/dist ./../client/dist

EXPOSE 4000

CMD ["npm", "start"]

FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server-render.js ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/static ./static
COPY --from=builder /app/start-render.sh ./
COPY --from=builder /app/index.html ./

# Install only production dependencies
RUN npm ci --only=production

# Create directories for uploads and temp files
RUN mkdir -p uploads temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Ensure script is executable
RUN chmod +x ./start-render.sh

# Expose port
EXPOSE 5000

# Start the server
CMD ["./start-render.sh"]
FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Build and serve the documentation site
CMD ["sh", "-c", "npm run build && npm run serve"]

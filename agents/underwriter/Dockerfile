FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source including regulations file
COPY . .

# IMPORTANT: regulations.txt must be in this directory
# It will be uploaded to Files API at startup

# Cloud Run uses PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]

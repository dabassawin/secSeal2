FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy all files
COPY . .

# Expose port for frontend dev server
EXPOSE 3001

# Run the dev server and explicitly expose host for Docker networking
CMD ["npm", "run", "web", "--", "--host"]

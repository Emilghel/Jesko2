FROM node:20

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy Python requirements and install Python dependencies
COPY pyproject.toml ./
RUN pip3 install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV PYTHON_ENV=production
ENV PORT=10000

EXPOSE 10000

# Start the server
CMD ["npm", "run", "dev"]
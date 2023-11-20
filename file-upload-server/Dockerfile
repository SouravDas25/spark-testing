# Use an official Node.js runtime as a base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

COPY test.js ./
COPY srv ./srv

# Install the app dependencies
RUN npm install

# Copy all the source code to the working directory in the container
#COPY . .

# Expose the port the app runs on (adjust as needed)
EXPOSE 3000

# Define the command to run your Node.js server (replace 'app.js' with your entry file)
CMD ["node", "test.js"]
# Dockerfile for Bot_Noti_Strava
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Expose the port (default 8000)
EXPOSE 8000

CMD ["npm", "start"]

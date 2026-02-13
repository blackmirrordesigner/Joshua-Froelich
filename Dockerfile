# Cyrus Reigns Records - Website (Node.js serves static files + contact API)
FROM node:20-alpine

WORKDIR /app

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]

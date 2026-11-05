# ---------- Development ----------
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3020
CMD ["sh", "-c", "npx nest start --watch"]
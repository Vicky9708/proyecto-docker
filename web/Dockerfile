# Imagen personalizada del servidor web (Node.js)
FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Primero copiamos solo las dependencias (aprovecha la caché de Docker)
COPY package.json ./
RUN npm install --omit=dev

# Luego copiamos el resto del código
COPY . .

# Puerto en el que escucha la app
EXPOSE 3000

# Comando que arranca el servidor
CMD ["node", "server.js"]

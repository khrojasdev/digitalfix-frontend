# ETAPA 1: Construcción (Node.js)
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias limpiamente
COPY package*.json ./
RUN npm ci

# Copiar el código y compilar para producción
COPY . .
RUN npm run build --configuration=production

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados
# OJO: Verifica si tu carpeta dist se llama 'digitalfix-frontend/browser' o solo 'digitalfix-frontend'
COPY --from=builder /app/dist/digitalfix-frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
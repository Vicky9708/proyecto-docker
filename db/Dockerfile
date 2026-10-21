# Imagen personalizada de la base de datos
FROM mysql:8.0

# Base de datos que se crea al iniciar
ENV MYSQL_DATABASE=tienda

# Todo script que se copie a esta carpeta se ejecuta automáticamente
# la primera vez que arranca el contenedor
COPY script.sql /docker-entrypoint-initdb.d/

EXPOSE 3306

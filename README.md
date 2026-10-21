# Tienda Docker — Node.js + MySQL en contenedores

Aplicación web (Node.js/Express) y base de datos relacional (MySQL 8), cada una en su propio contenedor, orquestadas con Docker Compose.

## Estructura
```
proyecto-docker/
├── docker-compose.yml   # levanta los 2 contenedores, red y volumen
├── db/
│   ├── Dockerfile       # imagen tienda-mysql:1.0 (base mysql:8.0)
│   └── script.sql       # script de la base de datos (2 tablas relacionadas)
└── web/
    ├── Dockerfile       # imagen tienda-web:1.0 (base node:20-alpine)
    ├── package.json
    └── server.js        # servidor web + interfaz
```

## Cómo ejecutar
Requisito: Docker Desktop abierto ("Engine running").
```bash
docker compose up -d --build
```
Abrir: http://localhost:3000

| Ruta | Función |
|---|---|
| `/` | Información del contenedor e imágenes |
| `/registrar` | Formularios para guardar clientes y pedidos |
| `/datos` | Muestra lo almacenado en MySQL |

Detener: `docker compose down` (los datos se conservan en el volumen `datos_mysql`).
Borrar todo, incluso los datos: `docker compose down -v`.

## Modelo entidad-relación
`clientes (1) ───< (N) pedidos` mediante `pedidos.cliente_id → clientes.id`.
# proyecto-docker

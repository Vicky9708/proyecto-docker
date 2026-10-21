-- =====================================================
-- Script de base de datos - Actividad Contenerización
-- Motor: MySQL 8
-- Modelo entidad-relación: CLIENTES (1) ---< (N) PEDIDOS
-- Cada tabla tiene 7 columnas con diferentes tipos de datos
-- =====================================================

CREATE DATABASE IF NOT EXISTS tienda
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tienda;

-- Tabla principal (lado "1" de la relación)
CREATE TABLE IF NOT EXISTS clientes (
  id                INT            NOT NULL AUTO_INCREMENT,   -- entero
  nombre            VARCHAR(100)   NOT NULL,                  -- cadena
  email             VARCHAR(100)   NOT NULL UNIQUE,           -- cadena
  fecha_nacimiento  DATE           NOT NULL,                  -- fecha
  activo            BOOLEAN        NOT NULL DEFAULT TRUE,     -- booleano
  genero            CHAR(1)        NOT NULL,                  -- carácter (M/F/O)
  saldo             DECIMAL(10,2)  NOT NULL DEFAULT 0.00,     -- decimal
  PRIMARY KEY (id)
);

-- Tabla dependiente (lado "N" de la relación)
CREATE TABLE IF NOT EXISTS pedidos (
  id            INT            NOT NULL AUTO_INCREMENT,       -- entero
  cliente_id    INT            NOT NULL,                      -- entero (llave foránea)
  producto      VARCHAR(100)   NOT NULL,                      -- cadena
  cantidad      INT            NOT NULL,                      -- entero
  precio        DECIMAL(10,2)  NOT NULL,                      -- decimal
  fecha_pedido  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP, -- fecha y hora
  entregado     BOOLEAN        NOT NULL DEFAULT FALSE,        -- booleano
  PRIMARY KEY (id),
  CONSTRAINT fk_pedidos_clientes
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

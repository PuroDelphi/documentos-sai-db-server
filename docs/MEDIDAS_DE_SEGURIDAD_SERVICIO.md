# Medidas de Seguridad — Servicio de Sincronización (Supabase → Firebird)

## 1. Propósito
Este documento describe las medidas de seguridad implementadas en el servicio de sincronización de facturación automática, cuyo objetivo es transferir información operativa desde la plataforma en la nube hacia la base de datos local del cliente (SAI Open), de forma controlada, auditable y con protección de credenciales.

El enfoque principal es proteger:

- La **confidencialidad** de credenciales y configuración.
- La **integridad** de la información sincronizada.
- La **disponibilidad** del servicio y continuidad operativa.
- El **aislamiento multi‑cliente** mediante controles por fila (RLS).

---

## 2. Alcance
El servicio aplica a:

- Lectura y procesamiento de documentos aprobados en la plataforma.
- Inserción controlada de información en SAIOpen (encabezados, detalles y entidades relacionadas).
- Actualización de estados de sincronización del documento.

No aplica como:

- API pública para consulta o exploración de información del ERP.
- Mecanismo de integración bidireccional.

---

## 3. Arquitectura de seguridad (visión general)

### 3.1. Unidireccionalidad del flujo
- El flujo está diseñado para operar **en una sola vía**:

  **Plataforma (Supabase) → SAIOpen**.

- El servicio **no expone** un canal público para consultar información de SAIOpen desde el exterior.

**Beneficio de seguridad:**

- Reduce la superficie de ataque (evita endpoints públicos de consulta).
- Minimiza el riesgo de exfiltración directa desde el ERP.

### 3.2. Ejecución en el entorno del cliente
- El servicio se ejecuta en infraestructura del cliente, con conectividad controlada hacia la nube.
- La conectividad hacia SAIOpen se mantiene local (o dentro de la red controlada por el cliente).

---

## 4. Control de acceso a datos (RLS)

### 4.1. Seguridad por fila (Row Level Security)
La plataforma aplica **Row Level Security (RLS)** para asegurar que un usuario/instancia del servicio solo pueda acceder a la información que le corresponde.

Se implementa típicamente con:

- Restricción por `user_id` en tablas operativas (por ejemplo, documentos y configuración).
- Políticas que limitan operaciones por fila:
  - **SELECT**: acceso solo a filas del `user_id` autorizado.
  - **UPDATE**: actualización solo de filas del `user_id` autorizado.
  - **INSERT**: inserción restringida según reglas y propietario.

### 4.2. Filtrado de procesamiento
- El servicio procesa únicamente información vinculada al identificador de usuario configurado.

**Beneficio de seguridad:**

- Aislamiento entre clientes.
- Prevención de fugas de datos cruzadas.
- Control granular en caso de tokens o configuraciones incorrectas.

---

## 5. Protección de configuración y credenciales (cifrado en reposo)

### 5.1. Cifrado del archivo de entorno
- La configuración sensible del servicio (por ejemplo, parámetros de conexión, identificadores y claves) se gestiona mediante un archivo de entorno.
- Este archivo **no se distribuye en texto plano**. Se genera un archivo cifrado a partir del entorno.

**Esquema criptográfico:**

- Cifrado simétrico **AES‑256‑CBC**.

**Propiedades de seguridad:**

- El archivo distribuido está cifrado.
- Para iniciar el servicio se requiere una contraseña proporcionada por el operador autorizado.

### 5.2. Separación de secretos (doble control)
- Se maneja una segunda contraseña para proteger la configuración/caché local.

**Beneficio de seguridad:**

- “Defensa en profundidad”: el compromiso de una credencial no implica el compromiso total.
- Reduce el riesgo de exposición de parámetros sensibles almacenados localmente.

### 5.3. Prácticas recomendadas para manejo de contraseñas
- Las contraseñas deben almacenarse en un gestor seguro o bóveda.
- No deben compartirse por canales no cifrados.
- Deben rotarse cuando cambien responsables o ante sospecha de exposición.

---

## 6. Seguridad en transmisión (cifrado en tránsito)

### 6.1. Canal seguro hacia la nube
- La comunicación hacia la plataforma se realiza bajo **TLS/HTTPS**, protegiendo:
  - **Confidencialidad:** cifrado de la información en tránsito.
  - **Integridad:** protección contra manipulación y alteración.

### 6.2. Restricción de comunicaciones
- Se recomienda aplicar reglas de red para que el servidor del servicio tenga salida únicamente a:
  - Los dominios/servicios estrictamente necesarios.

---

## 7. Seguridad en la operación (Servicio de Windows)

### 7.1. Despliegue como servicio
El servicio se despliega como **Servicio de Windows**, permitiendo:

- Ejecución sin sesión interactiva.
- Inicio automático.
- Recuperación ante fallas.
- Aislamiento y control mediante permisos del sistema operativo.

### 7.2. Control de permisos
Se recomienda ejecutar el servicio bajo una cuenta con:

- Permisos mínimos necesarios.
- Acceso controlado a:
  - Directorio de instalación.
  - Archivos de configuración cifrados.
  - Carpeta de logs.

---

## 8. Protección del código (artefacto compilado y ofuscado)

- El servicio se distribuye como ejecutable compilado.
- El código queda **ofuscado/embebido**, dificultando:
  - Lectura directa de lógica.
  - Modificación casual.
  - Extracción simple de recursos.

**Nota:** esta protección complementa (no reemplaza) el cifrado y controles de acceso.

---

## 9. Integridad de datos en Firebird

### 9.1. Prevención de duplicidades
Antes de insertar documentos, el servicio valida que no se esté generando un duplicado bajo las reglas operativas definidas.

- Para documentos tipo **FIA** y **CCI**, antes de insertar se verifica si ya existe un registro con el mismo:
  - `ID_N` (tercero)
  - `INVC` (número de factura a registrar)
  - `TIPO` (tipo de documento)

Si ya existe:

- Se omite la inserción.
- Se registra la trazabilidad del evento.
- Se marca el documento como sincronizado/omitido para evitar reprocesos.

**Beneficio de seguridad e integridad:**

- Evita doble contabilización.
- Reduce errores operativos por reintentos.
- Minimiza inconsistencias contables.

### 9.2. Uso de transacciones
- Las inserciones relacionadas (encabezado y detalle) se ejecutan dentro de una transacción.

**Beneficio:**

- Evita estados intermedios (por ejemplo, encabezado sin detalle) ante fallas.

---

## 10. Auditoría, monitoreo y trazabilidad

### 10.1. Registro de eventos (logging)
El servicio registra eventos relevantes para auditoría y soporte:

- Inicio/parada y configuración general.
- Resultados de sincronización (éxito, omisión por duplicado, error).
- Errores de conexión, validación y consistencia.

### 10.2. Recomendaciones de manejo de logs
- Proteger los logs con permisos de lectura restringidos.
- Evitar registrar secretos o claves.
- Implementar rotación/retención según política del cliente.

---

## 11. Continuidad operativa y resiliencia

- El servicio contempla operación continua y recuperación de tareas pendientes.
- Se recomienda:
  - Monitoreo del estado del servicio (reinicios, fallas repetidas).
  - Alertas ante acumulación de errores o bloqueos de sincronización.

---

## 12. Controles complementarios recomendados (hardening)

Para reforzar la postura de seguridad:

- **Firewall/egress control:** permitir solo destinos necesarios.
- **Seguridad del host:** aplicar parches del sistema, antivirus/EDR y políticas de ejecución.
- **Acceso administrativo:** restringir quién puede instalar, reinstalar o modificar el servicio.
- **Rotación de credenciales:** periódica o ante incidentes.
- **Backups:** de base de datos y del instalador/configuración cifrada, bajo política del cliente.

---

## 13. Límites y supuestos

- La seguridad de la solución depende también de:
  - Buenas prácticas del entorno del cliente (permisos, red, hardening del servidor).
  - Gestión adecuada de contraseñas por el operador.
  - Políticas RLS correctamente aplicadas y verificadas en la plataforma.

---

## 14. Resumen ejecutivo

- Aislamiento de datos mediante **RLS**.
- Sincronización **unidireccional** y sin exposición pública de consultas del ERP.
- Protección de secretos con **cifrado AES‑256‑CBC** en la configuración.
- Comunicación protegida mediante **TLS/HTTPS**.
- Despliegue como **Servicio de Windows**, con controles de permisos.
- Distribución como binario compilado/ofuscado.
- Controles de **integridad** en Firebird (prevención de duplicidad y transacciones).


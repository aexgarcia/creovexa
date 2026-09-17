# Automatización

Los workflows exportables se agregarán en `workflows/` durante la fase 7, sin credenciales dentro de sus JSON.

En desarrollo, `pnpm infra:up` inicia n8n en <http://localhost:5678>. La primera visita requiere crear el usuario propietario. La base y el usuario de n8n son independientes de la base de Creovexa, dentro del mismo PostgreSQL local.

n8n coordinará llamadas a la API; las reglas, permisos y estados seguirán en NestJS. Cuando se integre con la API ejecutada en el host, se utilizará `http://host.docker.internal:3001` y se configurará `API_HOST=0.0.0.0` para que sea alcanzable desde el contenedor.

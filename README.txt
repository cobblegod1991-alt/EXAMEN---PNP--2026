EXAMEN PNP COMPARTIDO - VERSION CON NOMBRES E HISTORIAL

CAMBIOS
- Al crear un usuario se solicita: Nombre completo, Usuario y Contraseña.
- El administrador ve el nombre de cada usuario y sus últimos 5 exámenes.
- Cada examen muestra fecha, puntaje y estado.
- La nota mínima para aprobar es 65 puntos.
- Cada usuario, al iniciar sesión, ve su nombre y sus últimos 5 exámenes.
- Se conserva el examen y el banco de preguntas.

IMPORTANTE: PRIMER PASO EN SUPABASE
1) Abre Supabase > SQL Editor.
2) Ejecuta el archivo supabase_migration_nombres_examenes.sql incluido en este ZIP.
3) No borra usuarios ni resultados existentes.
4) Luego despliega este proyecto en Render.

RENDER
Conserva las variables existentes:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_PASSWORD

El administrador se sincroniza con ADMIN_PASSWORD al iniciar el servidor.

ADMINISTRADOR
Usuario: admin
La contraseña es la que tengas actualmente en ADMIN_PASSWORD.

NOTA MINIMA
65 puntos = APROBADO
64 o menos = DESAPROBADO

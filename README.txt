EXAMEN PNP COMPARTIDO

1) Requiere Node.js 18 o superior.
2) Abre una terminal dentro de esta carpeta.
3) Ejecuta: npm start
4) Abre: http://localhost:3000

ADMINISTRADOR INICIAL
Usuario: admin
Contraseña inicial: PNP2026!

PARA COMPARTIRLO ENTRE COMPUTADORAS:
No copies el HTML a cada PC. Debes publicar esta carpeta en un servidor Node (por ejemplo Render, Railway, Fly.io o un VPS). El servidor debe conservar data.json entre reinicios.

IMPORTANTE: en Render, configura SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y ADMIN_PASSWORD. Si no configuras ADMIN_PASSWORD, la clave inicial es PNP2026!. Al reiniciar, el sistema sincroniza la contraseña del usuario admin con ADMIN_PASSWORD.

El sistema guarda usuarios y resultados en el servidor. Cada usuario puede entrar desde su propia computadora con el mismo enlace.

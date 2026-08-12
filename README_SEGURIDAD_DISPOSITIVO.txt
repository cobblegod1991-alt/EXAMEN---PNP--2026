SEGURIDAD DE DISPOSITIVO

1) En Supabase > SQL Editor ejecuta supabase_migration_dispositivo.sql.
2) No borra usuarios ni historial.
3) En el primer inicio de cada usuario se registra un identificador del navegador/dispositivo y la IP.
4) En siguientes inicios, si el identificador no coincide, el acceso se rechaza.
5) El administrador puede desvincular el dispositivo desde Administrar usuarios; el próximo dispositivo que inicie sesión quedará vinculado.
6) La dirección MAC no puede ser obtenida por una página web normal, por eso no se usa MAC.
7) La IP se registra como información complementaria, pero no se usa sola para bloquear, para evitar bloqueos por cambios normales de IP.

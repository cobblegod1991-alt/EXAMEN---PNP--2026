CAMBIO: MULTIPLES DISPOSITIVOS POR USUARIO

1. En Supabase -> SQL Editor ejecuta UNA VEZ:
   supabase_migration_multidispositivo.sql

2. Después despliega este proyecto en Render.

FUNCIONAMIENTO:
- Cada usuario empieza con 1 dispositivo permitido.
- Primer dispositivo: se vincula automáticamente.
- Si el administrador pulsa +, el límite aumenta en 1.
- Ejemplo: 1/1 -> pulsar + -> 1/2. El siguiente dispositivo distinto podrá entrar.
- Volver a pulsar +: 1/3, etc. Máximo 10 por usuario.
- El botón "Desvincular todos" elimina los dispositivos autorizados y el próximo ingreso vuelve a registrar el dispositivo.
- El administrador no está limitado por esta función.

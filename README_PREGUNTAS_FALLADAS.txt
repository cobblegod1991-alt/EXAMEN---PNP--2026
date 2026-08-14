VERSION: Repaso de preguntas falladas

Esta versión conecta el simulador con la tabla Supabase user_mistakes.

FUNCIONAMIENTO:
- Cada vez que un usuario falla una pregunta en un examen de 100 o mini examen de 20, se registra.
- La misma pregunta no se duplica: se incrementa veces_fallada.
- En el menú aparece "Repaso de preguntas falladas".
- El usuario responde nuevamente las pendientes.
- Si acierta, la pregunta se marca como resuelta y desaparece del repaso.
- Si vuelve a fallar, permanece pendiente.

REQUISITO:
La tabla y funciones de user_mistakes deben existir en Supabase. El archivo
supabase_migration_preguntas_falladas.sql contiene el SQL correspondiente.

SEGURIDAD:
El navegador no accede directamente a la clave de servicio. Las operaciones
pasan por server.js y requieren una sesión válida.

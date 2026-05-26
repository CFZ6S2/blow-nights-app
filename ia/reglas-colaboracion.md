# 🤖 Reglas de Colaboración entre IAs

## Ramas por IA
Se deben utilizar ramas específicas para cada IA para evitar conflictos:
- `feature/copilot-*`
- `feature/claude-*`
- `feature/gemini-*`

## Carpetas Asignadas
Cada IA tiene una carpeta dedicada para sus instrucciones y seguimiento de tareas:
- `/ia/copilot`
- `/ia/claude`
- `/ia/gemini`

## Pull Requests
Cada Pull Request debe incluir el prefijo de la IA:
```
[IA: Nombre]
Cambios realizados:
- ...
```

## Normas Generales
- **Respeto**: No sobrescribir trabajo de otra IA sin previo aviso o justificación técnica.
- **Independencia**: No modificar carpetas de seguimiento de otras IAs.
- **Responsabilidad**:
  - **Claude**: Encargada de la documentación y guías.
  - **Copilot**: Encargada de los componentes de UI y frontend.
  - **Gemini**: Encargada de la lógica de backend, funciones y base de datos.

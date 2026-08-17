# 📝 Handoff para Claude: Sistema de Ticketing y RRPP (Bloque 1 completado)

Hola Claude, este documento resume los cambios estructurales, de backend y de frontend que se han implementado para cerrar el sistema de ticketing y la gestión de relaciones públicas (RRPP) de **Blow Nights**.

A partir de ahora, la plataforma actúa como **validador puramente tecnológico** para el ocio nocturno. Hemos eliminado la necesidad de que los promotores utilicen Stripe Connect, pasando a un modelo de liquidación offline (mano/Bizum) mucho más adaptado a la realidad del sector.

---

## 1. Cambios en la Arquitectura y Base de Datos

### RRPPs por Evento (En lugar de por Local)
- Los promotores ahora se generan y asignan de manera específica para cada evento.
- **Ruta Firestore:** `venues/{venueId}/events/{eventId}/promoters/{promoterId}`
- **Campos clave del Promoter:**
  - `access_token`: Token secreto para generar el Magic Link del RRPP (`/rrpp/[token]`).
  - `is_closed`: (Boolean) Si es `true`, el RRPP ya no puede emitir más QRs (Lista Cerrada).
  - `liquidated_by_venue`: (Boolean) El garito confirma haber liquidado cuentas con el RRPP.
  - `liquidated_by_rrpp`: (Boolean) El RRPP confirma haber recibido el dinero.
  - *Nota: El RRPP se considera "destruido" u oculto de las vistas activas solo cuando ambas partes han marcado la liquidación como `true`.*

### Tickets a Nivel Raíz
- Todos los tickets (tanto de compra por Stripe como de emisión manual por RRPP) se guardan en la colección raíz `/tickets`.
- El escáner de puerta (`validateTicketByDoorToken`) lee directamente de esta colección y devuelve el alias (`client_name`) y el RRPP (`promoter_name`) para mostrarlos en la UI.

---

## 2. Cloud Functions Desplegadas (`functions/index.js`)

Se ha refactorizado y asegurado el motor de funciones. Todas están desplegadas en producción (`us-central1`):

1. **`createTicketCheckout`**: Bloquea el inventario atómicamente mediante transacciones durante 10 mins y genera la sesión de Stripe.
2. **`stripeWebhook`**: Atiende los pagos confirmados mediante *Direct Charge* hacia la cuenta conectada del garito (`stripeAccountId`). Emite el ticket final a `/tickets`.
3. **`generateDirectPromoterTicket`**: Llamada desde el panel del RRPP. Genera un ticket manual sin pasarela de pago y lo guarda en `/tickets`. Requiere que el promotor tenga `is_closed: false`.
4. **`closePromoterList`**: Marca la lista del RRPP como `is_closed: true`.
5. **`liquidatePromoter`**: Permite al RRPP confirmar que ha cobrado, poniendo `liquidated_by_rrpp: true`.
6. **`validateTicketByDoorToken`**: Escáner de puerta. No requiere Auth de Firebase, solo el `door_access_token` del evento.
7. **`assignRole`**: Asigna Custom Claims (`admin` o `venueOwner`) para cerrar la vulnerabilidad de escalada de privilegios que existía anteriormente.

---

## 3. Seguridad y Reglas (`firestore.rules` & `storage.rules`)

- Se han implementado **Custom Claims** (`request.auth.token.role`).
- Las subcolecciones `events` y `promoters` ahora validan que el usuario es el dueño del local usando una lectura cruzada: `get(/databases/$(database)/documents/venues/$(venueId)).data.ownerId == request.auth.uid` o validando el claim de admin.
- El Storage limita las subidas de flyers a **5MB** y obliga a que sean imágenes.

---

## 4. Frontend: Nuevas Vistas Implementadas

### Panel del Garito (`src/components/venue-admin/EventsTab.tsx`)
- Se ha integrado la sección **"Equipo RRPP"** dentro de cada evento.
- El administrador puede añadir promotores, copiar sus Magic Links, cerrar sus listas (`Cerrar Lista`) y marcar los pagos como saldados (`Marcar Pagado`).

### Panel Móvil del RRPP (`src/app/rrpp/[token]/page.tsx`)
- Dashboard ultra-ligero y sin login (ideal para la puerta o discoteca).
- Usa `getPromoterStats` para mostrar cuántos QRs ha emitido y cuántos han entrado.
- Botón **"+ Emitir Entrada QR"** para generar invitaciones manualmente (asignando un alias como "Marcos amigo"). Muestra el código QR final listo para compartir por WhatsApp.
- Botones de control para **"Cerrar mi Noche"** (bloquea la emisión) y **"Confirmar Cobro"** (liquidación a dos bandas).

### Escáner de Puerta (`src/app/door/[venueId]/[eventId]/page.tsx`)
- Vista con `html5-qrcode` integrada.
- Pantalla que se vuelve **Verde** o **Roja** con feedback háptico. Muestra claramente a qué RRPP pertenece el pase y el nombre del invitado.

---

## Próximos Pasos Recomendados
1. **Typescript Strict:** Continuar resolviendo los errores `any` en los tipos de React.
2. **Apple Sign-In:** (Opcional) El usuario indicó que por ahora no es prioritario, pero está pendiente en el backlog.
3. **Migración a Producción:** La arquitectura ya es lo suficientemente segura para soportar carga real de ventas.

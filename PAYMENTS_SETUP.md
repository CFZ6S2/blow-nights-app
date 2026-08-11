# Activar pagos (Stripe)

La app está lista para procesar pagos reales; solo falta conectar una cuenta
de Stripe. Con la configuración por defecto (claves de ejemplo), la app
funciona con normalidad — el botón "Hazte Premium" simplemente mostrará un
error controlado en vez de romperse.

## Pasos

1. **Crear cuenta de Stripe** en https://dashboard.stripe.com si aún no existe una.

2. **Crear los productos y precios** (Dashboard → Product catalog):
   - Un plan mensual (recurring, monthly).
   - Un plan anual (recurring, yearly).
   - Copia el **Price ID** de cada uno (empieza por `price_...`).

3. **Pegar los Price IDs en el frontend**:
   [`frontend/src/app/premium/page.tsx`](frontend/src/app/premium/page.tsx) —
   busca los dos `TODO(buyer)` y reemplaza `'price_monthly_placeholder'` /
   `'price_yearly_placeholder'` por los Price IDs reales.

4. **Configurar la clave secreta de Stripe en Cloud Functions**:
   - Copia [`functions/.env.example`](functions/.env.example) a `functions/.env`.
   - Rellena `STRIPE_SECRET_KEY` con la clave secreta (Dashboard → Developers → API keys).
   - (Alternativa en producción: `firebase functions:secrets:set STRIPE_SECRET_KEY`.)

5. **Configurar el webhook**:
   - Despliega las funciones una vez (`firebase deploy --only functions`) para obtener
     la URL pública de `stripeWebhook` (Cloud Functions Gen2 la muestra al terminar el deploy,
     con forma `https://stripewebhook-xxxxx.a.run.app`).
   - En Stripe: Dashboard → Developers → Webhooks → Add endpoint, pega esa URL,
     y suscríbete al menos a `checkout.session.completed` y `customer.subscription.deleted`.
   - Copia el **Signing secret** del webhook y ponlo en `functions/.env` como `STRIPE_WEBHOOK_SECRET`.

6. **Volver a desplegar**:
   ```bash
   firebase deploy --only functions,hosting
   ```

Con esto, el flujo completo queda activo: el usuario pulsa "Hazte Premium" →
se abre Stripe Checkout → al completar el pago, el webhook marca al usuario
como `premium: true` en Firestore automáticamente.

## Dónde está el código

- Frontend (inicia el checkout): [`frontend/src/app/premium/page.tsx`](frontend/src/app/premium/page.tsx)
- Backend (crea la sesión y procesa el webhook): [`functions/index.js`](functions/index.js) —
  funciones `createCheckoutSession` y `stripeWebhook`.

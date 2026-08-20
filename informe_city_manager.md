# Informe de Producto: City Manager (Franquiciado Local)

El **City Manager** es el CEO de Blow Nights en su ciudad. Es un emprendedor, comercial o líder de la noche local que asume el control territorial exclusivo. Su trabajo es el trabajo de campo: cerrar acuerdos B2B con discotecas, bares y saunas para que usen la plataforma.

## 1. Visión General del Rol
- **Misión:** Digitalizar la noche de su ciudad. Su objetivo es que cada local nocturno pague una suscripción SaaS (Básico, Promo o Ticketing) y transaccione sus ventas a través del ecosistema Blow Nights.
- **Relación con la Central:** La Central provee toda la tecnología (App, Webhooks, Servidores, Updates), el City Manager pone la red de contactos.
- **Modelo de Ingresos (Active Income):** Cobra el **50% de TODO** lo que genere la ciudad.
  - 50% de las suscripciones mensuales B2B de los locales.
  - 50% de los fees de tramitación de cada entrada vendida.
  - 50% de la venta de "Packs de QRs" a los Relaciones Públicas (RRPP).

## 2. Proyecciones Económicas (Los Números)

El límite salarial del City Manager lo marca el tamaño de la ciudad y su capacidad comercial. Al no tener que pagar nóminas, servidores ni pasarelas de pago, su ingreso es prácticamente beneficio neto.

> [!TIP]
> **Ejemplo de Ciudad Consolidada (Escenario Moderado)**
> Supongamos que, tras 6 meses de trabajo, el City Manager ha captado una cartera de locales activos que rinden los siguientes volúmenes:
> 
> **Ingresos B2B Recurrentes (SaaS):**
> - 15 locales top en Tier Ticketing (100 €/mes) = 1.500 €
> - 35 locales en Tier Promo (60 €/mes) = 2.100 €
> - 10 locales en Tier Básico (30 €/mes) = 300 €
> *Total Subscripciones = 3.900 € / mes*
>
> **Ingresos por Volumen Transaccional (B2B2C):**
> - Ventas globales de entradas en los 15 locales top: **12.000 entradas/mes** (fee 1,00 €) = 12.000 €
> - Packs QRs comprados por los equipos de RRPP: **2.000 QRs/mes** (fee 0,50 €) = 1.000 €
> *Total Transaccional = 13.000 € / mes*
>
> **Facturación Bruta de la Ciudad:** **16.900 € / mes**
> **Ingreso Neto City Manager (Split 50%):** **8.450 € / mes**.

## 3. Herramientas en la Plataforma (Dashboard)
El City Manager dispone de su centro de control operativo en la ruta `/city-manager`:

### A. Gestión de Negocios (Venues)
- **Altas B2B:** Es el único rol (junto con el SuperAdmin) con poder para crear un Local en el mapa, asignarle un dueño (`ownerId`) y conectarlo a la ciudad.
- **Control de Suscripciones:** Visualiza de un vistazo qué locales están en el tier `Básico` (visibilidad), `Promo` (Notificaciones Push) o `Ticketing` (Ventas y RRPP).

### B. Finanzas y Trazabilidad
- **El Dashboard Financiero:** Monitoreo en vivo de las entradas vendidas en toda la ciudad. 
- **Stripe Connect Integrado:** El City Manager tiene su propio Dashboard de Stripe conectado. Cada vez que un usuario compra una entrada, el flujo de dinero inyecta su comisión instantáneamente en su cuenta bancaria.

## 4. Propuesta de Valor Comercial (Sales Pitch)
El City Manager utiliza dos discursos de ventas para levantar la ciudad:

> **Pitch para Locales (SaaS):** *"Por 100€ al mes, te doy un software completo que digitaliza tu puerta, escanea entradas, gestiona la liquidación automática de tus RRPPs, y además te permite lanzar promociones Push directas a los usuarios de la app que estén cerca de tu local."*

> **Pitch para RRPPs locales:** *"Deja de usar papel y Bizum. Compra tu paquete de QRs en la app, repártelos, y cuando tus invitados escaneen el QR en la puerta, el sistema te ingresa tu comisión automáticamente sin pelearte con el dueño del local."*

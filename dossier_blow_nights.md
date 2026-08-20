# BLOW NIGHTS: DOSSIER MAESTRO DE OPORTUNIDAD, NEGOCIO Y ARQUITECTURA TERRITORIAL

---

## 1. QUÉ ES BLOW NIGHTS

Blow Nights es una app social y de *nightlife* diseñada para conectar personas, lugares y experiencias dentro de una misma ciudad.

El producto combina dos motores que se alimentan mutuamente:

* **La capa social:** Una experiencia de descubrimiento de perfiles al estilo *Tinder / Grindr* donde los usuarios pueden explorar perfiles de su entorno, mostrar interés, conseguir un *match* mutuo, chatear y acordar quedar con total normalidad. *Hacer match no obliga a comprar una entrada ni a ir a un local.*
* **La capa de nightlife:** Un ecosistema comercial que integra mapa de locales (venues), eventos, ticketing, RRPP y promociones. El usuario puede entrar para conocer gente o para descubrir dónde salir esa noche, comprar una entrada y vivir la experiencia.

---

## 2. EL ECOSISTEMA Y SUS ACTORES

| Actor | Qué hace | Valor / Rol |
| --- | --- | --- |
| **Usuario** | Match, chat, descubrir, salir, comprar | Experiencia social + nightlife |
| **Venue (Local)** | Se incorpora, contrata SaaS y vende entradas | Digitalización + ventas |
| **RRPP** | Compra y distribuye QRs | Canal humano de distribución digitalizable |
| **Organizador** | Crea eventos y vende ticketing | Monetización de eventos esporádicos |
| **Door (Puerta)** | Valida entradas y tokens de acceso | Control de acceso en tiempo real |
| **City Manager** | Desarrolla y opera la ciudad | Participación económica territorial |
| **Ambassador** | Captura y acompaña a los City Managers | 25% de la actividad de su cartera |
| **Plataforma Central** | Mantiene la tecnología e infraestructura | Escalabilidad global del ecosistema |

---

## 3. LÍNEAS DE INGRESOS PARA EL LOCAL (VENUE)

La plataforma monetiza la relación con los locales mediante suscripciones SaaS mensuales con control técnico de acceso en el backend:

* **Básico (30 € / mes):** Presencia y visibilidad en el mapa y directorio.
* **Promo (60 € / mes):** Promoción y activación de ofertas.
* **Ticketing (100 € / mes):** Venta avanzada de entradas y conexión con Stripe Connect.

---

## 4. MODELO DE DISTRIBUCIÓN DE RRPP

El RRPP independiente adquiere packs de QRs digitales a un coste de 0,50 € por unidad, uniendo una relación comercial humana con una infraestructura digital de validación en puerta:

* **Pack 50 QRs:** 25 €
* **Pack 100 QRs:** 50 €
* **Pack 500 QRs:** 250 €

---

## 5. AFILIACIÓN Y MODELO ECONÓMICO TERRITORIAL

Cada ciudad se estructura como un territorio independiente de negocio. Los ingresos generados en la plaza se distribuyen mediante un modelo transparente de franquicia territorial:

* **Con Ambassador y City Manager:** 
  * **Ambassador:** 25% del total generado.
  * **City Manager:** 37,5% del remanente posterior.
  * **Plataforma Central:** 37,5% del remanente posterior.

* **Sin Ambassador (Sólo City Manager):** 50% City Manager / 50% Plataforma Central.
* **Sin City Manager:** 100% para la Plataforma Central.

---

## 6. ESCENARIO FINANCIERO DE EJEMPLO (UNA CIUDAD TÍPICA)

Desglose mensual estimado de una ciudad operativa consolidada:

* **Fuentes de Ingresos Mensuales:**
  * SaaS (Locales): 3.900 €
  * Ticketing: 12.000 €
  * QR RRPP: 1.000 €
  * Eventos / Boost / Otros: 8.000 €
* **VOLUMEN TOTAL MENSUAL:** **24.900 €**


* **Reparto de Beneficios:**
  * **Ambassador (25%):** 6.225 €
  * **City Manager (37,5%):** 9.337,50 €
  * **Plataforma Central (37,5%):** 9.337,50 €

---

## 7. PROYECCIÓN DE ESCALA TERRITORIAL

| Ciudades | Volumen Medio / Mes | Volumen Total / Mes | Ambassador (25%) | City Manager (37,5%) | Plataforma Central (37,5%) |
| --- | --- | --- | --- | --- | --- |
| **10** | 10.000 € | 100.000 € | 25.000 € | 37.500 € | 37.500 € |
| **25** | 10.000 € | 250.000 € | 62.500 € | 93.750 € | 93.750 € |
| **50** | 10.000 € | 500.000 € | 125.000 € | 187.500 € | 187.500 € |
| **100** | 10.000 € | 1.000.000 € | 250.000 € | 375.000 € | 375.000 € |

*(Nota: Las cifras económicas son escenarios de planificación de negocio y no constituyen garantías fijas; no incluyen costes operativos de pasarelas ni impuestos de estructura).*

---

## 8. ANEXO TÉCNICO, FISCAL Y DE PAGOS (ARQUITECTURA BLINDADA)

Para dotar al proyecto de total seguridad ante socios, inversores y auditores, Blow Nights opera bajo una arquitectura corporativa y técnica estrictamente compartimentada:

### A. Separación Jurídica: SaaS B2B vs. Ticketing

* **SaaS B2B (Blow Nights LLC ➔ Venue):** La plataforma tecnológica se presta desde nuestra matriz internacional (**Blow Nights LLC**, EE. UU.) a los locales españoles mediante suscripciones mensuales. A nivel fiscal intracomunitario, este servicio opera bajo el régimen de **inversión del sujeto pasivo (*reverse charge*)**, declarando el cliente empresarial el impuesto en su territorio sin que la LLC requiera un establecimiento físico permanente en España.
* **Ticketing y Acceso (Venue ➔ Consumidor):** El local u organizador actúa en todo momento como el **Merchant of Record** (comercializador oficial) frente al usuario final que adquiere la entrada, respondiendo de la organización del evento, el acceso y las obligaciones normativas del espectáculo.

### B. Ingeniería de Pagos: Stripe Connect y *Direct Charges*

* **Modelo Direct Charges:** La pasarela de pago de las entradas se ejecuta directamente sobre la cuenta conectada del propio *Venue*. El dinero del ticket va íntegro al local, **evitando mezclar o repartir dinero bruto de terceros**.
* **Retención de Comisión (*Application Fee*):** Automáticamente en la transacción, la plataforma retiene su *fee* tecnológico bruto (`platformFeeGross`).
* **Independencia Operativa:** Los costes de pasarela (Stripe) y servidores (Firebase) son asumidos por la Central de la compañía, aislando los porcentajes de beneficio de los socios territoriales.

### C. Trazabilidad del Ledger Territorial

Cualquier transacción genera un registro automatizado en tiempo real estructurado en cuatro fases auditables:

1. `ticket_orders`: Registro de la venta del venue y el *fee* bruto asociado.
2. `platform_fees`: Captura del margen tecnológico bruto de Blow Nights LLC (`platformFeeGross`).
3. `territorial_splits`: Aplicación matemática automática del modelo (25% Ambassador / 37,5% City Manager / 37,5% Central) exclusivamente sobre el margen tecnológico.
4. `payouts`: Transferencias automáticas a las cuentas bancarias o de Stripe de los gestores territoriales.

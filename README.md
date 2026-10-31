<div align="center">

# MISSIONARY LUNCH

**Que ningún día falte almuerzo para los misioneros.**

Una app web para que las familias de un barrio se anoten a dar almuerzo a los misioneros, y ellos confirmen a diario para planificar su día.

Un producto de **[Teo Labs](https://www.teolabs.app)** ®

</div>

---

## De qué se trata

Coordinar los almuerzos de los misioneros suele vivir en una hoja de papel y un grupo de WhatsApp: nadie sabe qué días están cubiertos, las familias olvidan el compromiso, y los misioneros se enteran tarde de que hoy no tienen dónde comer. La app responde, en un vistazo:

- ¿Qué días de este mes ya tienen familia y cuáles faltan?
- ¿Qué familia nos da almuerzo mañana, a qué hora y dónde?
- ¿La familia confirmó? ¿Los misioneros ya vieron el plan?
- ¿A quién le avisamos si un día quedó sin cubrir?
- ¿Estoy en mi barrio? ¿Y si me cambié de sector?

Funciona como una app instalable en el teléfono (PWA), pensada para usarse con una mano y para gente que no quiere claves: las familias entran como en la hoja de papel, con su nombre y su número de WhatsApp.

## Lo que hace

### Encontrar el barrio

| Función | Detalle |
|---|---|
| Buscador | Por nombre o por número de unidad de la Iglesia, sin iniciar sesión. Muestra solo nombre, unidad y dirección de la capilla |
| Enlace y QR | Cada barrio tiene su enlace; el QR lleva directo al calendario |
| Afiche para imprimir | Hoja con el QR, la dirección de la capilla y tres pasos, lista para el tablero de la capilla |
| Confirmación a la vista | Antes de entrar se ve el nombre del barrio y su capilla, con «¿No es tu barrio?» |
| Cambio de sector | Quien se muda deja su barrio y entra al nuevo; el historial queda en el barrio |

### Para las familias (miembros)

| Función | Detalle |
|---|---|
| Entrada rápida | Nombre y número de WhatsApp, sin códigos |
| Calendario del barrio | Días libres, reservados, confirmados y los propios, hasta 60 días adelante |
| Reservar un día | Un cupo por día y compañerismo; si otra familia lo toma antes, se avisa |
| Tres formas de almuerzo | Almuerzan en su casa · lo retiran · se lo llevan |
| Normas visibles | Mensaje de 15–20 min y adulto presente, según las normas misionales 2.4.5 y 2.4.2 |
| Confirmar | Desde el día anterior, con un toque; también pueden cancelar |

### Para los misioneros

| Función | Detalle |
|---|---|
| Plan de hoy y mañana | Familia, hora, forma, dirección, teléfono y notas |
| Confirmar el plan | Un toque por almuerzo |
| Escribir a la familia | WhatsApp con el mensaje listo |
| Aviso de día sin almuerzo | Al encargado, con el mensaje listo |

### Para el encargado de almuerzos

| Función | Detalle |
|---|---|
| Crear el barrio | Pega el enlace de «Compartir» del sitio de la Iglesia: la app trae el nombre y la dirección de la capilla |
| Panel de 14 días | Cubiertos, confirmados y por cubrir |
| Pedir familias | Mensaje con los días que faltan, listo para pegar en el grupo del barrio |
| Compartir | Enlace, QR y afiche imprimible |
| Configuración | Compañerismos (élderes u hermanas), horario, días sin almuerzo, alergias, guías del presidente de misión |
| Personas y roles | Quién es miembro, misionero o encargado; código para que los misioneros se identifiquen |
| Lista de mañana | Qué familias faltan por confirmar, con un botón de WhatsApp para recordarles, y el plan del día listo para enviar a los misioneros |
| Liberar o recordar | Libera un día o recuerda a la familia por WhatsApp |

### Recordatorios

Cada noche, un aviso a cada familia con almuerzo al día siguiente sin confirmar, y el plan de mañana a los misioneros y al encargado. Llega como **aviso en el celular** (push, para quien instaló la app y lo activó) y, si la cuenta tiene correo, también por **correo**. Así las familias que entran solo con su número de WhatsApp también reciben el recordatorio. Como respaldo, el encargado tiene la lista de mañana con un botón de WhatsApp por familia.

### La app en el teléfono (PWA)

| Función | Detalle |
|---|---|
| Instalable | Botón «Instalar la app» en Android y escritorio; en iPhone, los pasos para agregarla a la pantalla de inicio |
| Abre como app | Pantalla completa, ícono propio (también versión adaptable de Android) y arranque rápido: guarda los archivos estáticos, nunca los datos del barrio |
| Avisos | «Activar avisos» pide el permiso una sola vez y se puede apagar desde la misma pantalla |
| Sin internet | Un aviso claro con botón para reintentar |

## Un recorrido de punta a punta

```
  Encargado                 Familia                  Misioneros
  ─────────                 ───────                  ──────────
  pega el enlace de la
  Iglesia → crea el barrio
  Teo Labs lo aprueba
  imprime el QR / comparte
  el enlace ───────────────▶ escanea o busca su barrio
                            nombre + WhatsApp
                            elige un día libre
                            reserva (casa/retiro/entrega)
                                   │
                                   ▼
                          calendario en vivo ◀────── ven el plan de hoy y mañana
                                   │
        la noche anterior: correo recordatorio ─────▶ correo con el plan
                                   │
                            confirma (día anterior) ─▶ confirman
                                   └────── "Confirmado ✓" ──────┘
```

## Las decisiones que sostienen el sistema

1. **Todo es a nivel de barrio, y el barrio es su número de unidad.** No hay estaca ni jerarquías: el número de unidad de la Iglesia identifica al barrio y no se puede repetir. El líder del barrio asigna a un encargado, y él coordina.
2. **Un barrio nuevo se aprueba antes de abrirse.** Quien lo crea queda como encargado y puede configurarlo, pero el barrio no aparece en el buscador ni acepta familias hasta que Teo Labs lo aprueba. Así nadie se queda con el barrio de otro.
3. **Doble confirmación.** Un almuerzo solo está «Confirmado» cuando la familia y los misioneros lo confirmaron.
4. **Privacidad por rol.** Todos ven qué días están cubiertos; teléfonos, direcciones y notas de una familia solo los ven ella, los misioneros y el encargado. El buscador público muestra únicamente nombre, unidad y dirección de la capilla.
5. **Un cupo, una familia.** La base de datos impide que dos familias tomen el mismo día, aunque lo intenten a la vez.
6. **Sin contraseñas.** Las familias entran con nombre y número; el encargado y los misioneros, con un código de 6 dígitos enviado a su correo.

## Stack

| Capa | Tecnología |
|---|---|
| App | Next.js (App Router) · React · TypeScript · PWA |
| Datos y acceso | Supabase (Postgres, RLS, Auth, Realtime) |
| Códigos QR | `qrcode`, dibujados en el navegador |
| Correos | SMTP (nodemailer) |
| Deploy | Vercel (incluye el cron de recordatorios) |

## Puesta en marcha

```bash
npm install
npm run dev
```

**Sin configurar nada** la app corre en *modo demo*: un barrio de ejemplo guardado en el navegador, con un selector para ver cada rol. Para usarla de verdad:

1. Crea un proyecto en Supabase y ejecuta, en orden, las migraciones de `supabase/migrations/` (0001 a 0006) en el editor SQL.
2. En Supabase → Authentication → Email Templates → *Magic Link*, incluye `{{ .Token }}` en el mensaje (así llega el código de 6 dígitos además del enlace).
3. Copia `.env.example` a `.env.local` y completa las variables.
4. Opcional: `npm run demo:seed` crea un barrio demo con datos realistas.

### Aprobar barrios nuevos

```bash
npm run barrios                      # lista los barrios pendientes y quién los creó
npm run barrios -- aprobar <slug>    # los habilita
npm run barrios -- rechazar <slug>   # borra un pendiente y libera su número de unidad
```

Cuando alguien crea un barrio, llega un correo a `ADMIN_EMAIL` con los datos y un botón «Revisar y decidir»: abre una página con enlace firmado donde se aprueba o rechaza con un toque. Al aprobar, quien lo creó recibe el aviso de que ya puede compartir el enlace y el QR.

## Estructura

```
src/
├── app/                      Rutas: inicio, /b/[slug], /b/[slug]/afiche, login, cron, iconos PWA
│   ├── admin/barrio/         Aprobación de barrios con enlace firmado
│   └── api/                  entrar (WhatsApp), unidad (datos públicos de la Iglesia), push, barrio-nuevo, cron/recordatorios
├── components/app/           Buscador, calendario, vistas por rol, hojas inferiores, afiche, login
└── lib/
    ├── repo/                 Capa de datos: Supabase y modo demo local, misma interfaz
    ├── supabase/             Clientes de navegador y servidor
    ├── push.ts               Avisos push (Web Push, VAPID)
    └── correo.ts             Correo de recordatorio
supabase/migrations/          Esquema, políticas RLS y funciones
scripts/                      seed-demo.mjs (barrio y usuario demo) · barrios.mjs (aprobaciones)
```

## Deploy

Vercel, con las variables de `.env.example` (las claves de avisos se generan una vez con `npx web-push generate-vapid-keys`). El cron (`vercel.json`) llama cada noche a `/api/cron/recordatorios`, protegido con `CRON_SECRET`. En Supabase → Authentication → URL Configuration hay que agregar el dominio publicado (y `http://localhost:3000/**` para desarrollo) como Site URL y Redirect URLs.

## Seguridad

- Row Level Security en todas las tablas; las escrituras sensibles (reservar, confirmar, liberar, cambiar roles, crear y dejar barrios) pasan por funciones que validan el rol y las reglas.
- Los datos privados de cada almuerzo viven en una tabla aparte con políticas más estrictas.
- La búsqueda pública pide al menos 3 letras, devuelve como máximo 8 barrios y nunca incluye barrios pendientes.
- El ingreso por WhatsApp tiene freno por IP, y las cuentas con rol de encargado o misionero no pueden entrar por ahí.
- La clave de servicio solo se usa en el servidor (cron y scripts).
- Cabeceras de seguridad y rutas internas validadas en el callback de login.

---

<div align="center">

**Construido por [Teo Labs](https://www.teolabs.app)** ®

*Porque un almuerzo en familia también es parte de la misión.*

</div>

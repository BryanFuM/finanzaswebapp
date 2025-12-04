# 🎤 GUIÓN DE PRESENTACIÓN - Sistema MiHogarFinanzas
**Duración estimada: 15-20 minutos**

---

# PARTE 1: EL SISTEMA (5-6 minutos)

## 📢 Introducción:

> "Nuestro sistema es una aplicación web para gestionar créditos hipotecarios del programa MiVivienda. Está desarrollado con **Node.js y Express** en el backend, y usa **SQLite** como base de datos.
>
> La arquitectura sigue el patrón **MVC**: los Modelos definen la estructura de datos, los Controladores manejan la lógica de negocio, y las Vistas son las páginas HTML.
>
> Lo más importante es que **todos los cálculos financieros están centralizados en un solo archivo**: `src/utils/finance.js`. ¿Por qué? Porque así evitamos duplicar fórmulas, facilitamos el mantenimiento, y garantizamos consistencia en todos los cálculos."

## 📢 Estructura de archivos:

> "Les muestro cómo está organizado el proyecto:
>
> ```
> src/
>   ├── controllers/     ← Lógica de negocio (loan.js, clients.js)
>   ├── models/          ← Estructura de datos (loan.js, client.js)
>   ├── routes/          ← Endpoints de la API
>   └── utils/
>       └── finance.js   ← TODOS los cálculos financieros aquí
> public/
>   ├── planpagos.html   ← Interfaz del plan de pagos
>   ├── clientes.html    ← Gestión de clientes
>   └── indicadores.html ← VAN, TIR, TCEA
> ```
>
> El archivo `finance.js` es el corazón del sistema. Contiene todas las fórmulas matemáticas."

## 📢 Flujo de datos - Plan de Pagos:

> "Veamos el flujo cuando el usuario genera un plan de pagos:
>
> **PASO 1** - El usuario llena el formulario en `planpagos.html`: precio del inmueble, cuota inicial, tasa, plazo, seguros, etc.
>
> **PASO 2** - Al hacer clic en 'Calcular', el frontend envía los datos al endpoint `POST /api/loans/calculate`.
>
> **PASO 3** - El controlador `loan.js` recibe los datos y llama a `finance.calcularPrestamoCompleto()`.
>
> **PASO 4** - La función hace TODO el cálculo: convierte tasas, genera el cronograma, calcula seguros, y obtiene los indicadores.
>
> **PASO 5** - El resultado vuelve al frontend que lo muestra en la tabla del cronograma.
>
> El frontend **nunca calcula**. Solo envía datos y muestra resultados."

## 📢 Flujo de datos - Evaluación de Bono:

> "Para el Bono Techo Propio es similar:
>
> **PASO 1** - El usuario ingresa: ingresos mensuales, si es primera vivienda, y el precio de la vivienda.
>
> **PASO 2** - Se envía al endpoint `POST /api/loans/evaluar-bono`.
>
> **PASO 3** - El controlador llama a `finance.evaluarBonoTechoPropio()`.
>
> **PASO 4** - La función evalúa las condiciones: ¿ingresos menores a S/ 3,715? ¿Es primera vivienda? ¿Precio dentro del límite?
>
> **PASO 5** - Retorna si aplica o no, qué tipo de bono, y cuánto recibiría.
>
> Todo centralizado en `finance.js`."

---

# PARTE 2: LOS CÁLCULOS FINANCIEROS (8-10 minutos)

## 📢 Conversión de tasas:

> "Empecemos con los cálculos. Primero, la conversión de tasas. Los bancos nos dan una **TEA** (Tasa Efectiva Anual), pero nosotros cobramos cuotas mensuales o trimestrales. Entonces hay que convertirla.
>
> La fórmula es: **TEP = (1 + TEA)^(días/360) - 1**
>
> ¿Por qué 360 y no 365? Porque es el **año comercial**, un estándar del sistema financiero que facilita los cálculos.
>
> Ejemplo: Una TEA del 11% para cuotas trimestrales (90 días):
> TEP = (1.11)^(90/360) - 1 = **2.64% trimestral**"

---

## 📢 Método Francés (cuota fija):

> "Usamos el **método francés** porque es el más común en hipotecas. Su característica principal es que la cuota es siempre la misma.
>
> La fórmula es: **Cuota = P × [r(1+r)^n] / [(1+r)^n - 1]**
>
> Donde P es el préstamo, r es la tasa del período, y n es el número de cuotas.
>
> ¿Por qué el método francés y no el alemán? Porque al cliente le es más fácil planificar un pago fijo mensual. En el método alemán las primeras cuotas son muy altas.
>
> Cada cuota se divide en dos partes: **interés** (lo que gana el banco) y **amortización** (lo que reduce la deuda). Al inicio pagas más interés, pero al final pagas más amortización."

---

## 📢 Períodos de gracia:

> "Los créditos MiVivienda pueden tener **período de gracia**, que es un tiempo donde el cliente paga menos o nada.
>
> - **Gracia parcial**: Solo pagas los intereses. La deuda no baja pero tampoco sube.
> - **Gracia total**: No pagas nada. Pero los intereses se **capitalizan**, es decir, se suman a la deuda.
>
> ¿Por qué existe esto? Para ayudar a familias que necesitan tiempo antes de empezar a pagar la cuota completa."

---

## 📢 Seguros y costos:

> "Cada cuota incluye seguros obligatorios:
>
> - **Seguro desgravamen**: Protege a la familia si el titular fallece. Se calcula sobre el saldo.
> - **Seguro de riesgo**: Protege el inmueble contra desastres. Se calcula sobre el precio de la propiedad.
>
> También hay comisiones y portes que cobra el banco.
>
> Por eso la **cuota total** es mayor que solo capital + interés."

---

## 📢 Indicadores (VAN, TIR, TCEA):

> "Finalmente calculamos indicadores para evaluar el crédito:
>
> - **VAN** (Valor Actual Neto): Si es positivo, la operación es rentable para el banco.
> - **TIR** (Tasa Interna de Retorno): Es la rentabilidad real de la operación.
> - **TCEA** (Tasa de Costo Efectivo Anual): Es lo que realmente le cuesta al cliente, incluyendo TODOS los gastos.
>
> ¿Por qué la TCEA es mayor que la TEA? Porque incluye seguros, comisiones, y todo gasto adicional. Por ley, los bancos deben informar la TCEA al cliente."

---

# PARTE 3: EJEMPLO PLAN DE PAGOS (3-4 minutos)

## 📢 Caso práctico:

> "Veamos un ejemplo real. Un cliente quiere comprar un departamento:
>
> - **Precio del inmueble:** S/ 350,000
> - **Cuota inicial (20%):** S/ 70,000
> - **Monto a financiar:** S/ 280,000
> - **Plazo:** 40 cuotas trimestrales (10 años)
> - **TEA:** 11%
> - **Período de gracia:** 4 cuotas parciales
>
> El sistema calcula:
>
> 1. **Tasa trimestral:** (1.11)^(90/360) - 1 = 2.64%
>
> 2. **Cuotas de gracia:** Solo paga intereses = 280,000 × 2.64% = **S/ 7,401** cada una
>
> 3. **Cuota fija (36 restantes):** Usando la fórmula del método francés = **S/ 12,180**
>
> 4. **Más seguros y gastos:** Cada cuota total queda aprox. **S/ 12,695**
>
> El cronograma muestra las 40 filas con: saldo inicial, amortización, interés, seguros, y cuota total."

---

# PARTE 4: EJEMPLO BONO TECHO PROPIO (3-4 minutos)

## 📢 Evaluación del bono:

> "El sistema también evalúa si el cliente puede acceder al Bono Techo Propio. Veamos cómo funciona.
>
> La función `evaluarBonoTechoPropio` revisa tres condiciones:
>
> 1. **¿Es primera vivienda?** - Si ya tiene otra propiedad, no aplica.
>
> 2. **¿Ingresos menores a S/ 3,715 mensual?** - Es el límite del programa.
>
> 3. **¿Precio de vivienda dentro del límite?** - Máximo S/ 136,000."

## 📢 Ejemplo que SÍ aplica:

> "**Caso 1:** Cliente con S/ 2,500 de ingresos, primera vivienda, precio S/ 95,000
>
> - ✅ Ingresos: 2,500 < 3,715
> - ✅ Primera vivienda: Sí
> - ✅ Precio: 95,000 < 136,000
>
> **Resultado:** Aplica al bono **VIS Lote Unifamiliar** = **S/ 50,825**
>
> El sistema también calcula el ahorro mínimo requerido: 95,000 × 3% = S/ 2,850"

## 📢 Ejemplo que NO aplica:

> "**Caso 2:** Cliente con S/ 4,500 de ingresos, primera vivienda, precio S/ 120,000
>
> - ❌ Ingresos: 4,500 > 3,715 (excede el límite)
>
> **Resultado:** No aplica. Mensaje: 'Ingresos exceden el límite de S/ 3,715'
>
> El sistema es claro en decir **por qué** no aplica, para que el cliente entienda."

## 📢 Tipos de bono:

> "Los montos de bono varían según el precio de la vivienda:
>
> | Precio Vivienda | Tipo de Bono | Monto |
> |-----------------|--------------|-------|
> | Hasta S/ 60,000 | VIS Priorizada Lote | S/ 56,710 |
> | Hasta S/ 70,000 | VIS Priorizada Multi | S/ 51,895 |
> | Hasta S/ 109,000 | VIS Lote Unifamiliar | S/ 50,825 |
> | Hasta S/ 136,000 | VIS Multifamiliar | S/ 46,545 |
>
> Todo esto está programado en la función `evaluarBonoTechoPropio` de `finance.js`."

---

# CIERRE (1 minuto)

## 📢 Resumen:

> "En resumen, nuestro sistema centraliza todos los cálculos en `finance.js`:
>
> 1. **Convierte tasas** de anual a período
> 2. **Genera cronogramas** con método francés y períodos de gracia
> 3. **Incluye seguros y costos** en cada cuota
> 4. **Calcula indicadores** VAN, TIR y TCEA
> 5. **Evalúa el Bono Techo Propio** y determina si el cliente aplica
>
> El frontend solo envía datos y muestra resultados. Todo el cálculo ocurre en el backend, garantizando consistencia y facilitando el mantenimiento.
>
> ¿Alguna pregunta?"

---

# RESPUESTAS RÁPIDAS A PREGUNTAS

| Pregunta | Respuesta |
|----------|-----------|
| ¿Por qué 360 días? | Es el año comercial, estándar financiero |
| ¿Por qué método francés? | Cuota fija, más fácil para el cliente |
| ¿Por qué centralizar cálculos? | Evita duplicación, facilita mantenimiento |
| ¿TCEA siempre mayor que TEA? | Sí, porque incluye todos los costos |
| ¿Por qué el bono tiene límites? | Es un programa social para familias de bajos ingresos |
| ¿Qué pasa si no aplica al bono? | El sistema muestra el motivo específico |

---
*Proyecto MiHogarFinanzas - Noviembre 2025*

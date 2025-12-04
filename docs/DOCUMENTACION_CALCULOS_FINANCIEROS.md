# 📊 Documentación de Cálculos Financieros - MiHogarFinanzas

## Índice
1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Flujo de Datos](#2-flujo-de-datos)
3. [Variables y Parámetros](#3-variables-y-parámetros)
4. [Fórmulas Matemáticas](#4-fórmulas-matemáticas)
5. [Ejemplos de Uso](#5-ejemplos-de-uso)
6. [Orden de Cálculo](#6-orden-de-cálculo)

---

## 1. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (HTML/JS)                          │
│  planpagos.html → indicadores.html → reportes.html                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP Request (POST/GET)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                       │
│                                                                      │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    │
│  │   Routes    │───▶│   Controllers   │───▶│   finance.js     │    │
│  │  loans.js   │    │    loan.js      │    │  (CÁLCULOS)      │    │
│  └─────────────┘    └─────────────────┘    └──────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│                     ┌─────────────────┐                             │
│                     │    Models       │                             │
│                     │  Loan, Payment  │                             │
│                     └────────┬────────┘                             │
│                              │                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               ▼
                    ┌─────────────────┐
                    │    SQLite DB    │
                    │  database.sqlite│
                    └─────────────────┘
```

### Ubicación del Módulo de Cálculos
```
src/
└── utils/
    └── finance.js  ← AQUÍ ESTÁN TODOS LOS CÁLCULOS
```

---

## 2. Flujo de Datos

### 2.1 Flujo Completo: Desde la UI hasta la Base de Datos

```
PASO 1: Usuario ingresa datos en planpagos.html
         ↓
PASO 2: Frontend envía POST a /api/loans/calculate
         ↓
PASO 3: Controller (loan.js) recibe los datos
         ↓
PASO 4: Controller llama a finance.calcularPrestamoCompleto()
         ↓
PASO 5: finance.js ejecuta cálculos en orden:
         a) periodRateFromAnnual() → Convierte TEA a TEP
         b) frenchScheduleComplete() → Genera cronograma
         c) calculateIndicadores() → Calcula VAN, TIR, TCEA
         ↓
PASO 6: Resultado se envía al frontend para mostrar
         ↓
PASO 7: Usuario confirma y guarda (POST /api/loans)
         ↓
PASO 8: Se guarda en BD: Loan + Payments
```

### 2.2 Diagrama de Dependencias de Funciones

```
calcularPrestamoCompleto()
    │
    ├──▶ nominalToEffective()      [si tipoTasa = 'nominal']
    │
    ├──▶ frenchScheduleComplete()
    │        │
    │        └──▶ periodRateFromAnnual()
    │
    └──▶ calculateIndicadores()
             │
             ├──▶ periodRateFromAnnual()
             │
             ├──▶ calculateTIR()
             │
             ├──▶ calculateVAN()
             │
             └──▶ annualRateFromPeriod()
```

---

## 3. Variables y Parámetros

### 3.1 Variables de Entrada (Input)

| Variable | Tipo | Ejemplo | Descripción |
|----------|------|---------|-------------|
| `precioInmueble` | number | 350,000 | Precio total del inmueble en la moneda seleccionada |
| `cuotaInicialPct` | number | 20 | Porcentaje de cuota inicial (%) |
| `cuotaInicialMonto` | number | 70,000 | Monto de cuota inicial (alternativa al %) |
| `bonoMonto` | number | 0 | Monto del Bono Techo Propio (si aplica) |
| `numCuotas` | number | 40 | Número total de cuotas a pagar |
| `tasaAnual` | number | 11 | Tasa de interés anual en porcentaje |
| `tipoTasa` | string | 'efectiva' | Tipo: 'efectiva' (TEA) o 'nominal' (TNA) |
| `capitalizacion` | string | 'mensual' | Solo para TNA: 'mensual', 'trimestral', etc. |
| `diasPeriodo` | number | 90 | Días por período: 30, 60, 90, 180, 360 |
| `tipoGracia` | string | 'parcial' | 'ninguno', 'total', 'parcial' |
| `periodosGracia` | number | 4 | Número de períodos de gracia |
| `tasaDescuento` | number | 20 | Tasa de descuento COK anual (%) |

### 3.2 Costos Iniciales (se financian)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `costesNotariales` | 500 | Gastos de notaría |
| `costesRegistrales` | 300 | Gastos de registro público |
| `tasacion` | 200 | Costo de tasación del inmueble |
| `comisionEstudio` | 150 | Comisión por estudio de crédito |
| `comisionActivacion` | 100 | Comisión por activación |

### 3.3 Costos Periódicos (por cada cuota)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `seguroDesgravamenPct` | 0.0450 | % mensual sobre saldo (0.045%) |
| `seguroRiesgoPctAnual` | 0.40 | % anual sobre precio inmueble (0.40%) |
| `comisionPeriodica` | 3.00 | Comisión fija por período |
| `portes` | 13.50 | Gastos administrativos por período |

### 3.4 Variables Calculadas (Output)

| Variable | Fórmula | Descripción |
|----------|---------|-------------|
| `tea` | `tasaAnual / 100` | TEA en decimal (0.11 = 11%) |
| `tasaPeriodo` | `(1 + TEA)^(días/360) - 1` | Tasa efectiva del período |
| `montoSinCostos` | `precio - cuotaInicial - bono` | Monto a financiar sin costos |
| `montoFinanciado` | `montoSinCostos + costosIniciales` | Monto total del préstamo |
| `cuotaFija` | Fórmula francesa | Cuota base (amort + interés) |
| `van` | VAN con tasa descuento | Valor Actual Neto |
| `tirPeriodo` | TIR del período | Rentabilidad por período |
| `tirAnual` | `(1 + tirPeriodo)^(360/días) - 1` | TIR anualizada |
| `tceaAnual` | TIR cliente anualizada | Costo efectivo para el cliente |

---

## 4. Fórmulas Matemáticas

### 4.1 Conversión de Tasas

#### TEA a TEP (Tasa Efectiva del Período)
```
TEP = (1 + TEA)^(días/360) - 1

Ejemplo (trimestral, 90 días, TEA = 11%):
TEP = (1 + 0.11)^(90/360) - 1
TEP = (1.11)^0.25 - 1
TEP = 1.026433 - 1
TEP = 0.026433 = 2.6433%
```

#### TNA a TEA (Nominal a Efectiva)
```
TEA = (1 + TNA/m)^m - 1

Donde m = períodos de capitalización por año
- Mensual: m = 12
- Trimestral: m = 4
- Semestral: m = 2
- Anual: m = 1

Ejemplo (TNA = 10.5%, capitalización mensual):
TEA = (1 + 0.105/12)^12 - 1
TEA = (1.00875)^12 - 1
TEA = 0.1102 = 11.02%
```

### 4.2 Método Francés (Cuota Fija)

#### Fórmula de la Cuota
```
Cuota = P × [r × (1 + r)^n] / [(1 + r)^n - 1]

Donde:
P = Monto del préstamo (saldo después de gracia)
r = Tasa del período (TEP)
n = Número de cuotas restantes (después de gracia)

Ejemplo:
P = 280,570 (saldo después de 4 períodos de gracia parcial)
r = 0.026433 (2.6433% trimestral)
n = 36 cuotas normales

Cuota = 280,570 × [0.026433 × (1.026433)^36] / [(1.026433)^36 - 1]
Cuota = 280,570 × [0.026433 × 2.5439] / [2.5439 - 1]
Cuota = 280,570 × 0.06726 / 1.5439
Cuota = 280,570 × 0.04358
Cuota = 12,226.03
```

#### Desglose de cada Cuota
```
Interés_i = Saldo_{i-1} × r
Amortización_i = Cuota - Interés_i
Saldo_i = Saldo_{i-1} - Amortización_i
```

### 4.3 Períodos de Gracia

#### Gracia Total
```
- El cliente NO paga nada
- El interés se CAPITALIZA (se suma al saldo)

Saldo_nuevo = Saldo_anterior × (1 + r)

Ejemplo:
Saldo = 280,570, r = 2.6433%
Saldo_nuevo = 280,570 × 1.026433 = 287,988.77
```

#### Gracia Parcial
```
- El cliente SOLO paga intereses
- El saldo NO cambia

Pago = Saldo × r

Ejemplo:
Saldo = 280,570, r = 2.6433%
Pago = 280,570 × 0.026433 = 7,416.71
```

### 4.4 Seguros

#### Seguro Desgravamen
```
Seguro_Desg = Saldo_Inicial × (% mensual)

Ejemplo:
Saldo = 280,570
% mensual = 0.0450% = 0.000450
Seguro_Desg = 280,570 × 0.000450 = 126.26
```

#### Seguro de Riesgo
```
Seguro_Riesgo = Precio_Inmueble × (% anual / períodos_por_año)

Ejemplo:
Precio = 350,000
% anual = 0.40% = 0.0040
Períodos por año = 4 (trimestral)
Seguro_Riesgo = 350,000 × (0.0040 / 4) = 350.00
```

### 4.5 Indicadores Financieros

#### VAN (Valor Actual Neto)
```
VAN = Σ [Flujo_t / (1 + r)^t] para t = 0 a n

Donde:
- Flujo_0 = +Monto (el banco desembolsa)
- Flujo_1 a Flujo_n = -Cuotas (el banco recibe)
- r = Tasa de descuento del período

Interpretación:
- VAN > 0: La operación genera valor (rentable)
- VAN = 0: La operación rinde exactamente el COK
- VAN < 0: La operación no alcanza el COK esperado
```

#### TIR (Tasa Interna de Retorno)
```
TIR es la tasa r que hace VAN = 0

0 = -Inversión + Σ [Flujo_i / (1 + TIR)^i]

Se calcula por método de bisección:
1. Probar r_bajo y r_alto
2. Calcular r_medio = (r_bajo + r_alto) / 2
3. Si VAN(r_medio) > 0, r_bajo = r_medio
4. Si VAN(r_medio) < 0, r_alto = r_medio
5. Repetir hasta convergencia
```

#### TCEA (Tasa de Costo Efectivo Anual)
```
TCEA = TIR anualizada desde perspectiva del CLIENTE

El cliente:
- RECIBE: Monto sin costos (precio - cuota inicial - bono)
- PAGA: Todas las cuotas con seguros y costos

TCEA_anual = (1 + TIR_período)^(360/días) - 1
```

---

## 5. Ejemplos de Uso

### 5.1 Ejemplo Completo: Crédito MiVivienda

#### Datos de Entrada
```javascript
const parametros = {
  // Inmueble
  precioInmueble: 350000,        // S/ 350,000
  moneda: 'PEN',
  
  // Financiamiento
  cuotaInicialPct: 20,           // 20%
  bonoMonto: 0,                  // Sin bono
  
  // Costos iniciales
  costesNotariales: 0,
  costesRegistrales: 0,
  tasacion: 0,
  comisionEstudio: 0,
  comisionActivacion: 0,
  
  // Costos periódicos
  seguroDesgravamenPct: 0.0450,  // 0.045% mensual
  seguroRiesgoPctAnual: 0.40,    // 0.40% anual
  comisionPeriodica: 3.00,       // S/ 3 por cuota
  portes: 13.50,                 // S/ 13.50 por cuota
  
  // Condiciones
  numCuotas: 40,                 // 40 cuotas
  tasaAnual: 11,                 // 11% TEA
  tipoTasa: 'efectiva',
  diasPeriodo: 90,               // Trimestral
  tipoGracia: 'parcial',
  periodosGracia: 4,
  
  // Indicadores
  tasaDescuento: 20              // 20% COK
};
```

#### Cálculo Paso a Paso

**Paso 1: Calcular monto a financiar**
```
Cuota Inicial = 350,000 × 20% = 70,000
Monto sin costos = 350,000 - 70,000 - 0 = 280,000
Costos iniciales = 0
Monto Financiado = 280,000 + 0 = 280,000
```

**Paso 2: Convertir tasa**
```
TEA = 11% = 0.11
TEP (trimestral) = (1 + 0.11)^(90/360) - 1 = 0.026433 = 2.6433%
```

**Paso 3: Períodos de Gracia Parcial (4 cuotas)**
```
Cuota 1: Interés = 280,000 × 2.6433% = 7,401.24
Cuota 2: Interés = 280,000 × 2.6433% = 7,401.24
Cuota 3: Interés = 280,000 × 2.6433% = 7,401.24
Cuota 4: Interés = 280,000 × 2.6433% = 7,401.24
Saldo al final: 280,000 (no cambia)
```

**Paso 4: Cuotas Normales (36 cuotas)**
```
Cuota Fija = 280,000 × [0.026433 × 1.026433^36] / [1.026433^36 - 1]
Cuota Fija = 280,000 × 0.04358 = 12,202.40
```

**Paso 5: Agregar seguros (ejemplo Cuota 5)**
```
Saldo Inicial = 280,000
Interés = 280,000 × 2.6433% = 7,401.24
Amortización = 12,202.40 - 7,401.24 = 4,801.16

Seg. Desgravamen = 280,000 × 0.00045 = 126.00
Seg. Riesgo = 350,000 × (0.004/4) = 350.00
Comisión = 3.00
Portes = 13.50

Cuota Total = 12,202.40 + 126.00 + 350.00 + 3.00 + 13.50 = 12,694.90
Saldo Final = 280,000 - 4,801.16 = 275,198.84
```

#### Resultado Esperado
```javascript
{
  resumen: {
    precioInmueble: 350000,
    cuotaInicial: 70000,
    montoFinanciado: 280000,
    numCuotas: 40,
    tea: 0.11,
    tasaPeriodo: 0.026433
  },
  totales: {
    amortizacion: 280000.00,
    interes: 181987.81,        // Total intereses
    seguroDesgravamen: 3190.57,
    seguroRiesgo: 14000.00,
    comisiones: 120.00,
    portes: 540.00,
    cuotaTotal: 479838.38
  },
  indicadores: {
    van: 15234.56,             // Positivo = rentable
    tirPeriodo: 0.0285,        // 2.85% trimestral
    tirAnual: 0.1186,          // 11.86% anual
    tceaAnual: 0.1542          // 15.42% costo cliente
  }
}
```

---

## 6. Orden de Cálculo

### Diagrama de Flujo de Cálculo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA DE DATOS                             │
│  precioInmueble, tasaAnual, numCuotas, diasPeriodo, etc.       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: PREPARACIÓN DE TASAS                                   │
│                                                                 │
│ Si tipoTasa = 'nominal':                                       │
│   TEA = nominalToEffective(TNA, capitalizacion)                │
│ Sino:                                                          │
│   TEA = tasaAnual / 100                                        │
│                                                                 │
│ TEP = periodRateFromAnnual(TEA, diasPeriodo)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: CÁLCULO DEL MONTO                                      │
│                                                                 │
│ cuotaInicial = precioInmueble × (cuotaInicialPct / 100)       │
│ montoSinCostos = precioInmueble - cuotaInicial - bonoMonto    │
│ costosIniciales = notariales + registrales + tasacion + ...   │
│ montoFinanciado = montoSinCostos + costosIniciales            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: PERÍODOS DE GRACIA                                     │
│                                                                 │
│ Para i = 1 hasta periodosGracia:                               │
│   interes = saldo × TEP                                        │
│                                                                 │
│   Si tipoGracia = 'total':                                     │
│     saldo = saldo + interes  (se capitaliza)                   │
│     cuotaBase = 0                                              │
│   Si tipoGracia = 'parcial':                                   │
│     saldo = saldo  (no cambia)                                 │
│     cuotaBase = interes                                        │
│                                                                 │
│   Agregar seguros y costos periódicos                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: CUOTA FIJA MÉTODO FRANCÉS                              │
│                                                                 │
│ periodosRestantes = numCuotas - periodosGracia                 │
│                                                                 │
│ cuotaFija = saldo × [TEP × (1+TEP)^n] / [(1+TEP)^n - 1]       │
│                                                                 │
│ (saldo aquí es el saldo después de la gracia)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: GENERAR CUOTAS NORMALES                                │
│                                                                 │
│ Para i = periodosGracia+1 hasta numCuotas:                     │
│   interes = saldo × TEP                                        │
│   amortizacion = cuotaFija - interes                           │
│                                                                 │
│   Si es última cuota:                                          │
│     amortizacion = saldo  (ajuste para cerrar en 0)            │
│                                                                 │
│   saldo = saldo - amortizacion                                 │
│   cuotaBase = amortizacion + interes                           │
│                                                                 │
│   segDesgravamen = saldoInicial × seguroDesgravamenPct         │
│   segRiesgo = precioInmueble × (seguroRiesgoAnual/periodos)    │
│                                                                 │
│   cuotaTotal = cuotaBase + segDesgravamen + segRiesgo +        │
│                comisionPeriodica + portes                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 6: CALCULAR INDICADORES                                   │
│                                                                 │
│ flujos = [cuotaTotal_1, cuotaTotal_2, ..., cuotaTotal_n]      │
│                                                                 │
│ tasaDescPeriodo = periodRateFromAnnual(COK, diasPeriodo)       │
│                                                                 │
│ // TIR (perspectiva banco)                                     │
│ tirPeriodo = calculateTIR(montoFinanciado, flujos)             │
│ tirAnual = annualRateFromPeriod(tirPeriodo, diasPeriodo)       │
│                                                                 │
│ // VAN                                                         │
│ van = calculateVAN(montoFinanciado, flujos, tasaDescPeriodo)   │
│                                                                 │
│ // TCEA (perspectiva cliente)                                  │
│ tceaPeriodo = calculateTIR(montoSinCostos, flujos)             │
│ tceaAnual = annualRateFromPeriod(tceaPeriodo, diasPeriodo)     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 7: RETORNAR RESULTADO                                     │
│                                                                 │
│ return {                                                        │
│   resumen: { precioInmueble, cuotaInicial, montoFinanciado...} │
│   cuotas: { cuotaBase, cuotaTotal }                            │
│   schedule: [ {cuota1}, {cuota2}, ... ]                        │
│   totales: { amortizacion, interes, seguros... }               │
│   indicadores: { van, tirPeriodo, tirAnual, tceaAnual }        │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Apéndice: Código de Referencia

### Función Principal: calcularPrestamoCompleto()

```javascript
// Ubicación: src/utils/finance.js

exports.calcularPrestamoCompleto = (params) => {
  // 1. Extraer parámetros
  const { precioInmueble, cuotaInicialPct, bonoMonto, ... } = params;
  
  // 2. Calcular cuota inicial
  const cuotaInicial = precioInmueble * (cuotaInicialPct / 100);
  
  // 3. Calcular montos
  const montoSinCostos = precioInmueble - cuotaInicial - bonoMonto;
  const montoFinanciado = montoSinCostos + costosIniciales;
  
  // 4. Convertir tasa si es nominal
  let tasaEfectiva = tea;
  if (tipoTasa === 'nominal') {
    tasaEfectiva = exports.nominalToEffective(tea, capitalizacion);
  }
  
  // 5. Generar cronograma
  const resultado = exports.frenchScheduleComplete({...});
  
  // 6. Calcular indicadores
  const indicadores = exports.calculateIndicadores({...});
  
  // 7. Retornar todo
  return { resumen, cuotas, schedule, totales, indicadores };
};
```

---

## Glosario de Términos

| Término | Significado |
|---------|-------------|
| **TEA** | Tasa Efectiva Anual |
| **TEP** | Tasa Efectiva del Período |
| **TNA** | Tasa Nominal Anual |
| **TEM** | Tasa Efectiva Mensual |
| **VAN** | Valor Actual Neto |
| **TIR** | Tasa Interna de Retorno |
| **TCEA** | Tasa de Costo Efectivo Anual |
| **COK** | Costo de Oportunidad del Capital |
| **Método Francés** | Sistema de cuota fija (amort + interés constante) |
| **Gracia Total** | No se paga nada, intereses se capitalizan |
| **Gracia Parcial** | Solo se pagan intereses |

---

*Documento generado para el proyecto MiHogarFinanzas*
*Fecha: Noviembre 2025*

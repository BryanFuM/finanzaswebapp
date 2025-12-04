/**
 * FINANCE.JS - Módulo centralizado de cálculos financieros
 * 
 * Este módulo contiene TODAS las funciones de cálculo financiero usadas en la aplicación.
 * Los HTMLs del frontend solo deben mostrar datos, no calcular.
 * 
 * Convenciones:
 * - Año comercial: 360 días
 * - Período mensual: 30 días
 * - Tasas: siempre en decimal (0.11 = 11%)
 */

// ============================================================
// CONVERSIÓN DE TASAS
// ============================================================

/**
 * Convierte tasa efectiva anual a tasa del período
 * TEP = (1 + TEA)^(días/360) - 1
 * @param {number} annualRate - TEA en decimal (ej: 0.11 para 11%)
 * @param {number} diasPeriodo - Días del período (30, 60, 90, 180, 360)
 * @returns {number} Tasa efectiva del período
 */
exports.periodRateFromAnnual = (annualRate, diasPeriodo = 30) => {
  return Math.pow(1 + annualRate, diasPeriodo / 360) - 1;
};

/**
 * Convierte tasa efectiva anual a tasa mensual (30 días)
 * @param {number} annualRate - TEA en decimal
 * @returns {number} TEM
 */
exports.monthlyRateFromAnnual = (annualRate) => {
  return exports.periodRateFromAnnual(annualRate, 30);
};

/**
 * Convierte tasa del período a tasa efectiva anual
 * TEA = (1 + TEP)^(360/días) - 1
 * @param {number} periodRate - TEP en decimal
 * @param {number} diasPeriodo - Días del período
 * @returns {number} TEA
 */
exports.annualRateFromPeriod = (periodRate, diasPeriodo = 30) => {
  return Math.pow(1 + periodRate, 360 / diasPeriodo) - 1;
};

/**
 * Convierte tasa nominal anual a tasa efectiva anual
 * TEA = (1 + TNA/m)^m - 1
 * @param {number} nominalRate - TNA en decimal
 * @param {string} capitalizacion - 'mensual', 'trimestral', 'semestral', 'anual'
 * @returns {number} TEA
 */
exports.nominalToEffective = (nominalRate, capitalizacion) => {
  const periodos = {
    'mensual': 12,
    'trimestral': 4,
    'semestral': 2,
    'anual': 1
  };
  const m = periodos[capitalizacion] || 12;
  return Math.pow(1 + nominalRate / m, m) - 1;
};

// ============================================================
// CRONOGRAMA - MÉTODO FRANCÉS
// ============================================================

/**
 * Genera cronograma de pagos método francés con frecuencia variable
 * @param {object} params - Parámetros del préstamo
 * @param {number} params.monto - Monto del préstamo
 * @param {number} params.numCuotas - Número total de cuotas
 * @param {number} params.tea - Tasa Efectiva Anual en decimal
 * @param {number} params.diasPeriodo - Días por período (30, 60, 90, 180, 360)
 * @param {string} params.tipoGracia - 'ninguno', 'total', 'parcial'
 * @param {number} params.periodosGracia - Número de períodos de gracia
 * @param {number} params.precioInmueble - Precio del inmueble (para seguro riesgo)
 * @param {number} params.seguroDesgravamenPct - % mensual seguro desgravamen
 * @param {number} params.seguroRiesgoPctAnual - % anual seguro riesgo sobre inmueble
 * @param {number} params.comisionPeriodica - Comisión fija por período
 * @param {number} params.portes - Portes/gastos fijos por período
 * @returns {object} { cuota, tasaPeriodo, schedule, totales }
 */
exports.frenchScheduleComplete = (params) => {
  const {
    monto,
    numCuotas,
    tea,
    diasPeriodo = 30,
    tipoGracia = 'ninguno',
    periodosGracia = 0,
    precioInmueble = 0,
    seguroDesgravamenPct = 0,
    seguroRiesgoPctAnual = 0,
    comisionPeriodica = 0,
    portes = 0
  } = params;

  // Calcular tasa del período
  const tasaPeriodo = exports.periodRateFromAnnual(tea, diasPeriodo);
  const periodosPorAnio = 360 / diasPeriodo;
  
  // Seguro riesgo: convertir de anual a período
  const seguroRiesgoPctPeriodo = seguroRiesgoPctAnual / periodosPorAnio;

  let saldo = monto;
  const schedule = [];

  // Totales acumulados
  let totalAmortizacion = 0;
  let totalInteres = 0;
  let totalSeguroDesgravamen = 0;
  let totalSeguroRiesgo = 0;
  let totalComisiones = 0;
  let totalPortes = 0;
  let totalCuotaBase = 0;
  let totalCuotaCompleta = 0;

  // ==========================================
  // PERÍODOS DE GRACIA
  // ==========================================
  for (let i = 1; i <= periodosGracia; i++) {
    const saldoInicial = saldo;
    const interes = saldo * tasaPeriodo;

    let amortizacion = 0;
    let cuotaBase = 0;

    if (tipoGracia === 'total') {
      // Gracia total: no paga nada, interés se capitaliza al saldo
      saldo += interes;
      cuotaBase = 0;
    } else if (tipoGracia === 'parcial') {
      // Gracia parcial: paga solo intereses
      cuotaBase = interes;
    }

    // Seguros y costos (siempre se pagan)
    const segDesgravamen = saldoInicial * seguroDesgravamenPct;
    const segRiesgo = precioInmueble * seguroRiesgoPctPeriodo;
    const cuotaTotal = cuotaBase + segDesgravamen + segRiesgo + comisionPeriodica + portes;

    // Acumular totales
    totalInteres += (tipoGracia === 'parcial') ? interes : 0;
    totalSeguroDesgravamen += segDesgravamen;
    totalSeguroRiesgo += segRiesgo;
    totalComisiones += comisionPeriodica;
    totalPortes += portes;
    totalCuotaBase += cuotaBase;
    totalCuotaCompleta += cuotaTotal;

    schedule.push({
      installment_number: i,
      tipo: tipoGracia === 'total' ? 'Gracia Total' : 'Gracia Parcial',
      saldoInicial: Number(saldoInicial.toFixed(2)),
      amortization: 0,
      interest: tipoGracia === 'parcial' ? Number(interes.toFixed(2)) : 0,
      cuotaBase: Number(cuotaBase.toFixed(2)),
      seguroDesgravamen: Number(segDesgravamen.toFixed(2)),
      seguroRiesgo: Number(segRiesgo.toFixed(2)),
      comision: comisionPeriodica,
      portes: portes,
      total: Number(cuotaTotal.toFixed(2)),
      balance: Number(saldo.toFixed(2))
    });
  }

  // ==========================================
  // PERÍODOS NORMALES (MÉTODO FRANCÉS)
  // ==========================================
  const periodosRestantes = numCuotas - periodosGracia;
  
  if (periodosRestantes <= 0) {
    return { 
      cuota: 0, 
      tasaPeriodo, 
      schedule, 
      totales: {
        amortizacion: 0,
        interes: totalInteres,
        seguroDesgravamen: totalSeguroDesgravamen,
        seguroRiesgo: totalSeguroRiesgo,
        comisiones: totalComisiones,
        portes: totalPortes,
        cuotaBase: totalCuotaBase,
        cuotaTotal: totalCuotaCompleta
      }
    };
  }

  // Calcular cuota fija (amortización + interés) para períodos restantes
  const cuotaFija = saldo * (tasaPeriodo * Math.pow(1 + tasaPeriodo, periodosRestantes)) / 
                    (Math.pow(1 + tasaPeriodo, periodosRestantes) - 1);

  for (let i = periodosGracia + 1; i <= numCuotas; i++) {
    const saldoInicial = saldo;
    const interes = saldo * tasaPeriodo;
    let amortizacion = cuotaFija - interes;

    // En la última cuota, ajustar amortización para que saldo = 0
    if (i === numCuotas) {
      amortizacion = saldo;
    }

    saldo = Math.max(0, saldo - amortizacion);
    const cuotaBase = (i === numCuotas) ? amortizacion + interes : cuotaFija;

    // Seguros y costos
    const segDesgravamen = saldoInicial * seguroDesgravamenPct;
    const segRiesgo = precioInmueble * seguroRiesgoPctPeriodo;
    const cuotaTotal = cuotaBase + segDesgravamen + segRiesgo + comisionPeriodica + portes;

    // Acumular totales
    totalAmortizacion += amortizacion;
    totalInteres += interes;
    totalSeguroDesgravamen += segDesgravamen;
    totalSeguroRiesgo += segRiesgo;
    totalComisiones += comisionPeriodica;
    totalPortes += portes;
    totalCuotaBase += cuotaBase;
    totalCuotaCompleta += cuotaTotal;

    schedule.push({
      installment_number: i,
      tipo: 'Normal',
      saldoInicial: Number(saldoInicial.toFixed(2)),
      amortization: Number(amortizacion.toFixed(2)),
      interest: Number(interes.toFixed(2)),
      cuotaBase: Number(cuotaBase.toFixed(2)),
      seguroDesgravamen: Number(segDesgravamen.toFixed(2)),
      seguroRiesgo: Number(segRiesgo.toFixed(2)),
      comision: comisionPeriodica,
      portes: portes,
      total: Number(cuotaTotal.toFixed(2)),
      balance: Number(saldo.toFixed(2))
    });
  }

  return {
    cuota: Number(cuotaFija.toFixed(2)),
    tasaPeriodo,
    schedule,
    totales: {
      amortizacion: Number(totalAmortizacion.toFixed(2)),
      interes: Number(totalInteres.toFixed(2)),
      seguroDesgravamen: Number(totalSeguroDesgravamen.toFixed(2)),
      seguroRiesgo: Number(totalSeguroRiesgo.toFixed(2)),
      comisiones: Number(totalComisiones.toFixed(2)),
      portes: Number(totalPortes.toFixed(2)),
      cuotaBase: Number(totalCuotaBase.toFixed(2)),
      cuotaTotal: Number(totalCuotaCompleta.toFixed(2))
    }
  };
};

/**
 * Plan de pagos método francés (versión simplificada para compatibilidad)
 * @param {number} amount - Monto del préstamo
 * @param {number} months - Plazo total en meses
 * @param {number} annualRate - TEA en decimal
 * @param {object} options - { tipoGracia, mesesGracia }
 * @returns {object} { cuota, schedule }
 */
exports.frenchSchedule = (amount, months, annualRate, options = {}) => {
  const { tipoGracia = 'ninguno', mesesGracia = 0 } = options;
  
  const result = exports.frenchScheduleComplete({
    monto: amount,
    numCuotas: months,
    tea: annualRate,
    diasPeriodo: 30,
    tipoGracia,
    periodosGracia: mesesGracia
  });

  // Adaptar formato para compatibilidad
  const schedule = result.schedule.map(s => ({
    installment_number: s.installment_number,
    amortization: s.amortization,
    interest: s.interest,
    total: s.cuotaBase, // Solo amort + interés
    balance: s.balance,
    tipo: s.tipo === 'Gracia Total' ? 'gracia_total' : 
          s.tipo === 'Gracia Parcial' ? 'gracia_parcial' : 'normal'
  }));

  return { cuota: result.cuota, schedule };
};

// ============================================================
// INDICADORES FINANCIEROS
// ============================================================

/**
 * Calcula TIR (Tasa Interna de Retorno) usando bisección
 * @param {number} inversion - Inversión inicial (positivo)
 * @param {number[]} flujos - Array de flujos de caja
 * @returns {number} TIR del período
 */
exports.calculateTIR = (inversion, flujos) => {
  if (!inversion || inversion <= 0 || !flujos || flujos.length === 0) {
    return 0;
  }

  // NPV = -Inversión + Σ(Flujo_i / (1+r)^i)
  const npv = (r) => {
    if (r <= -1) return Infinity;
    let sum = -inversion;
    for (let i = 0; i < flujos.length; i++) {
      sum += flujos[i] / Math.pow(1 + r, i + 1);
    }
    return sum;
  };

  // Buscar TIR con bisección
  let low = -0.5, high = 2, mid;

  // Ajustar rango si es necesario
  const npvLow = npv(low);
  const npvHigh = npv(high);
  
  if ((npvLow > 0 && npvHigh > 0) || (npvLow < 0 && npvHigh < 0)) {
    for (let testHigh = 0.5; testHigh <= 5; testHigh += 0.5) {
      if (npv(-0.3) > 0 && npv(testHigh) < 0) {
        low = -0.3;
        high = testHigh;
        break;
      }
    }
  }

  // Bisección (100 iteraciones para precisión)
  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    if (npv(mid) > 0) low = mid;
    else high = mid;
  }

  return mid;
};

/**
 * Calcula VAN (Valor Actual Neto)
 * VAN = Σ(Flujo_t / (1+r)^t) para t = 0 a n
 * Flujo 0 = inversión (positivo para quien recibe)
 * @param {number} inversion - Monto de la inversión
 * @param {number[]} flujos - Flujos futuros (cuotas que se reciben)
 * @param {number} tasaPeriodo - Tasa de descuento del período
 * @returns {number} VAN
 */
exports.calculateVAN = (inversion, flujos, tasaPeriodo) => {
  // Flujo 0: cliente recibe el dinero (+)
  // Flujos 1-n: cliente paga cuotas (-)
  let van = inversion; // Flujo 0
  for (let i = 0; i < flujos.length; i++) {
    van -= flujos[i] / Math.pow(1 + tasaPeriodo, i + 1);
  }
  return van;
};

/**
 * Calcula TCEA (Tasa de Costo Efectivo Anual)
 * Es la TIR anualizada desde la perspectiva del cliente
 * @param {number} montoRecibido - Lo que el cliente recibe (sin costos financiados)
 * @param {number[]} cuotasTotales - Todas las cuotas que paga
 * @param {number} diasPeriodo - Días por período
 * @returns {number} TCEA anual
 */
exports.calculateTCEA = (montoRecibido, cuotasTotales, diasPeriodo = 30) => {
  const tirPeriodo = exports.calculateTIR(montoRecibido, cuotasTotales);
  return exports.annualRateFromPeriod(tirPeriodo, diasPeriodo);
};

/**
 * Calcula todos los indicadores financieros de un préstamo
 * @param {object} params - Parámetros
 * @param {number} params.montoRecibido - Monto que recibe el cliente (precio - cuota inicial - bono)
 * @param {number} params.montoFinanciado - Monto total financiado (incluyendo costos)
 * @param {number[]} params.cuotasTotales - Array de cuotas totales
 * @param {number} params.tasaDescuentoAnual - COK anual
 * @param {number} params.diasPeriodo - Días por período
 * @returns {object} { van, tirPeriodo, tirAnual, tceaAnual }
 */
exports.calculateIndicadores = (params) => {
  const {
    montoRecibido,
    montoFinanciado,
    cuotasTotales,
    tasaDescuentoAnual,
    diasPeriodo = 30
  } = params;

  const periodosPorAnio = 360 / diasPeriodo;
  const tasaDescuentoPeriodo = exports.periodRateFromAnnual(tasaDescuentoAnual, diasPeriodo);

  // TIR: Rentabilidad de la operación (perspectiva banco)
  const tirPeriodo = exports.calculateTIR(montoFinanciado, cuotasTotales);
  const tirAnual = exports.annualRateFromPeriod(tirPeriodo, diasPeriodo);

  // VAN: Valor presente neto
  const van = exports.calculateVAN(montoFinanciado, cuotasTotales, tasaDescuentoPeriodo);

  // TCEA: Costo para el cliente (usa monto recibido, no financiado)
  const tceaPeriodo = exports.calculateTIR(montoRecibido, cuotasTotales);
  const tceaAnual = exports.annualRateFromPeriod(tceaPeriodo, diasPeriodo);

  return {
    van: Number(van.toFixed(2)),
    tirPeriodo,
    tirAnual,
    tceaAnual,
    tasaDescuentoPeriodo
  };
};

// ============================================================
// BONO TECHO PROPIO
// ============================================================

/**
 * Evalúa elegibilidad y monto del Bono Techo Propio
 * @param {object} params - Parámetros
 * @param {number} params.ingresos - Ingresos mensuales del cliente
 * @param {boolean} params.esPrimeraVivienda - Si es primera vivienda
 * @param {number} params.precioViviendaSoles - Precio de la vivienda en soles
 * @returns {object} { aplica, monto, tipo, descripcion, mensaje }
 */
exports.evaluarBonoTechoPropio = (params) => {
  const { ingresos, esPrimeraVivienda, precioViviendaSoles } = params;
  
  const LIMITE_INGRESOS = 3715; // S/ 3,715 mensual

  // No aplica si no es primera vivienda
  if (!esPrimeraVivienda) {
    return {
      aplica: false,
      monto: 0,
      tipo: null,
      descripcion: null,
      mensaje: 'El cliente ya posee otra vivienda'
    };
  }

  // No aplica si ingresos exceden límite
  if (ingresos > LIMITE_INGRESOS) {
    return {
      aplica: false,
      monto: 0,
      tipo: null,
      descripcion: null,
      mensaje: `Ingresos S/ ${ingresos.toLocaleString()} exceden el límite de S/ ${LIMITE_INGRESOS.toLocaleString()}`
    };
  }

  // Determinar tipo de bono según precio de vivienda
  let monto = 0;
  let tipo = '';
  let descripcion = '';

  if (precioViviendaSoles <= 60000) {
    monto = 56710;
    tipo = 'VIS Priorizada Lote';
    descripcion = 'Vivienda hasta S/ 60,000';
  } else if (precioViviendaSoles <= 70000) {
    monto = 51895;
    tipo = 'VIS Priorizada Multi';
    descripcion = 'Vivienda hasta S/ 70,000';
  } else if (precioViviendaSoles <= 109000) {
    monto = 50825;
    tipo = 'VIS Lote Unifamiliar';
    descripcion = 'Vivienda hasta S/ 109,000';
  } else if (precioViviendaSoles <= 136000) {
    monto = 46545;
    tipo = 'VIS Multifamiliar';
    descripcion = 'Vivienda hasta S/ 136,000';
  } else {
    return {
      aplica: false,
      monto: 0,
      tipo: null,
      descripcion: null,
      mensaje: `Vivienda S/ ${precioViviendaSoles.toLocaleString()} excede el límite de S/ 136,000`
    };
  }

  // Ahorro mínimo requerido
  const ahorroMinimo = precioViviendaSoles <= 70000 
    ? precioViviendaSoles * 0.01 
    : precioViviendaSoles * 0.03;

  return {
    aplica: true,
    monto,
    tipo,
    descripcion,
    ahorroMinimo: Number(ahorroMinimo.toFixed(2)),
    mensaje: `Aplica ${tipo}: S/ ${monto.toLocaleString()}`
  };
};

// ============================================================
// CÁLCULO COMPLETO DE PRÉSTAMO
// ============================================================

/**
 * Calcula un préstamo completo con todos sus componentes
 * Esta función centraliza TODO el cálculo financiero
 * @param {object} params - Todos los parámetros del préstamo
 * @returns {object} Resultado completo con cronograma e indicadores
 */
exports.calcularPrestamoCompleto = (params) => {
  const {
    // Datos básicos
    precioInmueble,
    cuotaInicialPct = 0,
    cuotaInicialMonto = 0,
    bonoMonto = 0,
    
    // Costos iniciales
    costesNotariales = 0,
    costesRegistrales = 0,
    tasacion = 0,
    comisionEstudio = 0,
    comisionActivacion = 0,
    
    // Costos periódicos
    seguroDesgravamenPct = 0, // % mensual
    seguroRiesgoPctAnual = 0, // % anual
    comisionPeriodica = 0,
    portes = 0,
    
    // Condiciones del préstamo
    numCuotas,
    tea, // TEA en decimal
    tipoTasa = 'efectiva',
    capitalizacion = 'mensual',
    diasPeriodo = 30,
    tipoGracia = 'ninguno',
    periodosGracia = 0,
    
    // Indicadores
    tasaDescuentoAnual = 0.20
  } = params;

  // 1. Calcular cuota inicial
  const cuotaInicial = cuotaInicialMonto > 0 
    ? cuotaInicialMonto 
    : precioInmueble * (cuotaInicialPct / 100);

  // 2. Monto a financiar (sin costos iniciales)
  const montoSinCostos = Math.max(0, precioInmueble - cuotaInicial - bonoMonto);
  
  // 3. Costos iniciales totales
  const costosIniciales = costesNotariales + costesRegistrales + tasacion + 
                          comisionEstudio + comisionActivacion;
  
  // 4. Monto total del préstamo (financiando costos)
  const montoFinanciado = montoSinCostos + costosIniciales;

  // 5. Convertir tasa si es nominal
  let tasaEfectiva = tea;
  if (tipoTasa === 'nominal') {
    tasaEfectiva = exports.nominalToEffective(tea, capitalizacion);
  }

  // 6. Generar cronograma completo
  const resultado = exports.frenchScheduleComplete({
    monto: montoFinanciado,
    numCuotas,
    tea: tasaEfectiva,
    diasPeriodo,
    tipoGracia,
    periodosGracia,
    precioInmueble,
    seguroDesgravamenPct,
    seguroRiesgoPctAnual,
    comisionPeriodica,
    portes
  });

  // 7. Calcular indicadores
  const cuotasTotales = resultado.schedule.map(s => s.total);
  const indicadores = exports.calculateIndicadores({
    montoRecibido: montoSinCostos, // Lo que realmente "vale" para el cliente
    montoFinanciado,
    cuotasTotales,
    tasaDescuentoAnual,
    diasPeriodo
  });

  // 8. Obtener primera cuota normal para referencia
  const primeraCuotaNormal = resultado.schedule.find(s => s.tipo === 'Normal');

  return {
    // Resumen del préstamo
    resumen: {
      precioInmueble,
      cuotaInicial,
      bonoMonto,
      montoSinCostos,
      costosIniciales,
      montoFinanciado,
      numCuotas,
      diasPeriodo,
      tea: tasaEfectiva,
      tasaPeriodo: resultado.tasaPeriodo,
      periodosGracia,
      tipoGracia
    },
    
    // Cuota de referencia
    cuotas: {
      cuotaBase: resultado.cuota,
      cuotaTotal: primeraCuotaNormal ? primeraCuotaNormal.total : 0
    },
    
    // Cronograma completo
    schedule: resultado.schedule,
    
    // Totales
    totales: resultado.totales,
    
    // Indicadores financieros
    indicadores: {
      van: indicadores.van,
      tirPeriodo: indicadores.tirPeriodo,
      tirAnual: indicadores.tirAnual,
      tceaAnual: indicadores.tceaAnual
    }
  };
};

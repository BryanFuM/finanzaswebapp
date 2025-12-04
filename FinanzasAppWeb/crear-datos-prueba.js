const http = require('http');

const API_BASE = 'http://localhost:4000/api';

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log('=== CREANDO DATOS DE PRUEBA PARA COMPARAR CON EXCEL ===\n');
  
  // 1. Login (usa email, no username)
  console.log('1. Iniciando sesión...');
  const login = await request('POST', '/auth/login', { email: 'admin@admin.com', password: 'admin123' });
  if (!login.token) {
    console.log('   ❌ Error de login:', login.message || login);
    console.log('   Intentando registrar usuario admin...');
    const reg = await request('POST', '/auth/register', { 
      name: 'Administrador', 
      email: 'admin@admin.com', 
      password: 'admin123' 
    });
    console.log('   Registro:', reg);
    const login2 = await request('POST', '/auth/login', { email: 'admin@admin.com', password: 'admin123' });
    if (!login2.token) {
      console.log('   ❌ No se pudo iniciar sesión');
      return;
    }
    login.token = login2.token;
  }
  const token = login.token;
  console.log('   ✅ Token obtenido\n');
  
  // 2. Crear cliente
  console.log('2. Creando cliente...');
  const client = await request('POST', '/clients', {
    full_name: 'Juan Carlos Pérez García',
    dni: '12345678',
    email: 'juan.perez@email.com',
    phone: '999888777',
    address: 'Av. Javier Prado 1234, San Isidro, Lima',
    income: 15000
  }, token);
  console.log(`   ✅ Cliente creado: ID ${client.id} - ${client.full_name}\n`);
  
  // 3. Crear propiedad (Precio 350,000)
  console.log('3. Creando propiedad...');
  const property = await request('POST', '/properties', {
    project_name: 'Residencial Los Jardines',
    address: 'Av. La Molina 456, La Molina',
    area: 120,
    price: 350000,
    currency: 'PEN',
    bedrooms: 3,
    bathrooms: 2,
    status: 'available'
  }, token);
  console.log(`   ✅ Propiedad creada: ID ${property.id} - ${property.project_name} - S/ ${property.price}\n`);
  
  // 4. Crear préstamo con los datos del Excel
  console.log('4. Creando préstamo con datos del Excel...');
  console.log('   Datos:');
  console.log('   - Monto original: S/ 350,000');
  console.log('   - Cuota inicial 20%: S/ 70,000');
  console.log('   - Saldo a financiar: S/ 280,000');
  console.log('   - Plazo: 120 meses (10 años)');
  console.log('   - TEA: 11%');
  console.log('   - Tasa de descuento (COK): 20%');
  console.log('   - Sin periodo de gracia');
  
  const loan = await request('POST', '/loans', {
    clientId: client.id,
    propertyId: property.id,
    amount: 280000,        // Monto a financiar (ya restada cuota inicial)
    term_months: 120,      // 10 años
    annual_rate: 11,       // TEA 11%
    start_date: '2025-01-01',
    bono_techo: false,
    bono_monto: 0,
    tipo_tasa: 'efectiva',
    capitalizacion: 'mensual',
    periodo_gracia: 'ninguno',
    meses_gracia: 0,
    moneda: 'PEN',
    tasa_descuento: 20     // COK 20%
  }, token);
  
  console.log(`\n   ✅ Préstamo creado: ID ${loan.loan.id}`);
  console.log(`   ✅ Cuota mensual calculada: S/ ${loan.cuota.toFixed(2)}`);
  console.log(`   ✅ TEA guardada: ${(loan.tasaEfectivaAnual * 100).toFixed(2)}%\n`);
  
  // 5. Mostrar valores esperados del Excel
  console.log('=== VALORES ESPERADOS (EXCEL) ===');
  console.log('Cuota mensual: S/ 3,775.28 (aprox)');
  console.log('Total intereses: S/ 173,033.84');
  console.log('Tasa descuento mensual: 1.53095%');
  console.log('TIR mensual: 0.87346%');
  console.log('TCEA: 11.00%');
  console.log('VAN: S/ 74,578.03\n');
  
  console.log('=== INSTRUCCIONES ===');
  console.log('1. Abre http://localhost:4000/login.html');
  console.log('2. Inicia sesión con: admin / admin123');
  console.log('3. Ve a "Indicadores" y selecciona el préstamo #' + loan.loan.id);
  console.log('4. Compara los valores con el Excel');
  console.log('\n¡Listo! Los datos de prueba han sido creados.');
}

main().catch(console.error);

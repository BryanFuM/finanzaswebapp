const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const storage = process.env.DB_STORAGE || './database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storage,
  logging: false,
  define: { timestamps: true }
});

// import models
const User = require('./user')(sequelize, DataTypes);
const Client = require('./client')(sequelize, DataTypes);
const Property = require('./property')(sequelize, DataTypes);
const CreditConfig = require('./creditConfig')(sequelize, DataTypes);
const Loan = require('./loan')(sequelize, DataTypes);
const Payment = require('./payment')(sequelize, DataTypes);

// Relations
User.hasMany(Client, { foreignKey: 'userId' });
Client.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(CreditConfig, { foreignKey: 'userId' });
CreditConfig.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(Loan, { foreignKey: 'clientId' });
Loan.belongsTo(Client, { foreignKey: 'clientId' });

Property.hasMany(Loan, { foreignKey: 'propertyId' });
Loan.belongsTo(Property, { foreignKey: 'propertyId' });

CreditConfig.hasMany(Loan, { foreignKey: 'creditConfigId' });
Loan.belongsTo(CreditConfig, { foreignKey: 'creditConfigId' });

Loan.hasMany(Payment, { foreignKey: 'loanId' });
Payment.belongsTo(Loan, { foreignKey: 'loanId' });

async function seedIfNeeded(){
  const users = await User.count();
  if(users > 0) return;
  console.log('Seeding initial data...');
  const bcrypt = require('bcrypt');
  const pw = await bcrypt.hash('Password123', 10);
  const admin = await User.create({ name:'Admin Demo', email:'admin@demo.com', password_hash: pw, role: 'admin' });
  const asesor1 = await User.create({ name:'Asesor 1', email:'asesor1@demo.com', password_hash: pw });
  const asesor2 = await User.create({ name:'Asesor 2', email:'asesor2@demo.com', password_hash: pw });
  const asesor3 = await User.create({ name:'Asesor 3', email:'asesor3@demo.com', password_hash: pw });

  await Client.bulkCreate([
    { userId: asesor1.id, full_name: 'Carlos Perez', dni:'12345678', email:'carlos@example.com', phone:'999111222', income:2500, marital_status:'Soltero' },
    { userId: asesor1.id, full_name: 'María Ruiz', dni:'87654321', email:'mruiz@example.com', phone:'999333444', income:3200, marital_status:'Casado' },
    { userId: asesor2.id, full_name: 'José López', dni:'11223344', email:'jlopez@example.com', phone:'999555666', income:1800, marital_status:'Divorciado' },
    { userId: asesor3.id, full_name: 'Ana Torres', dni:'44332211', email:'atorres@example.com', phone:'999777888', income:4000, marital_status:'Casado' }
  ]);

  await Property.bulkCreate([
    { project_name:'Residencial Sol', address:'Av. Principal 123', area:75.5, rooms:3, price:150000, currency:'PEN', status:'Disponible' },
    { project_name:'Torre Verde', address:'Calle 45 B', area:60.0, rooms:2, price:120000, currency:'PEN', status:'Reservado' },
    { project_name:'Condominio Mar', address:'Muelle 7', area:90.2, rooms:4, price:220000, currency:'PEN', status:'Disponible' }
  ]);

  await CreditConfig.bulkCreate([
    { userId: asesor1.id, moneda:'PEN', tipo_tasa:'efectiva', capitalizacion:'mensual', periodo_gracia:'ninguno' },
    { userId: asesor2.id, moneda:'USD', tipo_tasa:'nominal', capitalizacion:'mensual', periodo_gracia:'parcial' }
  ]);

  console.log('Seeding complete.');
}

module.exports = { sequelize, User, Client, Property, CreditConfig, Loan, Payment, seedIfNeeded };

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const dbModule = require('./db');
// dbModule exports different shapes depending on backend: when using SQLite it includes `db`; when using MySQL it does not.
const db = dbModule.db;
const run = dbModule.run;
const get = dbModule.get;
const all = dbModule.all;

// Table name mapping: SQLite uses plural lowercase, MySQL schema uses singular PascalCase as created manually
const TABLE = dbModule.useMySQL ? {
  // match actual MySQL table names present in your database
  donor: 'donor', banks: 'hospital', donations: 'donationrecord', tests: 'bloodtest', patients: 'patient', requests: 'emergencyrequest', staffs: 'staff'
} : {
  donor: 'donors', banks: 'banks', donations: 'donations', tests: 'tests', patients: 'patients', requests: 'requests', staffs: 'staffs'
};

const app = express();
const PORT = process.env.PORT || 4000;

// allow CORS from any origin for local development
app.use(cors());
app.use(bodyParser.json());

// initialize schema for SQLite only. If using MySQL, assume DB and schema are managed separately.
const schemaPath = path.join(__dirname, 'schema.sql');
if(!require('./db').useMySQL){
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.serialize(()=>{
    db.exec(schema, (err)=>{ if(err) console.error('Error creating schema', err); else console.log('Database schema ensured'); })
  });
} else {
  console.log('MySQL backend detected — skipping automatic schema execution. Ensure MySQL database and tables exist (see BACKEND/schema.sql for reference).');
}

// Ensure optional columns (password) exist and seed initial data if tables are empty (only for SQLite)
if(!dbModule.useMySQL){
  db.serialize(async ()=>{
  try{
    const tableInfo = (tbl) => new Promise((resolve,reject)=> db.all(`PRAGMA table_info(${tbl})`, (e,rows)=> e?reject(e):resolve(rows)));
    const runAsync = (sql, params=[]) => new Promise((resolve,reject)=> db.run(sql, params, function(err){ if(err) reject(err); else resolve({ lastID:this.lastID, changes:this.changes }) }));

    // add password columns if missing
  const donorsInfo = await tableInfo(TABLE.donor);
    if(!donorsInfo.find(c=>c.name==='password')){
      console.log(`Adding password column to ${TABLE.donor}`);
      await runAsync(`ALTER TABLE ${TABLE.donor} ADD COLUMN password TEXT`);
    }
    const banksInfo = await tableInfo(TABLE.banks);
    if(!banksInfo.find(c=>c.name==='password')){
      console.log(`Adding password column to ${TABLE.banks}`);
      await runAsync(`ALTER TABLE ${TABLE.banks} ADD COLUMN password TEXT`);
    }

    // helper to check count
    const countRows = (tbl) => new Promise((resolve,reject)=> db.get(`SELECT COUNT(1) as c FROM ${tbl}`, (e,row)=> e?reject(e):resolve(row.c)));

    // Seed donors
  const donorCount = await countRows(TABLE.donor);
    if(donorCount===0){
      console.log('Seeding donors...');
  await runAsync(`INSERT INTO ${TABLE.donor}(donor_id,name,birth_date,gender,age,address,ph_no,blood_type,password) VALUES(?,?,?,?,?,?,?,?,?)`, ['donor_demo1','Alice Walker','1990-04-12','female',35,'12 Rose St','555-0101','A+','pass123']);
  await runAsync(`INSERT INTO ${TABLE.donor}(donor_id,name,birth_date,gender,age,address,ph_no,blood_type,password) VALUES(?,?,?,?,?,?,?,?,?)`, ['donor_demo2','Bob Kumar','1985-09-03','male',40,'221B Baker St','555-0102','O-','secret']);
    }

    // Seed banks
  const bankCount = await countRows(TABLE.banks);
    if(bankCount===0){
      console.log('Seeding banks...');
  await runAsync(`INSERT INTO ${TABLE.banks}(bank_id,hospital_name,location,contact_no,password) VALUES(?,?,?,?,?)`, ['bank_abc','City Hospital Blood Bank','Downtown','555-1000','bankpass']);
  await runAsync(`INSERT INTO ${TABLE.banks}(bank_id,hospital_name,location,contact_no,password) VALUES(?,?,?,?,?)`, ['bank_xyz','Northside Medical','Uptown','555-1001','northpass']);
    }

    // Seed donations and tests (linked)
  const donationCount = await countRows(TABLE.donations);
    if(donationCount===0){
      console.log('Seeding donations and tests...');
  await runAsync(`INSERT INTO ${TABLE.donations}(donation_id,donor_id,bank_id,quantity,donation_date) VALUES(?,?,?,?,?)`, ['don_1','donor_demo1','bank_abc',1,new Date().toISOString()]);
  await runAsync(`INSERT INTO ${TABLE.tests}(test_id,donor_id,donation_id,test_result,status,test_detail,test_date) VALUES(?,?,?,?,?,?,?)`, ['test_1','donor_demo1','don_1','negative','completed','All good',new Date().toISOString()]);
    }

    // Seed patients
  const patientCount = await countRows(TABLE.patients);
    if(patientCount===0){
      console.log('Seeding patients...');
  await runAsync(`INSERT INTO ${TABLE.patients}(patient_id,hospital_id,name,age,gender,blood_group,disease) VALUES(?,?,?,?,?,?,?)`, ['pat_1','bank_abc','Mr. John','56','male','A+','Anemia']);
    }

    // Seed requests
  const reqCount = await countRows(TABLE.requests);
    if(reqCount===0){
      console.log('Seeding requests...');
  await runAsync(`INSERT INTO ${TABLE.requests}(request_id,patient_id,bank_id,hospital_id,blood_group_required,quantity_needed,request_date,status) VALUES(?,?,?,?,?,?,?,?)`, ['req_1','pat_1','bank_abc','bank_abc','A+',2,new Date().toISOString(),'pending']);
    }

    // Seed staffs
  const staffCount = await countRows(TABLE.staffs);
    if(staffCount===0){
      console.log('Seeding staffs...');
  await runAsync(`INSERT INTO ${TABLE.staffs}(staff_id,bank_id,contact,name,experience,qualification) VALUES(?,?,?,?,?,?)`, ['staff_1','bank_abc','555-2000','Samantha Lee','5 years','MBBS']);
    }

    console.log('Seeding complete');
  }catch(err){ console.error('Seeding error', err) }
  });
} else {
  console.log('MySQL backend detected — skipping automatic migrations/seeding. Use your MySQL client to create and seed tables (see BACKEND/schema.sql for SQLite schema).')
}

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

// Basic endpoints
app.get('/api/donor', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL columns to the canonical names the frontend expects
      const sql = `SELECT Donor_ID as donor_id, Name as name, Age as age, Gender as gender, COALESCE(Blood_Group, BloodGroup) as blood_type, COALESCE(PhoneNo, Phone_No, ph_no) as ph_no, COALESCE(Address, address) as address, COALESCE(LastDonationDate, LastDonation_Date, last_donation_date) as last_donation_date, Password as password FROM ${TABLE.donor}`;
      const rows = await all(sql);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.donor}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});
app.post('/api/donor', async (req,res)=>{
  try{
    const donor = req.body;
    // server-side validation
    const phoneRe = /^\+?[0-9]{7,15}$/
    const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if(!donor.name) return res.status(400).json({error:'name required'})

    // compute/validate age from birth_date if provided
    let age = donor.age || null
    if(donor.birth_date){
      const b = new Date(donor.birth_date)
      if(Number.isNaN(b.getTime())) return res.status(400).json({error:'invalid birth_date'})
      const today = new Date()
      age = today.getFullYear() - b.getFullYear()
      const m = today.getMonth() - b.getMonth()
      if(m<0 || (m===0 && today.getDate() < b.getDate())) age--
    }
    if(age===null || age<0 || age>120) return res.status(400).json({error:'invalid age'})

    const phoneVal = donor.ph_no || donor.PhoneNo || donor.Phone_No || donor.phone || null
    if(!phoneVal || !phoneRe.test(String(phoneVal))) return res.status(400).json({error:'invalid phone format'})
    if(!donor.password || !pwdRe.test(donor.password)) return res.status(400).json({error:'password does not meet complexity requirements'})

    if(dbModule.useMySQL){
      // Insert into MySQL Donor table using the expected column names
      const blood = donor.blood_type || donor.Blood_Group || donor.bloodGroup || null
      const lastDonation = donor.last_donation_date || donor.LastDonationDate || donor.LastDonation_Date || null
      const resRun = await run(`INSERT INTO ${TABLE.donor}(Name, Age, Gender, BloodGroup, PhoneNo, Address, LastDonationDate, Password) VALUES(?,?,?,?,?,?,?,?)`, [donor.name, age, donor.gender || null, blood, phoneVal, donor.address || null, lastDonation, donor.password||null]);
      const insertedId = resRun.lastID;
      const created = await get(`SELECT Donor_ID as donor_id, Name as name, Age as age, Gender as gender, COALESCE(Blood_Group, BloodGroup) as blood_type, COALESCE(PhoneNo, Phone_No, ph_no) as ph_no, COALESCE(Address, address) as address, COALESCE(LastDonationDate, LastDonation_Date, last_donation_date) as last_donation_date, Password as password FROM ${TABLE.donor} WHERE Donor_ID=?`, [insertedId]);
      return res.json(created)
    } else {
      // SQLite flow (legacy)
      donor.donor_id = donor.donor_id || uid('donor');
      await run(`INSERT INTO ${TABLE.donor}(donor_id,name,birth_date,gender,age,address,ph_no,blood_type,password) VALUES(?,?,?,?,?,?,?,?,?)`, [donor.donor_id, donor.name, donor.birth_date, donor.gender, age, donor.address, phoneVal, donor.blood_type, donor.password||null]);
      const created = await get(`SELECT * FROM ${TABLE.donor} WHERE donor_id=?`,[donor.donor_id])
      return res.json(created);
    }
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/banks', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL hospital table columns to the frontend expected shape
      const rows = await all(`SELECT Hospital_ID as bank_id, Hospital_Name as hospital_name, Location as location, Contact_No as contact_no, Password as password FROM ${TABLE.banks}`);
      return res.json(rows)
    }
    const rows = await all('SELECT * FROM banks');
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.post('/api/banks', async (req,res)=>{
  try{
    const bank = req.body; bank.bank_id = bank.bank_id || uid('bank');
    const phoneRe = /^\+?[0-9]{7,15}$/
    const pwdRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if(!bank.hospital_name) return res.status(400).json({error:'hospital_name required'})
    if(!bank.contact_no || !phoneRe.test(bank.contact_no)) return res.status(400).json({error:'invalid contact_no'})
    if(!bank.password || !pwdRe.test(bank.password)) return res.status(400).json({error:'password does not meet complexity requirements'})
    if(dbModule.useMySQL){
      // insert into hospital table (MySQL schema)
      const resRun = await run(`INSERT INTO ${TABLE.banks}(Hospital_Name, Location, Contact_No, Password) VALUES(?,?,?,?)`, [bank.hospital_name, bank.location || null, bank.contact_no, bank.password||null]);
      const created = await get(`SELECT Hospital_ID as bank_id, Hospital_Name as hospital_name, Location as location, Contact_No as contact_no, Password as password FROM ${TABLE.banks} WHERE Hospital_ID=?`, [resRun.lastID]);
      return res.json(created)
    }
    await run('INSERT INTO banks(bank_id,hospital_name,location,contact_no,password) VALUES(?,?,?,?,?)',[bank.bank_id, bank.hospital_name, bank.location, bank.contact_no, bank.password||null]);
    const created = await get('SELECT * FROM banks WHERE bank_id=?',[bank.bank_id])
    res.json(created)
  }catch(e){ res.status(500).json({error:e.message}) }
});

// Login endpoint: accepts { role, username, password }
// Tries donor (by name or donor_id) when role==='donor' or role omitted; otherwise tries banks.
app.post('/api/login', async (req, res) => {
  try {
    const { role, username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: 'username and password required' });

    const tryDonor = async () => {
      if(dbModule.useMySQL){
        // MySQL columns: Donor_ID, Name, Password, PhoneNo, BloodGroup / Blood_Group, Address, LastDonationDate
        const sql = `SELECT Donor_ID as donor_id, Name as name, Age as age, Gender as gender, COALESCE(Blood_Group, BloodGroup) as blood_type, COALESCE(PhoneNo, Phone_No, ph_no) as ph_no, COALESCE(Address, address) as address, COALESCE(LastDonationDate, LastDonation_Date, last_donation_date) as last_donation_date, Password as password FROM ${TABLE.donor} WHERE Name = ? OR Donor_ID = ? LIMIT 1`;
        const row = await get(sql, [username, username]);
        return row;
      } else {
        // SQLite / legacy schema — fields use donor_id, name, password, ph_no, blood_type
        const sql = `SELECT * FROM ${TABLE.donor} WHERE name = ? OR donor_id = ? LIMIT 1`;
        const row = await get(sql, [username, username]);
        return row;
      }
    }

    const tryBank = async () => {
      if(dbModule.useMySQL){
        // hospital table in MySQL uses Hospital_ID / Hospital_Name / Contact_No
        const sql = `SELECT Hospital_ID as bank_id, Hospital_Name as hospital_name, Location as location, Contact_No as contact_no, Password as password FROM ${TABLE.banks} WHERE Hospital_Name = ? OR Hospital_ID = ? LIMIT 1`;
        const row = await get(sql, [username, username]);
        return row;
      } else {
        const sql = `SELECT * FROM ${TABLE.banks} WHERE hospital_name = ? OR bank_id = ? LIMIT 1`;
        const row = await get(sql, [username, username]);
        return row;
      }
    }

    if(!role || role==='donor'){
      const d = await tryDonor();
      if(d){ if(String(d.password) === String(password)){ return res.json({ role:'donor', ...d }) } else { return res.status(401).json({ error:'incorrect password' }) } }
      if(role==='donor') return res.status(404).json({ error:'donor not found' });
    }

    // try bank/hospital
    const b = await tryBank();
    if(b){ if(String(b.password) === String(password)){ return res.json({ role:'hospital', ...b }) } else { return res.status(401).json({ error:'incorrect password' }) } }

    return res.status(404).json({ error:'user not found' });
  } catch(e){ res.status(500).json({ error: e.message }) }
});


app.get('/api/donations', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL donationrecord table columns
      const rows = await all(`SELECT Donation_ID as donation_id, Donor_ID as donor_id, Bank_ID as bank_id, Donation_Date as donation_date, Quantity_Donated as quantity, Notes as notes FROM ${TABLE.donations}`);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.donations}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});

// donate: creates donation record and a linked test record
app.post('/api/donate', async (req,res)=>{
  try{
    const { donor_id, bank_id, quantity } = req.body;
    if(!donor_id || !bank_id || !quantity) return res.status(400).json({error:'donor_id, bank_id and quantity required'});
    
    if(dbModule.useMySQL){
      // insert into MySQL donationrecord and bloodtest tables
      const donation_date = new Date().toISOString();
      const donationRes = await run(`INSERT INTO ${TABLE.donations}(Donor_ID, Bank_ID, Donation_Date, Quantity_Donated, Notes) VALUES(?,?,?,?,?)`, [donor_id, bank_id, donation_date, quantity, 'Frontend donation']);
      const testRes = await run(`INSERT INTO ${TABLE.tests}(Donation_ID, Donor_ID, Test_Date, Test_Result, Status) VALUES(?,?,?,?,?)`, [donationRes.lastID, donor_id, donation_date, 'pending', 'pending']);
      
      const donation = await get(`SELECT Donation_ID as donation_id, Donor_ID as donor_id, Bank_ID as bank_id, Donation_Date as donation_date, Quantity_Donated as quantity, Notes as notes FROM ${TABLE.donations} WHERE Donation_ID=?`, [donationRes.lastID]);
      const test = await get(`SELECT Test_ID as test_id, Donation_ID as donation_id, Donor_ID as donor_id, Test_Date as test_date, Test_Result as test_result, Status as status FROM ${TABLE.tests} WHERE Test_ID=?`, [testRes.lastID]);
      return res.json({ donation, test });
    }
    
    // SQLite flow
    const donation_id = uid('don');
    const donation_date = new Date().toISOString();
    await run(`INSERT INTO ${TABLE.donations}(donation_id,donor_id,bank_id,quantity,donation_date) VALUES(?,?,?,?,?)`,[donation_id, donor_id, bank_id, quantity, donation_date]);
    const test_id = uid('test');
    const test_date = new Date().toISOString();
    await run(`INSERT INTO ${TABLE.tests}(test_id,donor_id,donation_id,test_result,status,test_detail,test_date) VALUES(?,?,?,?,?,?,?)`,[test_id, donor_id, donation_id, 'pending', 'pending', '', test_date]);
    const donation = await get(`SELECT * FROM ${TABLE.donations} WHERE donation_id=?`,[donation_id]);
    const test = await get(`SELECT * FROM ${TABLE.tests} WHERE test_id=?`,[test_id]);
    res.json({ donation, test });
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/tests', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL bloodtest table columns
      const rows = await all(`SELECT Test_ID as test_id, Donation_ID as donation_id, Donor_ID as donor_id, Test_Date as test_date, Test_Result as test_result, Status as status FROM ${TABLE.tests}`);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.tests}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});
app.get('/api/tests/:id', async (req,res)=>{ try{ const row = await get('SELECT * FROM tests WHERE test_id=?',[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row)}catch(e){ res.status(500).json({error:e.message}) } });

app.post('/api/tests/:id', async (req,res)=>{
  try{
    const { test_result, status, test_detail, test_date } = req.body;
    const id = req.params.id;
    await run('UPDATE tests SET test_result=?, status=?, test_detail=?, test_date=? WHERE test_id=?',[test_result||null, status||null, test_detail||'', test_date||new Date().toISOString(), id]);
    const row = await get('SELECT * FROM tests WHERE test_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

// patients
app.get('/api/patients', async (req,res)=>{ try{ 
    if(dbModule.useMySQL){
      const rows = await all(`SELECT Patient_ID as patient_id, Hospital_ID as hospital_id, Name as name, Age as age, Gender as gender, Blood_Group as blood_group, Disease as disease FROM ${TABLE.patients}`);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.patients}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) } });

app.post('/api/patients', async (req,res)=>{ try{ 
    const p = req.body; 
    if(dbModule.useMySQL){
      const resRun = await run(`INSERT INTO ${TABLE.patients}(Hospital_ID, Name, Age, Gender, Blood_Group, Disease) VALUES(?,?,?,?,?,?)`, [p.hospital_id, p.name, p.age, p.gender, p.blood_group, p.disease]);
      const created = await get(`SELECT Patient_ID as patient_id, Hospital_ID as hospital_id, Name as name, Age as age, Gender as gender, Blood_Group as blood_group, Disease as disease FROM ${TABLE.patients} WHERE Patient_ID=?`, [resRun.lastID]);
      return res.json(created);
    }
    p.patient_id = p.patient_id || uid('pat');
    await run('INSERT INTO patients(patient_id,hospital_id,name,age,gender,blood_group,disease) VALUES(?,?,?,?,?,?,?)',[p.patient_id,p.hospital_id,p.name,p.age,p.gender,p.blood_group,p.disease]);
    res.json(p);
  }catch(e){ res.status(500).json({error:e.message}) } });

// requests
app.get('/api/requests', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL emergencyrequest table columns
      const rows = await all(`SELECT Request_ID as request_id, Patient_ID as patient_id, Hospital_ID as hospital_id, Bank_ID as bank_id, BloodGroup_Required as blood_group_required, Quantity_Needed as quantity_needed, Request_Date as request_date, Status as status FROM ${TABLE.requests}`);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.requests}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.post('/api/requests', async (req,res)=>{
  try{
    const r = req.body;
    if(dbModule.useMySQL){
      // insert into MySQL emergencyrequest table
      const resRun = await run(`INSERT INTO ${TABLE.requests}(Patient_ID, Hospital_ID, Bank_ID, BloodGroup_Required, Quantity_Needed, Request_Date, Status) VALUES(?,?,?,?,?,?,?)`, [r.patient_id, r.hospital_id, r.bank_id, r.blood_group_required, r.quantity_needed, new Date().toISOString(), r.status || 'pending']);
      const created = await get(`SELECT Request_ID as request_id, Patient_ID as patient_id, Hospital_ID as hospital_id, Bank_ID as bank_id, BloodGroup_Required as blood_group_required, Quantity_Needed as quantity_needed, Request_Date as request_date, Status as status FROM ${TABLE.requests} WHERE Request_ID=?`, [resRun.lastID]);
      return res.json(created)
    }
    // SQLite flow
    r.request_id = r.request_id || uid('req');
    r.request_date = new Date().toISOString();
    r.status = r.status || 'pending';
    await run(`INSERT INTO ${TABLE.requests}(request_id,patient_id,bank_id,hospital_id,blood_group_required,quantity_needed,request_date,status) VALUES(?,?,?,?,?,?,?,?)`,[r.request_id,r.patient_id,r.bank_id,r.hospital_id,r.blood_group_required,r.quantity_needed,r.request_date,r.status]);
    res.json(r);
  }catch(e){ res.status(500).json({error:e.message}) }
});

// staffs
app.get('/api/staffs', async (req,res)=>{
  try{
    if(dbModule.useMySQL){
      // alias MySQL staff table columns
      const rows = await all(`SELECT Staff_ID as staff_id, Name as name, Role as role, Contact_No as contact, Bank_ID as bank_id, Qualification as qualification, Experience as experience FROM ${TABLE.staffs}`);
      return res.json(rows)
    }
    const rows = await all(`SELECT * FROM ${TABLE.staffs}`);
    res.json(rows)
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.post('/api/staffs', async (req,res)=>{
  try{
    const s = req.body;
    if(dbModule.useMySQL){
      // insert into MySQL staff table
      const resRun = await run(`INSERT INTO ${TABLE.staffs}(Name, Role, Contact_No, Bank_ID, Qualification, Experience) VALUES(?,?,?,?,?,?)`, [s.name, s.role || 'Staff', s.contact, s.bank_id, s.qualification, s.experience]);
      const created = await get(`SELECT Staff_ID as staff_id, Name as name, Role as role, Contact_No as contact, Bank_ID as bank_id, Qualification as qualification, Experience as experience FROM ${TABLE.staffs} WHERE Staff_ID=?`, [resRun.lastID]);
      return res.json(created)
    }
    // SQLite flow
    s.staff_id = s.staff_id || uid('staff');
    await run(`INSERT INTO ${TABLE.staffs}(staff_id,bank_id,contact,name,experience,qualification) VALUES(?,?,?,?,?,?)`,[s.staff_id,s.bank_id,s.contact,s.name,s.experience,s.qualification]);
    res.json(s);
  }catch(e){ res.status(500).json({error:e.message}) }
});

// fulfill a request (simple)
app.post('/api/requests/:id/fulfill', async (req,res)=>{
  try{
    const id = req.params.id;
    const { staff_id } = req.body;
    await run('UPDATE requests SET status=? WHERE request_id=?',['fulfilled', id]);
    res.json({ request_id:id, status:'fulfilled', handled_by:staff_id||null });
  }catch(e){ res.status(500).json({error:e.message}) }
});

// Root route to help when someone visits the server in a browser
app.get('/', (req, res) => {
  res.send('Blood Donation Backend running. Use /api/* endpoints (for example: GET /api/donor)');
});

// Read single items and update (PUT) endpoints for entities so changes persist in DB
app.get('/api/donor/:id', async (req,res)=>{ try{ const row = await get(`SELECT * FROM ${TABLE.donor} WHERE donor_id=?`,[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){ res.status(500).json({error:e.message}) } });
app.put('/api/donor/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { name,birth_date,gender,age,address,ph_no,blood_type } = req.body;
    await run(`UPDATE ${TABLE.donor} SET name=?, birth_date=?, gender=?, age=?, address=?, ph_no=?, blood_type=? WHERE donor_id=?`,[name,birth_date,gender,age,address,ph_no,blood_type,id]);
    const row = await get(`SELECT * FROM ${TABLE.donor} WHERE donor_id=?`,[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/banks/:id', async (req,res)=>{ try{ const row = await get('SELECT * FROM banks WHERE bank_id=?',[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){ res.status(500).json({error:e.message}) } });
app.put('/api/banks/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { hospital_name, location, contact_no } = req.body;
    await run('UPDATE banks SET hospital_name=?, location=?, contact_no=? WHERE bank_id=?',[hospital_name, location, contact_no, id]);
    const row = await get('SELECT * FROM banks WHERE bank_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/donations/:id', async (req,res)=>{ try{ const row = await get('SELECT * FROM donations WHERE donation_id=?',[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){ res.status(500).json({error:e.message}) } });
app.put('/api/donations/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { donor_id, bank_id, quantity, donation_date } = req.body;
    await run('UPDATE donations SET donor_id=?, bank_id=?, quantity=?, donation_date=? WHERE donation_id=?',[donor_id, bank_id, quantity, donation_date, id]);
    const row = await get('SELECT * FROM donations WHERE donation_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/patients/:id', async (req,res)=>{ try{ 
    if(dbModule.useMySQL){
      const row = await get(`SELECT Patient_ID as patient_id, Hospital_ID as hospital_id, Name as name, Age as age, Gender as gender, Blood_Group as blood_group, Disease as disease FROM ${TABLE.patients} WHERE Patient_ID=?`,[req.params.id]);
      if(!row) return res.status(404).json({error:'not found'});
      return res.json(row);
    }
    const row = await get(`SELECT * FROM ${TABLE.patients} WHERE patient_id=?`,[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) } });

app.put('/api/patients/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { hospital_id, name, age, gender, blood_group, disease } = req.body;
    if(dbModule.useMySQL){
      await run(`UPDATE ${TABLE.patients} SET Hospital_ID=?, Name=?, Age=?, Gender=?, Blood_Group=?, Disease=? WHERE Patient_ID=?`,[hospital_id, name, age, gender, blood_group, disease, id]);
      const row = await get(`SELECT Patient_ID as patient_id, Hospital_ID as hospital_id, Name as name, Age as age, Gender as gender, Blood_Group as blood_group, Disease as disease FROM ${TABLE.patients} WHERE Patient_ID=?`,[id]);
      return res.json(row);
    }
    await run('UPDATE patients SET hospital_id=?, name=?, age=?, gender=?, blood_group=?, disease=? WHERE patient_id=?',[hospital_id, name, age, gender, blood_group, disease, id]);
    const row = await get('SELECT * FROM patients WHERE patient_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/requests/:id', async (req,res)=>{ try{ const row = await get('SELECT * FROM requests WHERE request_id=?',[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){ res.status(500).json({error:e.message}) } });
app.put('/api/requests/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { patient_id, bank_id, hospital_id, blood_group_required, quantity_needed, request_date, status } = req.body;
    await run('UPDATE requests SET patient_id=?, bank_id=?, hospital_id=?, blood_group_required=?, quantity_needed=?, request_date=?, status=? WHERE request_id=?',[patient_id, bank_id, hospital_id, blood_group_required, quantity_needed, request_date, status, id]);
    const row = await get('SELECT * FROM requests WHERE request_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

app.get('/api/staffs/:id', async (req,res)=>{ try{ const row = await get('SELECT * FROM staffs WHERE staff_id=?',[req.params.id]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){ res.status(500).json({error:e.message}) } });
app.put('/api/staffs/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const { bank_id, contact, name, experience, qualification } = req.body;
    await run('UPDATE staffs SET bank_id=?, contact=?, name=?, experience=?, qualification=? WHERE staff_id=?',[bank_id, contact, name, experience, qualification, id]);
    const row = await get('SELECT * FROM staffs WHERE staff_id=?',[id]);
    res.json(row);
  }catch(e){ res.status(500).json({error:e.message}) }
});

// Start server with automatic retry if the desired port is in use.
// Tries PORT, PORT+1, ..., up to PORT+10 before giving up.
const tryListen = (startPort, maxAttempts = 10) => {
  let attempt = 0
  const tryPort = () => {
    const p = startPort + attempt
    const server = app.listen(p, ()=> console.log(`Backend server running on http://localhost:${p} (attempt ${attempt+1})`));
    server.on('error', (err)=>{
      if(err && err.code === 'EADDRINUSE'){
        console.warn(`Port ${p} in use, trying next port...`)
        attempt++
        if(attempt <= maxAttempts){
          // give a small delay before retrying
          setTimeout(tryPort, 200)
        } else {
          console.error(`Failed to bind server after ${maxAttempts+1} attempts. Please free a port or set PORT env.`)
          process.exit(1)
        }
      } else {
        console.error('Server error', err)
        process.exit(1)
      }
    })
  }
  tryPort()
}

tryListen(Number(process.env.PORT || PORT), 10)

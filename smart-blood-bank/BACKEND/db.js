const path = require('path');
const fs = require('fs');

// Support two backends: SQLite (default) or MySQL (when MYSQL_HOST is set)
const useMySQL = !!process.env.MYSQL_HOST || !!process.env.USE_MYSQL;

if(useMySQL){
  // MySQL connection using mysql2/promise
  const mysql = require('mysql2/promise');
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '25032006';
  const database = process.env.MYSQL_DB || 'blood_system';
  const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;

  console.log(`Using MySQL backend connecting to ${user}@${host}:${port} database=${database}`);
  const pool = mysql.createPool({ host, user, password, database, port, waitForConnections:true, connectionLimit:10 });

  async function run(sql, params=[]){
    const [result] = await pool.query(sql, params);
    // Normalize to sqlite-like return
    return { lastID: result.insertId || null, changes: result.affectedRows || 0 };
  }
  async function get(sql, params=[]){
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  }
  async function all(sql, params=[]){
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  module.exports = { useMySQL: true, pool, run, get, all };

} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbFile = path.join(__dirname, 'backend.sqlite');
  const exists = fs.existsSync(dbFile);
  const db = new sqlite3.Database(dbFile, (err)=>{ if(err) console.error('Failed to open DB', err); else console.log('SQLite DB opened at', dbFile)});

  function run(sql, params=[]) {
    return new Promise((resolve, reject)=>{
      db.run(sql, params, function(err){
        if(err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  function get(sql, params=[]) {
    return new Promise((resolve, reject)=>{
      db.get(sql, params, (err,row)=> err?reject(err):resolve(row));
    });
  }
  function all(sql, params=[]) {
    return new Promise((resolve, reject)=>{
      db.all(sql, params, (err,rows)=> err?reject(err):resolve(rows));
    });
  }

  module.exports = { useMySQL: false, db, run, get, all };
}

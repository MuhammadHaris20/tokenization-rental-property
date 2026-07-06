const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "rwa",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // default XAMPP
  database: "rwa",
});

module.exports = pool;
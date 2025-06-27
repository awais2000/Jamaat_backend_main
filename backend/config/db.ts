import mysql from "mysql2/promise";

import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "147.79.64.150",
  user: process.env.DB_USER || "u334339390_UseRMemEentS",
  password: process.env.DB_PASSWORD || "jAm@aTm3mB3Rs!3",
  database: process.env.DB_NAME || "u334339390_MemberEvents",
});

export default pool;
// import mysql from "mysql2/promise";
// import dotenv from "dotenv";

// dotenv.config();

// const pool = mysql.createPool({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "ems",
//   port: 3306,
//   connectTimeout: 30000,
// });

// export default pool;
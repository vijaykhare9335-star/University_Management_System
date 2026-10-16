// MySQL Database Connection Module
const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'university_erp'
};

// Function to get a connection
async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (err) {
    console.error('Error connecting to MySQL DB:', err);
    throw err;
  }
}

// Initialize connection pool
async function initialize() {
  try {
    const pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('MySQL Connection Pool Created Successfully');
    return pool;
  } catch (err) {
    console.error('Error creating connection pool:', err);
    process.exit(1);
  }
}

// Close all connections in the pool
async function closePool() {
  try {
    console.log('Connection pool closed');
  } catch (err) {
    console.error('Error closing connection pool:', err);
  }
}

// Execute query with parameters
async function executeQuery(sql, params = []) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(sql, params);
    return { rows: result };
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Execute query and return rows
async function executeQueryRows(sql, params = []) {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

module.exports = {
  initialize,
  closePool,
  executeQuery,
  executeQueryRows,
  getConnection
};

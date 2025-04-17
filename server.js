const express = require("express");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise"); // For food suggestion endpoints
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    return res.status(200).json({});
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "food")));

// Attendance Section
const attendanceDb = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "attendance",
});

function sendJSON(response, data) {
  response.json(data);
}

// getting attendance
app.get("/getAttendance", (req, res) => {
  const { userId, subjectName } = req.query;
  if (!userId || !subjectName) {
    sendJSON(res, { success: false, error: "Missing parameters" });
    return;
  }
  const tableName = `user${userId}_subject_${subjectName.replace(/\s+/g, "_")}`;
  const totalQuery = `SELECT COUNT(*) AS totalLectures FROM \`${tableName}\``;
  const attendedQuery = `SELECT COUNT(*) AS attendedLectures FROM \`${tableName}\` WHERE attended = TRUE`;

  attendanceDb.query(totalQuery, (err, totalResult) => {
    if (err) {
      sendJSON(res, { success: false, error: err.message });
      return;
    }
    attendanceDb.query(attendedQuery, (err, attendedResult) => {
      if (err) {
        sendJSON(res, { success: false, error: err.message });
        return;
      }
      sendJSON(res, {
        success: true,
        totalLectures: totalResult[0].totalLectures,
        attendedLectures: attendedResult[0].attendedLectures,
      });
    });
  });
});

// getting subjects
app.get("/getSubjects", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    sendJSON(res, { success: false, error: "Missing userId" });
    return;
  }
  const getTablesQuery = `SHOW TABLES LIKE 'user${userId}_subject_%'`;
  attendanceDb.query(getTablesQuery, (err, result) => {
    if (err) {
      sendJSON(res, { success: false, error: err.message });
      return;
    }
    const subjects = result.map((row) => {
      const fullTableName = Object.values(row)[0];
      const subject = fullTableName
        .replace(`user${userId}_subject_`, "")
        .replace(/_/g, " ");
      return subject;
    });
    sendJSON(res, { success: true, subjects });
  });
});

//createSubject
app.post("/createSubject", (req, res) => {
  const { userId, subjectName } = req.body;
  if (!userId || !subjectName) {
    return res.json({ success: false, error: "Missing parameters" });
  }
  const tableName = `user${userId}_subject_${subjectName.replace(/\s+/g, "_")}`;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lecture_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      attended BOOLEAN NOT NULL
    )
  `;
  attendanceDb.query(createTableQuery, (err) => {
    if (err) {
      console.log("Error creating table:", err);
      return res.json({ success: false, error: err.message });
    }
    console.log("Table created successfully:", tableName);
    return res.json({ success: true });
  });
});

//delete subject
app.delete("/deleteSubject", (req, res) => {
  const { userId, subjectName } = req.query;
  if (!userId || !subjectName) {
    sendJSON(res, { success: false, error: "Missing parameters" });
    return;
  }
  const tableName = `user${userId}_subject_${subjectName.replace(/\s+/g, "_")}`;
  const dropTableQuery = `DROP TABLE IF EXISTS \`${tableName}\``;
  attendanceDb.query(dropTableQuery, (err) => {
    if (err) {
      console.log("Error deleting table:", err);
      sendJSON(res, { success: false, error: err.message });
    } else {
      console.log("Table deleted successfully");
      sendJSON(res, { success: true });
    }
  });
});

// recordLecture as 1 if present, 0 if absent
app.post("/recordLecture", (req, res) => {
  const { userId, subjectName, attended } = req.body;
  if (userId == null || !subjectName || attended == null) {
    return res.json({ success: false, error: "Missing parameters" });
  }
  const tableName = `user${userId}_subject_${subjectName.replace(/\s+/g, "_")}`;
  const insertQuery = `INSERT INTO \`${tableName}\` (attended) VALUES (?)`;
  attendanceDb.query(insertQuery, [attended], (err) => {
    if (err) {
      console.log("Error recording lecture:", err);
      return res.json({ success: false, error: err.message });
    }
    console.log("Lecture recorded successfully");
    return res.json({ success: true });
  });
});

//Expenses
const expensePool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "expense",
});

app.get("/api/expenses", (req, res) => {
  let sql = "SELECT description, SUM(amount) AS total FROM expenses";
  const params = [];
  if (req.query.start && req.query.end) {
    sql += " WHERE expense_date BETWEEN ? AND ?";
    params.push(req.query.start, req.query.end);
  }
  sql += " GROUP BY description";
  expensePool.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching expenses:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// addexpense
app.post("/api/addexpense", (req, res) => {
  const { description, amount, expense_date, category } = req.body;
  const sql =
    "INSERT INTO expenses (description, amount, expense_date, category) VALUES (?, ?, ?, ?)";
  expensePool.query(
    sql,
    [description, amount, expense_date, category],
    (err, result) => {
      if (err) {
        console.error("Error inserting expense:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({
        message: "Expense added successfully",
        insertId: result.insertId,
      });
    }
  );
});

// retrieve detailed expense records.
app.get("/api/transactions", (req, res) => {
  const sql =
    "SELECT id, description, amount, expense_date, category FROM expenses ORDER BY expense_date DESC";
  expensePool.query(sql, (err, rows) => {
    if (err) {
      console.error("Error fetching transactions:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// delete transaction.
app.delete("/api/transactions/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM expenses WHERE id=?";
  expensePool.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting expense:", err);
      return res.status(500).json({ error: "Database error deleting expense" });
    }
    res.json({ message: "Expense deleted successfully" });
  });
});

// list categories.
app.get("/api/categories", (req, res) => {
  const sql = "SELECT id, name FROM categories ORDER BY name";
  expensePool.query(sql, (err, rows) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// add a new category.
app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  const sql = "INSERT INTO categories (name) VALUES (?)";
  expensePool.query(sql, [name], (err, result) => {
    if (err) {
      console.error("Error inserting category:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({
      message: "Category added successfully",
      insertId: result.insertId,
    });
  });
});

//delete a category.
app.delete("/api/categories/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM categories WHERE id=?";
  expensePool.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      return res
        .status(500)
        .json({ error: "Database error deleting category" });
    }
    res.json({ message: "Category deleted successfully" });
  });
});

// Food Section
const foodDb = mysqlPromise.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "menu",
});

// Suggest food based on calorie range, budget, and cuisine preference.
app.post("/suggestFood", async (req, res) => {
  console.log("POST /suggestFood called with:", req.body);
  const { calorieMin, calorieMax, budgetMin, budgetMax, cuisine } = req.body;
  const sqlQuery = `
    SELECT item_name, price, calories, cuisine
    FROM menu
    WHERE cuisine = ?
      AND price BETWEEN ? AND ?
      AND calories BETWEEN ? AND ?
    ORDER BY RAND()
    LIMIT 1
  `;
  try {
    const [rows] = await foodDb.execute(sqlQuery, [
      cuisine,
      budgetMin,
      budgetMax,
      calorieMin,
      calorieMax,
    ]);
    console.log("Query result:", rows);
    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      res.json({
        success: false,
        message: "No items found! Try adjusting your filters.",
      });
    }
  } catch (err) {
    console.error("DB error (food):", err);
    res
      .status(500)
      .json({
        success: false,
        error: "Error occurred while fetching food suggestion.",
      });
  }
});

//run server on port 3000(defined above)
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

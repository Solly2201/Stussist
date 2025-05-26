// server.js
const express = require("express");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");
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

// (If you serve any static assets under ./food, keep this; otherwise remove)
app.use(express.static(path.join(__dirname, "food")));



// -------------------------
// ATTENDANCE SECTION 
// -------------------------
const attendanceDb = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "attendance",
});
attendanceDb.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to attendance DB:", err);
  } else {
    console.log("✅ Connected to attendance DB.");
  }
});

function sendJSON(response, data) {
  response.json(data);
}

function ensureAttendanceTable(userId, callback) {
  const tableName = `attendance_user${userId}`;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      subject_name VARCHAR(255) PRIMARY KEY,
      attended INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB;
  `;
  attendanceDb.query(createTableQuery, (err) => {
    if (err) console.error(`❌ Error creating table ${tableName}:`, err);
    callback(err);
  });
}

// GET attendance
app.get("/getAttendance", (req, res) => {
  const { userId, subjectName } = req.query;
  if (!userId || !subjectName) {
    sendJSON(res, { success: false, error: "Missing parameters" });
    return;
  }
  const tableName = `attendance_user${userId}`;
  const query = `SELECT attended, total FROM \`${tableName}\` WHERE subject_name = ?`;
  attendanceDb.query(query, [subjectName], (err, result) => {
    if (err) {
      console.error("❌ GET /getAttendance SQL error:", err);
      sendJSON(res, { success: false, error: err.message });
      return;
    }
    if (result.length === 0) {
      sendJSON(res, { success: false, error: "Subject not found" });
    } else {
      sendJSON(res, {
        success: true,
        attended: result[0].attended,
        total: result[0].total,
      });
    }
  });
});

// GET subjects
app.get("/getSubjects", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    sendJSON(res, { success: false, error: "Missing userId" });
    return;
  }
  const tableName = `attendance_user${userId}`;
  const query = `SELECT subject_name FROM \`${tableName}\``;
  attendanceDb.query(query, (err, result) => {
    if (err) {
      console.error("❌ GET /getSubjects SQL error:", err);
      sendJSON(res, { success: false, error: err.message });
      return;
    }
    const subjects = result.map((row) => row.subject_name);
    sendJSON(res, { success: true, subjects });
  });
});

// POST createSubject
app.post("/createSubject", (req, res) => {
  const { userId, subjectName } = req.body;
  if (!userId || !subjectName) {
    return res.json({ success: false, error: "Missing parameters" });
  }
  ensureAttendanceTable(userId, (err) => {
    if (err) {
      return res.json({ success: false, error: err.message });
    }
    const tableName = `attendance_user${userId}`;
    const insertQuery = `
      INSERT IGNORE INTO \`${tableName}\` (subject_name, attended, total)
      VALUES (?, 0, 0)
    `;
    attendanceDb.query(insertQuery, [subjectName], (err) => {
      if (err) {
        console.error("❌ POST /createSubject SQL error:", err);
        return res.json({ success: false, error: err.message });
      }
      return res.json({ success: true });
    });
  });
});

// DELETE deleteSubject
app.delete("/deleteSubject", (req, res) => {
  const { userId, subjectName } = req.query;
  if (!userId || !subjectName) {
    sendJSON(res, { success: false, error: "Missing parameters" });
    return;
  }
  const tableName = `attendance_user${userId}`;
  const deleteQuery = `DELETE FROM \`${tableName}\` WHERE subject_name = ?`;
  attendanceDb.query(deleteQuery, [subjectName], (err) => {
    if (err) {
      console.error("❌ DELETE /deleteSubject SQL error:", err);
      return sendJSON(res, { success: false, error: err.message });
    }
    return sendJSON(res, { success: true });
  });
});

// POST recordLecture
app.post("/recordLecture", (req, res) => {
  const { userId, subjectName, attended } = req.body;
  if (userId == null || !subjectName || attended == null) {
    return res.json({ success: false, error: "Missing parameters" });
  }
  ensureAttendanceTable(userId, (err) => {
    if (err) {
      return res.json({ success: false, error: err.message });
    }
    const tableName = `attendance_user${userId}`;
    let updateQuery;
    if (attended) {
      updateQuery = `
        UPDATE \`${tableName}\`
        SET attended = attended + 1, total = total + 1
        WHERE subject_name = ?
      `;
    } else {
      updateQuery = `
        UPDATE \`${tableName}\`
        SET total = total + 1
        WHERE subject_name = ?
      `;
    }
    attendanceDb.query(updateQuery, [subjectName], (err) => {
      if (err) {
        console.error("❌ POST /recordLecture SQL error:", err);
        return res.json({ success: false, error: err.message });
      }
      return res.json({ success: true });
    });
  });
});

// POST subtractAttendance
app.post("/subtractAttendance", (req, res) => {
  const { userId, subjectName, attended } = req.body;
  if (userId == null || !subjectName || attended == null) {
    return res.json({ success: false, error: "Missing parameters" });
  }
  const tableName = `attendance_user${userId}`;
  let updateQuery;
  if (attended) {
    updateQuery = `
      UPDATE \`${tableName}\`
      SET attended = GREATEST(attended - 1, 0), total = GREATEST(total - 1, 0)
      WHERE subject_name = ?
    `;
  } else {
    updateQuery = `
      UPDATE \`${tableName}\`
      SET total = GREATEST(total - 1, 0)
      WHERE subject_name = ?
    `;
  }
  attendanceDb.query(updateQuery, [subjectName], (err) => {
    if (err) {
      console.error("❌ POST /subtractAttendance SQL error:", err);
      return res.json({ success: false, error: err.message });
    }
    return res.json({ success: true });
  });
});



// -------------------------
// EXPENSES + CATEGORIES SECTION
// -------------------------
// Now pointed to the `expense` database
const expenseDb = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "expense", // 🔑 ensure "expense" DB exists in MySQL
});

expenseDb.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to expense DB:", err);
  } else {
    console.log("✅ Connected to expense DB.");
  }
});

function ensureExpenseTables(userId, callback) {
  const expensesTable = `expenses_user${userId}`;
  const categoriesTable = `categories_user${userId}`;

  const createCategories = `
    CREATE TABLE IF NOT EXISTS \`${categoriesTable}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB;
  `;

  const createExpenses = `
    CREATE TABLE IF NOT EXISTS \`${expensesTable}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      expense_date DATE NOT NULL,
      category_id INT,
      FOREIGN KEY (category_id)
        REFERENCES \`${categoriesTable}\`(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `;

  expenseDb.query(createCategories, (errCat) => {
    if (errCat) {
      console.error(`   ❌ Error in CREATE TABLE ${categoriesTable}:`, errCat);
      return callback(errCat);
    }
    expenseDb.query(createExpenses, (errExp) => {
      if (errExp) {
        console.error(`   ❌ Error in CREATE TABLE ${expensesTable}:`, errExp);
        return callback(errExp);
      }

      callback(null);
    });
  });
}

// GET all categories for a user
app.get("/api/categories", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  const categoriesTable = `categories_user${userId}`;
  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }
    const query = `SELECT id, name FROM \`${categoriesTable}\` ORDER BY name`;
    expenseDb.query(query, (errQuery, rows) => {
      if (errQuery) {
        console.error(`❌ Error selecting from ${categoriesTable}:`, errQuery);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    });
  });
});

// POST add a new category for a user
app.post("/api/categories", (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  const categoriesTable = `categories_user${userId}`;
  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }
    const insertCat = `INSERT INTO \`${categoriesTable}\` (name) VALUES (?)`;
    expenseDb.query(insertCat, [name], (errInsert, result) => {
      if (errInsert) {
        console.error(`❌ Error inserting into ${categoriesTable}:`, errInsert);
        return res.status(500).json({ error: "Database error" });
      }
      console.log(`→ Category "${name}" inserted with id=${result.insertId}`);
      res.json({ message: "Category added successfully", insertId: result.insertId });
    });
  });
});

// DELETE a category for a user
app.delete("/api/categories", (req, res) => {
  const { userId, categoryId } = req.query;
  if (!userId || !categoryId) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  const categoriesTable = `categories_user${userId}`;
  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }
    const deleteCat = `DELETE FROM \`${categoriesTable}\` WHERE id = ?`;
    expenseDb.query(deleteCat, [categoryId], (errDel) => {
      if (errDel) {
        console.error(`❌ Error deleting from ${categoriesTable}:`, errDel);
        return res.status(500).json({ error: "Database error deleting category" });
      }
      console.log(`→ Category id=${categoryId} deleted from ${categoriesTable}`);
      res.json({ message: "Category deleted successfully" });
    });
  });
});

// GET all expenses for a user (optionally between dates)
app.get("/api/expenses", (req, res) => {
  const { userId, start, end } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  const expensesTable = `expenses_user${userId}`;
  const categoriesTable = `categories_user${userId}`;

  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }

    let sql = `
      SELECT
        e.id,
        e.description,
        e.amount,
        e.expense_date,
        c.name AS category
      FROM \`${expensesTable}\` e
      LEFT JOIN \`${categoriesTable}\` c
        ON e.category_id = c.id
    `;
    const params = [];

    if (start && end) {
      sql += " WHERE e.expense_date BETWEEN ? AND ?";
      params.push(start, end);
    }

    sql += " ORDER BY e.expense_date DESC";

    expenseDb.query(sql, params, (errQuery, rows) => {
      if (errQuery) {
        console.error(`❌ Error selecting from ${expensesTable}:`, errQuery);
        return res.status(500).json({ error: "Database error fetching expenses" });
      }
      res.json(rows);
    });
  });
});

// POST add a new expense for a user
app.post("/api/addexpense", (req, res) => {
  const { userId, description, amount, expense_date, categoryId } = req.body;
  if (!userId || !description || amount == null || !expense_date) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  const expensesTable = `expenses_user${userId}`;
  const categoriesTable = `categories_user${userId}`;

  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }

    const catId = categoryId || null;
    const insertExpense = `
      INSERT INTO \`${expensesTable}\`
        (description, amount, expense_date, category_id)
      VALUES (?, ?, ?, ?)
    `;
    expenseDb.query(
      insertExpense,
      [description, amount, expense_date, catId],
      (errInsert, result) => {
        if (errInsert) {
          console.error(`❌ Error inserting into ${expensesTable}:`, errInsert);
          return res.status(500).json({ error: "Database error inserting expense" });
        }
        console.log(
          `→ Expense inserted into ${expensesTable} with id=${result.insertId}`
        );
        res.json({ message: "Expense added successfully", insertId: result.insertId });
      }
    );
  });
});

// DELETE an expense for a user
app.delete("/api/expenses", (req, res) => {
  const { userId, expenseId } = req.query;
  if (!userId || !expenseId) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  const expensesTable = `expenses_user${userId}`;
  ensureExpenseTables(userId, (err) => {
    if (err) {
      console.error("❌ ensureExpenseTables error:", err);
      return res.status(500).json({ error: err.message });
    }
    const deleteExpense = `DELETE FROM \`${expensesTable}\` WHERE id = ?`;
    expenseDb.query(deleteExpense, [expenseId], (errDel) => {
      if (errDel) {
        console.error(`❌ Error deleting from ${expensesTable}:`, errDel);
        return res.status(500).json({ error: "Database error deleting expense" });
      }
      console.log(`→ Expense id=${expenseId} deleted from ${expensesTable}`);
      res.json({ message: "Expense deleted successfully" });
    });
  });
});



// -------------------------
// FOOD SECTION 
// -------------------------
const foodDb = mysqlPromise.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "menu",
});

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
    const [rows] = await foodDb.query(sqlQuery, [
      cuisine,
      budgetMin,
      budgetMax,
      calorieMin,
      calorieMax,
    ]);

    if (rows.length > 0) {
      res.json({ success: true, suggestion: rows[0] });
    } else {
      res.json({ success: false, message: "No matching food items found." });
    }
  } catch (error) {
    console.error("❌ Error in /suggestFood:", error);
    res.status(500).json({ success: false, error: "Database error." });
  }
});

app.listen(port, () => {
  console.log(`🟢 Server is running on port ${port}`);
});

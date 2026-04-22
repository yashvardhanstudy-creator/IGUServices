require("dotenv").config();
const session = require("express-session");
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const xss = require("xss");
const {
  insertQuery,
  createTableQuery,
  dbConnectInfoTest,
  // dbConnectInfoDevLaptop,
  createUserTable,
  createYear,
  verifyLogin,
  verifyPrivilageLogin,
  // dbConnectInfoReal,
} = require("./constants");

const PORT = process.env.PORT_TEST || 3001;
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  }),
);
app.use((req, res, next) => {
  res.locals.query = req.query;
  res.locals.url = req.originalUrl;
  next();
});

app.set("view engine", "ejs");

const pool = new Pool(dbConnectInfoTest);

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test the database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("✅ Connected to PostgreSQL database", client.database);
  }
  done();
});

// pool.query(createTableQuery, (err, res) => {
//   if (err) {
//     console.error("Error creating table:", err);
//   } else {
//     console.log("✅ Table 'nirf_form_data' ensured to exist.");
//   }
// });

pool.query(createUserTable, (err, res) => {
  if (err) {
    console.error("Error creating user table:", err);
  } else {
    console.log("✅ Table 'auth' ensured to exist.");
  }
});

app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.render("index.ejs", {
      message: `Welcome, ${req.session.user.name}!`,
      role: req.session.user.role == "admin",
    });
    console.log("👤 User session found:", req.session.user);
  } else {
    res.redirect("/login");
    return;
  }
});

app.get("/register", (req, res) => {
  verifyPrivilageLogin(req, res, () => {
    res.render("register.ejs");
  });
});

app.get("/login", (req, res) => {
  const message = req.query.message;
  res.render("login.ejs", { message });
});

app.get("/form", (req, res) => {
  verifyLogin(req, res, () => {
    res.render("preview.ejs", { forward: "./form" });
  });
});

app.get("/view", (req, res) => {
  verifyPrivilageLogin(req, res, () => {
    res.render("preview.ejs", { forward: "./view" });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Error logging out");
    } else {
      console.log("✅ User logged out successfully.");
      res.redirect("/login");
    }
  });
});

app.get("/editPass", (req, res) => {
  verifyLogin(req, res, () => {
    res.render("editPass.ejs", { username: req.session.user.name });
  });
});

app.get("/dev", (req, res) => {
  if (req.session && req.session.user && req.session.user.name === "dev") {
    res.render("dev.ejs");
  } else {
    console.log("❌ Unauthorized access attempt to /dev");
    res.status(403).send("Access denied");
  }
});

app.post("/dev", (req, res) => {
  const { sql } = req.body;
  console.log("📥 Received Dev Query:", sql);

  pool.query(sql, (err, result) => {
    if (err) {
      console.error("Error executing dev query:", err);
      res.status(500).send(`Error executing query: ${err.message}`);
    } else {
      console.log("✅ Dev query executed successfully.");
      res.json(result);
    }
  });
});

app.post("/editPass", (req, res) => {
  const { username, password, newPassword } = req.body;
  console.log("📥 Received Edit Password Request:", { username });

  pool.query(
    "UPDATE public.auth SET password = $1 WHERE username = $2 AND password = $3",
    [newPassword, username, password],
    (err, result) => {
      if (err) {
        console.error("Error updating password:", err);
        res.status(500).send("Error updating password");
      } else {
        if (result.rowCount > 0) {
          console.log("✅ Password updated successfully for user:", username);
          res.redirect("/?message=Password updated successfully!");
        } else {
          console.log("❌ Invalid old password for user:", username);
          res.render("editPass.ejs", {
            message: "Invalid old password. Please try again.",
            username: req.body.username,
          });
        }
      }
    },
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log("📥 Received Login Request:", { username });

  // Verify User Credentials & Set Session
  pool.query(
    "select * from public.auth where username = $1 and password = $2",
    [username, password],
    (err, result) => {
      if (err) res.status(500).send("Error during login", err);
      else {
        if (result !== undefined && result.rows.length > 0) {
          console.log("✅ Login successful for user:", username);
          req.session.user = {
            name: req.body.username,
            role: result.rows[0].role,
          };
          res.redirect("/");
        } else {
          console.log("❌ Invalid credentials for user:", username);
          return res.render("login.ejs", {
            message: "Invalid username or password. Please try again.",
          });
        }
      }
    },
  );
});

app.post("/register", (req, res) => {
  const { username, password, role } = req.body;
  console.log("📥 Received Registration Request:", { username });

  // Check if user already exists
  pool.query(
    "select * from public.auth where username = $1",
    [username],
    (err, result) => {
      if (err) {
        res.status(500).send("Error during registration", err);
      } else {
        if (result !== undefined && result.rows.length > 0) {
          console.log("❌ User already exists:", username);
          return res.render("register.ejs", {
            message: "Username already exists. Please choose a different one.",
          });
        } else {
          // Insert new user into the database
          pool.query(
            "INSERT INTO public.auth (username, password, role) VALUES ($1, $2, $3)",
            [username, password, role],
            (err, result) => {
              if (err) {
                res.status(500).send("Error during registration", err);
              } else {
                console.log("✅ Registration successful for user:", username);
                // After successful registration, redirect to login
                res.redirect(`/?message=Registration successful!  ${username}`);
              }
            },
          );
        }
      }
    },
  );
});

app.post("/form", (req, res) => {
  const data = req.body;
  console.log("📥 Received Preview Request:", data);
  res.render("form.ejs", {
    data: req.body,
    createYear,
    currentYear: Number(data.year.slice(0, 4)),
  });
});

app.post("/view", (req, res) => {
  const data = req.body;
  console.log("📥 Received PreView Request:", data);

  pool.query(
    "SELECT * FROM public.nirf_form_data WHERE department = $1 AND year = $2",
    [data.department, data.year],
    (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data");
      } else {
        if (result.rows.length === 0) {
          return res.render("index.ejs", {
            message: `No data found for the ${data.year} year and ${data.department} department.`,
            role: req.session.user.role == "admin",
          });
        }
        console.log("✅ Data fetched for view:", result.rows[0]);
        res.render("view.ejs", {
          currentYear: Number(data.year.slice(0, 4)),
          createYear,
          data: Object.values(result.rows[0]),
        });
      }
    },
  );
});

app.post("/submit", async (req, res) => {
  try {
    const data = Object.values(req.body);
    console.log("📥 Received Form Data:", data);

    const year = data[0];
    const department = data[1];

    // updating records
    const checkQuery =
      "SELECT year FROM nirf_form_data WHERE year = $1 AND department = $2";
    const checkResult = await pool.query(checkQuery, [year, department]);

    let messageToUser;
    if (checkResult.rows.length > 0) {
      // Record exists, deleting existing record before inserting new data
      pool.query(
        "delete from nirf_form_data where year = $1 and department = $2",
        [year, department],
        (err, result) => {
          if (err) {
            console.error("Error deleting existing record:", err);
            res.status(500).send("Error updating data");
          } else {
            console.log("✅ Existing record deleted successfully.");
          }
        },
      );

      messageToUser = "Existing data updated successfully.";
    } else {
      messageToUser = "Data inserted successfully.";
    }

    const result = await pool.query(insertQuery, data);
    console.log(
      "✅ Database operation successful. Rows affected:",
      result.rowCount,
    );

    res.render("index.ejs", {
      message: messageToUser,
      role: req.session.user.role == "admin",
    });
  } catch (error) {
    console.error("❌ Error processing form data:", error);

    res.status(500).send("Error processing form data");
  }
});

app.get("/download", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM nirf_form_data");
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(200).send("No data to download.");
    }

    // Generate CSV header
    const header = Object.keys(rows[0]).join(",");

    // Generate CSV data rows
    const csvRows = rows.map((row) =>
      Object.values(row)
        .map((value) => {
          // Handle values that might contain commas or newlines by quoting them
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes("\n") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    );

    const csvString = [header, ...csvRows].join("\n");

    res.header("Content-Type", "text/csv");
    res.header(
      "Content-Disposition",
      'attachment; filename="nirf_form_data.csv"',
    );
    res.status(200).send(csvString);
  } catch (error) {
    console.error("Error generating CSV for download:", error);
    res.status(500).send("Error generating CSV for download.");
  }
});

app.get("/courses", (req, res) => {
  res.render("courseForm.ejs");
});

app.get("/syllabus", (req, res) => {
  res.render("syllabusIndex.ejs");
});

app.post("/submit-course", verifyLogin, async (req, res) => {
  try {
    const courseData = req.body;
    console.log("📥 Received Raw Course Data:", courseData);

    // 1. Sanitize string fields that might contain rich text
    if (courseData.objectives) {
      courseData.objectives = xss(courseData.objectives);
    }

    if (courseData.importantNote) {
      courseData.importantNote = xss(courseData.importantNote);
    }

    // 2. Sanitize arrays containing dynamic rich text (like unit contents)
    if (Array.isArray(courseData.unitContents)) {
      courseData.unitContents = courseData.unitContents.map((content) =>
        xss(content),
      );
    }

    console.log("🛡️ Sanitized Course Data Ready for DB:", courseData);

    // TODO: Build your PostgreSQL INSERT query here
    // await pool.query('INSERT INTO courses ...', [...values]);

    res.redirect("/syllabus?message=Course data saved safely!");
  } catch (error) {
    console.error("❌ Error processing course form:", error);
    res.status(500).send("Error saving course data.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

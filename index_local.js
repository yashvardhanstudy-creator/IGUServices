require("dotenv").config();
const session = require("express-session");
const express = require("express");
const path = require("path");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./config/database");

const PORT = process.env.PORT_LOCAL || 3000;
const app = express();

// Middleware: Serve static files and parse incoming request bodies
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Middleware: Setup persistent user sessions
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
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

// Middleware: Inject global query parameters and URL into all EJS templates
app.use((req, res, next) => {
  res.locals.query = req.query;
  res.locals.url = req.originalUrl;
  next();
});

// Configure EJS as the templating engine
app.set("view engine", "ejs");

// ---------------------------------------------------------
// ROUTERS (Modular Architecture)
// ---------------------------------------------------------
const authRoutes = require("./routes/auth");
const devRoutes = require("./routes/dev");
const courseRoutes = require("./routes/course");
const programRoutes = require("./routes/program");
const syllabusRoutes = require("./routes/syllabus");

app.use("/", authRoutes);
app.use("/dev", devRoutes);
app.use("/", courseRoutes);
app.use("/", programRoutes);
app.use("/", syllabusRoutes);

// ---------------------------------------------------------
// ERROR HANDLING & SERVER START
// ---------------------------------------------------------

// 404 Fallback Handler
app.use((req, res) => {
  res.status(404).render("404.ejs");
});

// Global Error Handler for unhandled crashes
app.use((err, req, res, next) => {
  console.error("🔥 Global Error Caught:", err.stack);
  res.status(500).send("Something went wrong! Please try again later.");
});

// Start the Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

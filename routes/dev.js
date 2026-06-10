const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/", (req, res) => {
  if (
    req.session &&
    req.session.user &&
    req.session.user.role === "admin" &&
    req.session.user.name === "dev"
  ) {
    res.render("dev.ejs");
  } else {
    console.log("❌ Unauthorized access attempt to /dev");
    res.status(403).send("Access denied");
  }
});

router.post("/", (req, res) => {
  if (
    !req.session ||
    !req.session.user ||
    req.session.user.role !== "admin" ||
    req.session.user.name !== "dev"
  ) {
    console.log("❌ Unauthorized POST access attempt to /dev");
    return res.status(403).send("Access denied");
  }

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

module.exports = router;

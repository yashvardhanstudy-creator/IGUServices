const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { verifyLogin, verifyPrivilageLogin } = require("../constants");

router.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.render("syllabusIndex.ejs", {
      message: `Welcome, ${req.session.user.name}!`,
      role: req.session.user.role == "admin",
    });
    console.log("👤 User session found:", req.session.user);
  } else {
    res.redirect("/login");
  }
});

router.get("/register", (req, res) => {
  verifyPrivilageLogin(req, res, () => {
    res.render("register.ejs");
  });
});

router.get("/login", (req, res) => {
  const message = req.query.message;
  res.render("login.ejs", { message });
});

router.get("/logout", (req, res) => {
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

router.get("/editPass", (req, res) => {
  verifyLogin(req, res, () => {
    res.render("editPass.ejs", { username: req.session.user.name });
  });
});

router.post("/editPass", (req, res) => {
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

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log("📥 Received Login Request:", { username });

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

router.post("/register", (req, res) => {
  const { username, password, role } = req.body;
  console.log("📥 Received Registration Request:", { username });

  pool.query(
    "select * from public.auth where username = $1",
    [username],
    (err, result) => {
      if (err) return res.status(500).send("Error during registration", err);
      if (result !== undefined && result.rows.length > 0) {
        console.log("❌ User already exists:", username);
        return res.render("register.ejs", {
          message: "Username already exists. Please choose a different one.",
        });
      }
      pool.query(
        "INSERT INTO public.auth (username, password, role) VALUES ($1, $2, $3)",
        [username, password, role],
        (err) => {
          if (err)
            return res.status(500).send("Error during registration", err);
          console.log("✅ Registration successful for user:", username);
          res.redirect(`/?message=Registration successful!  ${username}`);
        },
      );
    },
  );
});

module.exports = router;

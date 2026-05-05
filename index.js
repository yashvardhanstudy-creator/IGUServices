require("dotenv").config();
const session = require("express-session");
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const xss = require("xss");
const puppeteer = require("puppeteer");
const {
  dbConnectInfoTest,
  // dbConnectInfoDevLaptop,
  createUserTable,
  verifyLogin,
  verifyPrivilageLogin,
  insertCourseQuery,
  createCourseTableQuery,
  createSemesterCoursesTableQuery,
  insertSemesterCoursesQuery,
  createProgramTableQuery,
  insertProgramQuery,
  // dbConnectInfoReal,
} = require("./constants");
const { dummyCourseData } = require("./dummyData");

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

pool.query(createUserTable, (err, res) => {
  if (err) {
    console.error("Error creating user table:", err);
  } else {
    console.log("✅ Table 'auth' ensured to exist.");
  }
});

pool.query(createCourseTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating course table:", err);
  } else {
    console.log("✅ Table 'course_syllabus' ensured to exist.");
  }
});

pool.query(createSemesterCoursesTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating semester_courses table:", err);
  } else {
    console.log("✅ Table 'semester_courses' ensured to exist.");
  }
});

pool.query(createProgramTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating programs table:", err);
  } else {
    console.log("✅ Table 'programs' ensured to exist.");
  }
});

app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.render("syllabusIndex.ejs", {
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

app.get("/courses", verifyLogin, async (req, res) => {
  // Render the form. It's now a dynamic, client-side driven form for new courses.
  res.render("courseForm.ejs");
});

app.get("/edit-course/:courseCode", verifyLogin, async (req, res) => {
  try {
    // Creating a dummy object to prevent the view from crashing until actual mapping is implemented

    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Course not found in the database.");
    }

    res.render("courseForm.ejs", {
      courseData: dummyCourseData,
      course: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching course data for edit:", error);
    res.status(500).send("Error fetching course data.");
  }
});

app.get("/view-course/:courseCode", verifyLogin, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Course not found in the database.");
    }

    // PostgreSQL's node-pg driver automatically parses JSONB columns into JavaScript objects/arrays
    res.render("courseView.ejs", { data: result.rows[0] });
  } catch (error) {
    console.error("❌ Error fetching course data:", error);
    res.status(500).send("Error fetching course data.");
  }
});

app.get("/courses-list", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT course_code, course_title, category FROM course_syllabus ORDER BY created_at DESC",
    );

    res.render("coursesList.ejs", { courses: result.rows });
  } catch (error) {
    console.error("❌ Error fetching courses list:", error);
    res.status(500).send("Error fetching courses list.");
  }
});

app.post("/courses", verifyLogin, async (req, res) => {
  try {
    const courseData = req.body;
    console.log("📥 Received Raw Course Data:", courseData);

    // Helper function to ensure we always have an array even if a single item is submitted
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return [val];
    };

    // Process dynamic syllabus units
    const unitTitles = normalizeArray(
      courseData.unitTitles || courseData["unitTitles[]"],
    );
    const unitContents = normalizeArray(
      courseData.unitContents || courseData["unitContents[]"],
    );
    const unitHours = normalizeArray(
      courseData.unitHours || courseData["unitHours[]"],
    );

    const syllabusUnits = unitTitles.map((title, index) => ({
      title: title,
      content: xss(unitContents[index] || ""),
      hours: parseInt(unitHours[index] || 0),
    }));

    // Process dynamic CO-PO Mapping
    const mapCO = normalizeArray(courseData.mapCO || courseData["mapCO[]"]);
    const coPoMapping = mapCO.map((co, index) => {
      const mapObj = { co: co };
      for (let j = 1; j <= 11; j++) {
        const poArr = normalizeArray(
          courseData[`mapPO${j}`] || courseData[`mapPO${j}[]`],
        );
        mapObj[`po${j}`] = poArr[index] || "";
      }
      for (let j = 1; j <= 2; j++) {
        const psoArr = normalizeArray(
          courseData[`mapPSO${j}`] || courseData[`mapPSO${j}[]`],
        );
        mapObj[`pso${j}`] = psoArr[index] || "";
      }
      return mapObj;
    });

    // Process Evaluation Criteria
    const evaluationCriteria = {
      internal: {
        class_participation: parseInt(courseData.eval_class_participation) || 0,
        seminar: parseInt(courseData.eval_seminar) || 0,
        mid_term: parseInt(courseData.eval_mid_term) || 0,
      },
      end_term: {
        written_exam: parseInt(courseData.examMarks) || 0,
      },
    };

    // Process NEP Mapping
    const nepMapping = {
      employability: courseData.nep_employability || "",
      skill_enhancement: courseData.nep_skill_enhancement || "",
      communication_development: courseData.nep_communication_development || "",
      indian_knowledge_system: courseData.nep_indian_knowledge_system || "",
      environmental_awareness: courseData.nep_environmental_awareness || "",
      current_issues: courseData.nep_current_issues || "",
      women_empowerment: courseData.nep_women_empowerment || "",
      public_policies: courseData.nep_public_policies || "",
      any_other: courseData.nep_any_other || "",
    };

    const values = [
      courseData.courseCode,
      courseData.category,
      courseData.courseTitle,
      courseData.prerequisite,
      parseInt(courseData.l) || 0,
      parseInt(courseData.t) || 0,
      parseInt(courseData.p) || 0,
      parseInt(courseData.credit) || 0,
      parseInt(courseData.classMarks) || 0,
      parseInt(courseData.examMarks) || 0,
      parseInt(courseData.practicalMarks) || 0,
      parseInt(courseData.totalMarks) || 0,
      courseData.examDuration,
      xss(courseData.paperSetterInstructions || ""),
      JSON.stringify(syllabusUnits),
      JSON.stringify(
        normalizeArray(
          courseData.courseOutcomes || courseData["courseOutcomes[]"],
        ),
      ),
      JSON.stringify(
        normalizeArray(
          courseData.suggestedBooks || courseData["suggestedBooks[]"],
        ),
      ),
      JSON.stringify(
        normalizeArray(
          courseData.referenceBooks || courseData["referenceBooks[]"],
        ),
      ),
      JSON.stringify(coPoMapping),
      JSON.stringify(evaluationCriteria),
      JSON.stringify(nepMapping),
    ];

    await pool.query(insertCourseQuery, values);
    console.log("✅ Course Data successfully saved to DB.");

    res.redirect("/?message=Course data saved safely!");
  } catch (error) {
    console.error("❌ Error processing course form:", error);
    res.status(500).send("Error saving course data.");
  }
});

app.get("/semester-courses-form", verifyLogin, async (req, res) => {
  try {
    const { semester, academic_program, specialization, year_onward } =
      req.query;
    let structure = null;

    if (semester && academic_program && specialization && year_onward) {
      const result = await pool.query(
        "SELECT * FROM semester_courses WHERE semester = $1 AND academic_program = $2 AND specialization = $3 AND year_onward = $4",
        [semester, academic_program, specialization, year_onward],
      );
      if (result.rows.length > 0) {
        structure = result.rows[0];
      }
    }
    res.render("semesterCoursesForm.ejs", { structure });
  } catch (error) {
    console.error("❌ Error loading semester courses form:", error);
    res.status(500).send("Error loading form.");
  }
});

app.post("/semester-courses", verifyLogin, async (req, res) => {
  try {
    const {
      semester,
      academic_program,
      specialization,
      year_onward,
      courses_code,
      important_note,
    } = req.body;
    console.log("📥 Received Semester Courses Data:", req.body);

    // Helper to ensure we store valid JSON strings for JSONB columns
    const normalizeJson = (val) => {
      if (!val) return JSON.stringify([]);
      if (typeof val === "string") {
        try {
          return JSON.stringify(JSON.parse(val));
        } catch (e) {
          return JSON.stringify([val]);
        }
      }
      return JSON.stringify(val);
    };

    const coursesCodeJson = normalizeJson(courses_code);
    const importantNoteJson = normalizeJson(important_note);

    await pool.query(insertSemesterCoursesQuery, [
      semester,
      academic_program,
      specialization,
      year_onward,
      coursesCodeJson,
      importantNoteJson,
    ]);
    console.log("✅ Semester Courses successfully saved to DB.");

    res.redirect("/?message=Semester courses saved successfully!");
  } catch (error) {
    console.error("❌ Error saving semester courses:", error);
    res.status(500).send("Error saving semester courses data.");
  }
});

app.get("/semester-courses-list", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT semester, academic_program, specialization, year_onward FROM semester_courses ORDER BY year_onward DESC, semester ASC",
    );

    res.render("semesterCoursesList.ejs", { structures: result.rows });
  } catch (error) {
    console.error("❌ Error fetching semester structures list:", error);
    res.status(500).send("Error fetching semester structures list.");
  }
});

app.get("/view-semester-structure", verifyLogin, async (req, res) => {
  try {
    const { semester, academic_program, specialization, year_onward } =
      req.query;

    if (!semester || !academic_program || !specialization || !year_onward) {
      return res
        .status(400)
        .send(
          "Missing required query parameters: semester, academic_program, specialization, year_onward",
        );
    }

    const structureResult = await pool.query(
      "SELECT * FROM semester_courses WHERE semester = $1 AND academic_program = $2 AND specialization = $3 AND year_onward = $4",
      [semester, academic_program, specialization, year_onward],
    );

    if (structureResult.rows.length === 0) {
      return res.status(404).send("Semester structure not found.");
    }

    const structure = structureResult.rows[0];
    const courseCodes = structure.courses_code || [];

    let orderedCourses = [];
    if (courseCodes.length > 0) {
      const coursesResult = await pool.query(
        "SELECT course_code, course_title, l, t, p, credit, class_marks, exam_marks, practical_marks, total_marks, exam_duration FROM course_syllabus WHERE course_code = ANY($1::text[])",
        [courseCodes],
      );
      const coursesMap = new Map(
        coursesResult.rows.map((c) => [c.course_code, c]),
      );
      orderedCourses = courseCodes.map(
        (code) =>
          coursesMap.get(code) || {
            course_code: code,
            course_title: "⚠️ Syllabus Not Found",
            l: "-",
            t: "-",
            p: "-",
            credit: "-",
            class_marks: "-",
            exam_marks: "-",
            practical_marks: "-",
            total_marks: "-",
            exam_duration: "-",
            is_missing: true,
          },
      );
    }

    res.render("semesterCoursesView.ejs", {
      structure,
      courses: orderedCourses,
    });
  } catch (error) {
    console.error("❌ Error fetching semester structure for view:", error);
    res.status(500).send("Error fetching semester structure data.");
  }
});

app.get("/generate-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT academic_program, specialization, year_onward FROM semester_courses ORDER BY academic_program, specialization, year_onward DESC",
    );
    res.render("fullSyllabusForm.ejs", { options: result.rows });
  } catch (error) {
    console.error("❌ Error fetching full syllabus options:", error);
    res.status(500).send("Error loading page.");
  }
});

app.get("/view-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const { academic_program, specialization, year_onward } = req.query;
    if (!academic_program || !specialization || !year_onward) {
      return res
        .status(400)
        .send("Missing program, specialization, or year_onward");
    }

    // 1. Fetch all semester structures for this combo
    const semResult = await pool.query(
      "SELECT * FROM semester_courses WHERE academic_program = $1 AND specialization = $2 AND year_onward = $3 ORDER BY semester ASC",
      [academic_program, specialization, year_onward],
    );

    if (semResult.rows.length === 0) {
      return res
        .status(404)
        .send("No semester structures found for this selection.");
    }

    const semesters = semResult.rows;

    // 2. Extract sequence of unique course codes
    const orderedCourseCodes = [];
    const codeSet = new Set();
    semesters.forEach((sem) => {
      (sem.courses_code || []).forEach((code) => {
        if (!codeSet.has(code)) {
          codeSet.add(code);
          orderedCourseCodes.push(code);
        }
      });
    });

    // 3. Fetch detailed courses and assemble data
    let coursesMap = new Map();
    if (orderedCourseCodes.length > 0) {
      const courseResult = await pool.query(
        "SELECT * FROM course_syllabus WHERE course_code = ANY($1::text[])",
        [orderedCourseCodes],
      );
      courseResult.rows.forEach((c) => coursesMap.set(c.course_code, c));
    }

    const getCourseOrDefault = (code) =>
      coursesMap.get(code) || {
        course_code: code,
        course_title: "⚠️ Syllabus Not Found",
        l: "-",
        t: "-",
        p: "-",
        credit: "-",
        class_marks: "-",
        exam_marks: "-",
        practical_marks: "-",
        total_marks: "-",
        exam_duration: "-",
        is_missing: true,
      };

    const detailedCourses = orderedCourseCodes.map(getCourseOrDefault);
    const semestersWithCourses = semesters.map((sem) => ({
      ...sem,
      detailed_courses: (sem.courses_code || []).map(getCourseOrDefault),
    }));

    res.render("fullSyllabusView.ejs", {
      academic_program,
      specialization,
      year_onward,
      semesters: semestersWithCourses,
      allCourses: detailedCourses,
    });
  } catch (error) {
    console.error("❌ Error generating full syllabus:", error);
    res.status(500).send("Error generating document.");
  }
});

app.get("/download-full-syllabus-pdf", verifyLogin, async (req, res) => {
  try {
    const { academic_program, specialization, year_onward } = req.query;
    if (!academic_program || !specialization || !year_onward) {
      return res
        .status(400)
        .send("Missing program, specialization, or year_onward");
    }

    // 1. Fetch all semester structures for this combo
    const semResult = await pool.query(
      "SELECT * FROM semester_courses WHERE academic_program = $1 AND specialization = $2 AND year_onward = $3 ORDER BY semester ASC",
      [academic_program, specialization, year_onward],
    );

    if (semResult.rows.length === 0) {
      return res.status(404).send("No semester structures found.");
    }

    const semesters = semResult.rows;

    // 2. Extract sequence of unique course codes
    const orderedCourseCodes = [];
    const codeSet = new Set();
    semesters.forEach((sem) => {
      (sem.courses_code || []).forEach((code) => {
        if (!codeSet.has(code)) {
          codeSet.add(code);
          orderedCourseCodes.push(code);
        }
      });
    });

    // 3. Fetch detailed courses and assemble data
    let coursesMap = new Map();
    if (orderedCourseCodes.length > 0) {
      const courseResult = await pool.query(
        "SELECT * FROM course_syllabus WHERE course_code = ANY($1::text[])",
        [orderedCourseCodes],
      );
      courseResult.rows.forEach((c) => coursesMap.set(c.course_code, c));
    }

    const getCourseOrDefault = (code) =>
      coursesMap.get(code) || {
        course_code: code,
        course_title: "⚠️ Syllabus Not Found",
        l: "-",
        t: "-",
        p: "-",
        credit: "-",
        class_marks: "-",
        exam_marks: "-",
        practical_marks: "-",
        total_marks: "-",
        exam_duration: "-",
        is_missing: true,
      };

    const detailedCourses = orderedCourseCodes.map(getCourseOrDefault);
    const semestersWithCourses = semesters.map((sem) => ({
      ...sem,
      detailed_courses: (sem.courses_code || []).map(getCourseOrDefault),
    }));

    req.app.render(
      "fullSyllabusView.ejs",
      {
        academic_program,
        specialization,
        year_onward,
        semesters: semestersWithCourses,
        allCourses: detailedCourses,
      },
      async (err, html) => {
        if (err) {
          console.error("Render error:", err);
          return res.status(500).send("Error rendering HTML for PDF");
        }

        const browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });
        await browser.close();

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Full-Syllabus-${specialization}-${year_onward}.pdf"`,
        });
        res.send(pdf);
      },
    );
  } catch (error) {
    console.error("❌ Error generating full syllabus PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

app.get("/download-pdf/:courseCode", verifyLogin, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Course not found.");
    }

    req.app.render(
      "courseView.ejs",
      { data: result.rows[0] },
      async (err, html) => {
        if (err) {
          console.error("Render error:", err);
          return res.status(500).send("Error rendering HTML for PDF");
        }

        const browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        await browser.close();

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${courseCode}-Syllabus.pdf"`,
        });
        res.send(pdf);
      },
    );
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

app.get("/program-specialization-form", verifyLogin, (req, res) => {
  const { program_name, specialization } = req.query;

  if (program_name && specialization) {
    pool.query(
      "SELECT * FROM programs WHERE program_name = $1 AND specialization = $2",
      [program_name, specialization],
      (err, result) => {
        if (err) {
          console.error("Error fetching program:", err);
          return res.status(500).send("Error fetching program.");
        }
        res.render("programSpecializationForm.ejs", {
          program: result.rows[0] || null,
        });
      },
    );
  } else {
    res.render("programSpecializationForm.ejs", { program: null });
  }
});

const schemeB = [
  {
    number: 1,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-A1", credits: 4 },
      { type: "CC-B1", credits: 4 },
      { type: "CC-C1", credits: 4 },
      { type: "CC-M1", credits: 2 },
      { type: "MDC-1", credits: 3 },
      { type: "AEC-1", credits: 2 },
      { type: "SEC-1", credits: 3 },
      { type: "VAC-1", credits: 2 },
    ],
  },
  {
    number: 2,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-A2", credits: 4 },
      { type: "CC-B2", credits: 4 },
      { type: "CC-C2", credits: 4 },
      { type: "CC-M2", credits: 2 },
      { type: "MDC-2", credits: 3 },
      { type: "AEC-2", credits: 2 },
      { type: "SEC-2", credits: 3 },
      { type: "VAC-2", credits: 2 },
    ],
  },
  {
    number: 3,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-A3", credits: 4 },
      { type: "CC-B3", credits: 4 },
      { type: "CC-C3", credits: 4 },
      { type: "CC-M3", credits: 4 },
      { type: "MDC-3", credits: 3 },
      { type: "AEC-3", credits: 2 },
      { type: "SEC-3", credits: 3 },
    ],
  },
  {
    number: 4,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A4", credits: 4 },
      { type: "CC-B4", credits: 4 },
      { type: "CC-C4", credits: 4 },
      { type: "CC-M4(V)", credits: 4 },
      { type: "AEC-4", credits: 2 },
      { type: "VAC-3", credits: 2 },
    ],
  },
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 20,
    courses: [
      { type: "CC-A5", credits: 4 },
      { type: "CC-B5", credits: 4 },
      { type: "CC-C5", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Intership", credits: 4 },
    ],
  },
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A6", credits: 4 },
      { type: "CC-B6", credits: 4 },
      { type: "CC-C6", credits: 4 },
      { type: "CC-M6", credits: 4 },
      { type: "CC-M7(V)", credits: 4 },
    ],
  },
];

const schemeA = [
  {
    number: 1,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-A1", credits: 4 },
      { type: "CC-B1", credits: 4 },
      { type: "CC-C1", credits: 4 },
      { type: "CC-M1", credits: 2 },
      { type: "MDC-1", credits: 3 },
      { type: "AEC-1", credits: 2 },
      { type: "SEC-1", credits: 3 },
      { type: "VAC-1", credits: 2 },
    ],
  },
  {
    number: 2,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-A2", credits: 4 },
      { type: "CC-B2", credits: 4 },
      { type: "CC-C2", credits: 4 },
      { type: "CC-M2", credits: 2 },
      { type: "MDC-2", credits: 3 },
      { type: "AEC-2", credits: 2 },
      { type: "SEC-2", credits: 3 },
      { type: "VAC-2", credits: 2 },
    ],
  },
  {
    number: 3,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-A3", credits: 4 },
      { type: "CC-B3", credits: 4 },
      { type: "CC-C3", credits: 4 },
      { type: "CC-M3", credits: 4 },
      { type: "MDC-3", credits: 3 },
      { type: "AEC-3", credits: 2 },
      { type: "SEC-3", credits: 3 },
    ],
  },
  {
    number: 4,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A4", credits: 4 },
      { type: "CC-B4", credits: 4 },
      { type: "CC-C4", credits: 4 },
      { type: "CC-M4(V)", credits: 4 },
      { type: "AEC-4", credits: 2 },
      { type: "VAC-3", credits: 2 },
    ],
  },
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 20,
    courses: [
      { type: "CC-A5", credits: 4 },
      { type: "CC-B5", credits: 4 },
      { type: "CC-C5", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Intership", credits: 4 },
    ],
  },
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A6", credits: 4 },
      { type: "CC-B6", credits: 4 },
      { type: "CC-C6", credits: 4 },
      { type: "CC-M6", credits: 4 },
      { type: "CC-M7(V)", credits: 4 },
    ],
  },
];

const curriculumSchemes = {
  "Scheme A": schemeA,
  "Scheme B": [], // Placeholders for you to fill in later
  "Scheme C": [],
  "Scheme D": [],
  "Scheme P": [],
  "Scheme Q": [],
  "Scheme R": [],
  "Scheme S": [],
};

app.get("/curriculum", verifyLogin, (req, res) => {
  let requestedScheme = req.query.scheme || "Scheme A";

  // Normalize if the database only stored the single letter (e.g., "A" -> "Scheme A")
  if (requestedScheme.trim().length === 1) {
    requestedScheme = "Scheme " + requestedScheme.trim().toUpperCase();
  }

  // Check if the scheme exists in our mapping and has data; otherwise default to Scheme A
  const isAvailable =
    curriculumSchemes[requestedScheme] &&
    curriculumSchemes[requestedScheme].length > 0;

  const semesters = isAvailable ? curriculumSchemes[requestedScheme] : schemeA;
  const schemeName = isAvailable
    ? requestedScheme
    : "Scheme A (Default Fallback)";

  res.render("curriculum.ejs", { semesters, schemeName, query: req.query });
});

app.post("/program-specialization", verifyLogin, async (req, res) => {
  try {
    const { program_name, specialization, level, scheme } = req.body;
    await pool.query(insertProgramQuery, [
      program_name,
      specialization,
      level,
      scheme,
    ]);
    res.redirect("/?message=Program and Specialization saved successfully!");
  } catch (error) {
    console.error("❌ Error saving program:", error);
    res.status(500).send("Error saving program.");
  }
});

app.get("/programs-list", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM programs ORDER BY program_name ASC, specialization ASC",
    );
    res.render("programsList.ejs", { programs: result.rows });
  } catch (error) {
    console.error("❌ Error fetching programs list:", error);
    res.status(500).send("Error fetching programs list.");
  }
});

app.use((req, res) => {
  res.status(404).render("404.ejs");
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

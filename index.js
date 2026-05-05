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
  createProgramTableQuery,
  insertProgramQuery,
  createCurriculumDraftsTableQuery,
  insertCurriculumDraftQuery,
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

// pool.query(createSemesterCoursesTableQuery, (err, res) => {
//   if (err) {
//     console.error("Error creating semester_courses table:", err);
//   } else {
//     console.log("✅ Table 'semester_courses' ensured to exist.");
//   }
// });

pool.query(createProgramTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating programs table:", err);
  } else {
    console.log("✅ Table 'programs' ensured to exist.");
  }
});

pool.query(createCurriculumDraftsTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating curriculum_drafts table:", err);
  } else {
    console.log("✅ Table 'curriculum_drafts' ensured to exist.");
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

app.get("/api/course/:courseCode", verifyLogin, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );

    if (result.rows.length > 0) {
      res.json({ exists: true, course: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("❌ Error fetching course via API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
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

    const course = result.rows[0];

    // Dynamically find all programs and semesters where this course is used
    const draftsResult = await pool.query(
      "SELECT program_name, draft_data FROM curriculum_drafts",
    );
    let programs = new Set();
    let semesters = new Set();

    draftsResult.rows.forEach((row) => {
      const draft = row.draft_data || {};
      for (const [key, value] of Object.entries(draft)) {
        if (value && value.code === courseCode) {
          programs.add(row.program_name);
          const semNum = key.split("_")[0]; // Extract semester number from grid key (e.g., '3_0')
          semesters.add(semNum);
        }
      }
    });

    const getOrdinal = (n) => {
      const ordinals = {
        1: "1st",
        2: "2nd",
        3: "3rd",
        4: "4th",
        5: "5th",
        6: "6th",
        7: "7th",
        8: "8th",
      };
      return ordinals[n] || n;
    };

    const formattedSemesters = Array.from(semesters).map((s) => {
      if (!isNaN(s) && s.trim() !== "") return getOrdinal(s) + " Semester";
      return s + " Semester";
    });

    // Attach formatted values to the course object so EJS maps them automatically
    course.programme_name = Array.from(programs).join(", ") || "Unassigned";
    course.semester = formattedSemesters.join(", ") || "Unassigned";

    res.render("courseForm.ejs", {
      course: course,
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
    const coursesResult = await pool.query(
      "SELECT course_code, course_name AS course_title, course_type AS category FROM course_syllabus ORDER BY created_at DESC",
    );

    // Fetch all drafts to determine course-to-program linkages
    const draftsResult = await pool.query(
      "SELECT program_name, specialization, draft_data FROM curriculum_drafts",
    );

    const courseProgramsMap = {};
    draftsResult.rows.forEach((row) => {
      const draft = row.draft_data || {};
      const programLabel = `${row.program_name} (${row.specialization})`;

      Object.values(draft).forEach((item) => {
        if (item && item.code) {
          if (!courseProgramsMap[item.code]) {
            courseProgramsMap[item.code] = new Set();
          }
          courseProgramsMap[item.code].add(programLabel);
        }
      });
    });

    const courses = coursesResult.rows.map((course) => {
      const linked_programs = courseProgramsMap[course.course_code]
        ? Array.from(courseProgramsMap[course.course_code])
        : [];
      return { ...course, linked_programs };
    });

    res.render("coursesList.ejs", { courses });
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
      eval_cp_th: courseData.eval_cp_th || "0",
      eval_cp_pr: courseData.eval_cp_pr || "NA",
      eval_written_exam_th: courseData.eval_written_exam_th || "0",
      eval_seminar_th: courseData.eval_seminar_th || "0",
      eval_seminar_pr: courseData.eval_seminar_pr || "NA",
      eval_lab_record_pr: courseData.eval_lab_record_pr || "NA",
      eval_seminar_demo_pr: courseData.eval_seminar_demo_pr || "NA",
      eval_viva_pr: courseData.eval_viva_pr || "NA",
      eval_midterm_th: courseData.eval_midterm_th || "0",
      eval_execution_pr: courseData.eval_execution_pr || "NA",
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
      courseData.courseCode || "", // $1
      courseData.creditScheme || "", // $2
      courseData.natureOfCourse || "", // $3
      courseData.courseName || "", // $4
      courseData.courseType || "", // $5
      courseData.prerequisite || "", // $6

      parseInt(courseData.credits_theory) || 0, // $7
      parseInt(courseData.credits_practical) || 0, // $8
      parseInt(courseData.credits_total) || 0, // $9

      parseInt(courseData.marks_internal_theory) || 0, // $10
      parseInt(courseData.marks_internal_practical) || 0, // $11
      parseInt(courseData.marks_internal_total) || 0, // $12
      parseInt(courseData.marks_endterm_theory) || 0, // $13
      parseInt(courseData.marks_endterm_practical) || 0, // $14
      parseInt(courseData.marks_endterm_total) || 0, // $15
      parseInt(courseData.marks_max) || 0, // $16

      courseData.exam_duration || "", // $17
      xss(courseData.paperSetterInstructions || ""), // $18

      JSON.stringify(
        normalizeArray(
          courseData.courseOutcomes || courseData["courseOutcomes[]"],
        ),
      ), // $19
      JSON.stringify(syllabusUnits), // $20
      JSON.stringify(evaluationCriteria), // $21
      xss(courseData.resources || ""), // $22
      JSON.stringify(coPoMapping), // $23
      JSON.stringify(nepMapping), // $24
    ];

    await pool.query(insertCourseQuery, values);
    console.log("✅ Course Data successfully saved to DB.");

    res.redirect("/?message=Course data saved safely!");
  } catch (error) {
    console.error("❌ Error processing course form:", error);
    res.status(500).send("Error saving course data.");
  }
});

app.get("/generate-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT program_name AS academic_program, specialization, 'N/A' AS year_onward FROM curriculum_drafts ORDER BY program_name, specialization",
    );
    res.render("fullSyllabusForm.ejs", { options: result.rows });
  } catch (error) {
    console.error("❌ Error fetching full syllabus options:", error);
    res.status(500).send("Error loading page.");
  }
});

app.get("/view-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const { academic_program, specialization } = req.query;
    if (!academic_program || !specialization) {
      return res.status(400).send("Missing program or specialization");
    }

    // 1. Fetch draft data for this program combo
    const draftResult = await pool.query(
      "SELECT draft_data FROM curriculum_drafts WHERE program_name = $1 AND specialization = $2",
      [academic_program, specialization],
    );

    if (draftResult.rows.length === 0) {
      return res
        .status(404)
        .send("No curriculum draft found for this program.");
    }

    const draftData = draftResult.rows[0].draft_data || {};

    // 2. Extract semesters and course codes
    const semesterMap = new Map();
    for (const [key, value] of Object.entries(draftData)) {
      if (!value || !value.code) continue;
      const parts = key.split("_");
      const semNum = parts[0];
      const index = parseInt(parts[1], 10) || 0;

      if (!semesterMap.has(semNum)) {
        semesterMap.set(semNum, { semester: semNum, courses: [] });
      }
      semesterMap.get(semNum).courses.push({ code: value.code, index });
    }

    const orderedCourseCodes = [];
    const codeSet = new Set();

    const semesters = Array.from(semesterMap.values())
      .map((sem) => {
        sem.courses.sort((a, b) => a.index - b.index);
        sem.courses_code = sem.courses.map((c) => c.code);

        sem.courses_code.forEach((code) => {
          if (!codeSet.has(code)) {
            codeSet.add(code);
            orderedCourseCodes.push(code);
          }
        });
        return sem;
      })
      .sort((a, b) => {
        const numA = parseInt(a.semester);
        const numB = parseInt(b.semester);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.semester).localeCompare(String(b.semester));
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
      year_onward: req.query.year_onward || "N/A",
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
    const { academic_program, specialization } = req.query;
    if (!academic_program || !specialization) {
      return res.status(400).send("Missing program or specialization");
    }

    // 1. Fetch draft data for this program combo
    const draftResult = await pool.query(
      "SELECT draft_data FROM curriculum_drafts WHERE program_name = $1 AND specialization = $2",
      [academic_program, specialization],
    );

    if (draftResult.rows.length === 0) {
      return res
        .status(404)
        .send("No curriculum draft found for this program.");
    }

    const draftData = draftResult.rows[0].draft_data || {};

    // 2. Extract semesters and course codes
    const semesterMap = new Map();
    for (const [key, value] of Object.entries(draftData)) {
      if (!value || !value.code) continue;
      const parts = key.split("_");
      const semNum = parts[0];
      const index = parseInt(parts[1], 10) || 0;

      if (!semesterMap.has(semNum)) {
        semesterMap.set(semNum, { semester: semNum, courses: [] });
      }
      semesterMap.get(semNum).courses.push({ code: value.code, index });
    }

    const orderedCourseCodes = [];
    const codeSet = new Set();

    const semesters = Array.from(semesterMap.values())
      .map((sem) => {
        sem.courses.sort((a, b) => a.index - b.index);
        sem.courses_code = sem.courses.map((c) => c.code);

        sem.courses_code.forEach((code) => {
          if (!codeSet.has(code)) {
            codeSet.add(code);
            orderedCourseCodes.push(code);
          }
        });
        return sem;
      })
      .sort((a, b) => {
        const numA = parseInt(a.semester);
        const numB = parseInt(b.semester);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.semester).localeCompare(String(b.semester));
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
        year_onward: req.query.year_onward || "N/A",
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
          "Content-Disposition": `attachment; filename="Full-Syllabus-${specialization}.pdf"`,
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
// Complete Scheme B based on all screenshots (8 Semesters)
const schemeB = [
  // Semester 1
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
  // Semester 2
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
  // Semester 3
  {
    number: 3,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "MCC-A2", credits: 4 },
      { type: "MCC-A4", credits: 4 },
      { type: "MCC-A5", credits: 4 },
      { type: "CC-M3(V)", credits: 4 },
      { type: "MDC-3", credits: 3 },
      { type: "AEC-3", credits: 2 },
      { type: "SEC-3", credits: 3 },
    ],
  },
  // Semester 4
  {
    number: 4,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "MCC-A6", credits: 4 },
      { type: "MCC-A7", credits: 4 },
      { type: "MCC-A8", credits: 4 },
      { type: "DSE-A1", credits: 4 },
      { type: "CC-M4(V)", credits: 4 },
      { type: "AEC-4", credits: 2 },
      { type: "VAC-3", credits: 2 },
    ],
  },
  // Semester 5
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 20,
    courses: [
      { type: "MCC-A9", credits: 4 },
      { type: "MCC-A10", credits: 4 },
      { type: "DSE-A2", credits: 4 },
      { type: "DSE-A3", credits: 4 },
      { type: "Internship", credits: 4 },
    ],
  },
  // Semester 6
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "MCC-A11", credits: 4 },
      { type: "MCC-A12", credits: 4 },
      { type: "DSE-A4", credits: 4 },
      { type: "DSE-A5", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
    ],
  },
  // Semester 7
  {
    number: 7,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-H1", credits: 4 },
      { type: "CC-H2", credits: 4 },
      { type: "CC-H3", credits: 4 },
      { type: "DSE-H1", credits: 4 },
      { type: "PC-H1", credits: 4 },
      { type: "CC-HM1", credits: 4 },
    ],
  },
  // Semester 8 - Option A (Standard)
  {
    number: "8A",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "CC-H6", credits: 4 },
      { type: "DSE-H2", credits: 4 },
      { type: "PC-H2", credits: 4 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
  // OR Separator (visual only)
  {
    number: "OR",
    color: "#fff3cd",
    isOrRow: true,
    courses: [
      {
        type: "═══════ OR ═════",
      },
    ],
  },
  // Semester 8 - Option B (Project/Dissertation)
  {
    number: "8B",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "PROJECT/DISSERTATION", credits: 12 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
];

// Alternative Semester 8 with Project/Dissertation (as shown in fourth screenshot, bottom)
// You can use this version if needed:
const schemeB_Alternative_Semester8 = {
  number: 8,
  color: "#fbe5d6",
  totalCredits: 24,
  courses: [
    { type: "CC-H4", credits: 4 },
    { type: "CC-H5", credits: 4 },
    { type: "PROJECT/DISSERTATION", credits: 12 },
    { type: "CC-HM2", credits: 4 },
  ],
};
// Complete Scheme C based on screenshots (8 Semesters)
const schemeC = [
  // Semester 1
  {
    number: 1,
    color: "#d9e2f3",
    totalCredits: 22,
    courses: [
      { type: "MCC-A1", credits: 4 },
      { type: "MCC-A2", credits: 4 },
      { type: "CC-M1", credits: 4 },
      { type: "MDC-1", credits: 3 },
      { type: "AEC-1", credits: 2 },
      { type: "SEC-1", credits: 3 },
      { type: "VAC-1", credits: 2 },
    ],
  },
  // Semester 2
  {
    number: 2,
    color: "#fbe5d6",
    totalCredits: 22,
    courses: [
      { type: "MCC-A3", credits: 4 },
      { type: "DSEC-A1", credits: 4 },
      { type: "CC-M2", credits: 4 },
      { type: "MDC-2", credits: 3 },
      { type: "AEC-2", credits: 2 },
      { type: "SEC-2", credits: 3 },
      { type: "VAC-2", credits: 2 },
    ],
  },
  // Semester 3
  {
    number: 3,
    color: "#d9e2f3",
    totalCredits: 22,
    courses: [
      { type: "MCC-A4", credits: 4 },
      { type: "MCC-A5", credits: 4 },
      { type: "CC-M3", credits: 4 },
      { type: "MDC-3", credits: 3 },
      { type: "AEC-3", credits: 2 },
      { type: "SEC-3", credits: 3 },
      { type: "VAC-3", credits: 2 },
    ],
  },
  // Semester 4
  {
    number: 4,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "MCC-A6", credits: 4 },
      { type: "MCC-A7", credits: 4 },
      { type: "MCC-A8", credits: 4 },
      { type: "DSE-A1", credits: 4 },
      { type: "CC-M4(V)", credits: 4 },
      { type: "AEC-4", credits: 2 },
      { type: "VAC-4", credits: 2 },
    ],
  },
  // Semester 5
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "MCC-A9", credits: 4 },
      { type: "MCC-A10", credits: 4 },
      { type: "DSE-A2", credits: 4 },
      { type: "DSE-A3", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Internship", credits: 4 },
    ],
  },
  // Semester 6
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 22,
    courses: [
      { type: "MCC-A11", credits: 4 },
      { type: "MCC-A12", credits: 4 },
      { type: "DSE-A4", credits: 4 },
      { type: "DSE-A5", credits: 4 },
      { type: "CC-M6(V)", credits: 4 },
      { type: "SEC-4", credits: 2 },
    ],
  },
  // Semester 7
  {
    number: 7,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-H1", credits: 4 },
      { type: "CC-H2", credits: 4 },
      { type: "CC-H3", credits: 4 },
      { type: "DSE-H1", credits: 4 },
      { type: "PC-H1", credits: 4 },
      { type: "CC-HM1", credits: 4 },
    ],
  },
  // Semester 8 - Option A (Standard)
  {
    number: 8,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "DDSE-H2", credits: 4 },
      { type: "PC-H2", credits: 4 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
];

// Scheme C with BOTH options for Semester 8 (if you want to show both)
const schemeCWithAlternate = [
  // Semesters 1-6 (same as above)
  {
    number: 1,
    color: "#d9e2f3",
    totalCredits: 22,
    courses: [
      { type: "MCC-A1", credits: 4 },
      { type: "MCC-A2", credits: 4 },
      { type: "CC-M1", credits: 4 },
      { type: "MDC-1", credits: 3 },
      { type: "AEC-1", credits: 2 },
      { type: "SEC-1", credits: 3 },
      { type: "VAC-1", credits: 2 },
    ],
  },
  {
    number: 2,
    color: "#fbe5d6",
    totalCredits: 22,
    courses: [
      { type: "MCC-A3", credits: 4 },
      { type: "DSEC-A1", credits: 4 },
      { type: "CC-M2", credits: 4 },
      { type: "MDC-2", credits: 3 },
      { type: "AEC-2", credits: 2 },
      { type: "SEC-2", credits: 3 },
      { type: "VAC-2", credits: 2 },
    ],
  },
  {
    number: 3,
    color: "#d9e2f3",
    totalCredits: 22,
    courses: [
      { type: "MCC-A4", credits: 4 },
      { type: "MCC-A5", credits: 4 },
      { type: "CC-M3", credits: 4 },
      { type: "MDC-3", credits: 3 },
      { type: "AEC-3", credits: 2 },
      { type: "SEC-3", credits: 3 },
      { type: "VAC-3", credits: 2 },
    ],
  },
  {
    number: 4,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "MCC-A6", credits: 4 },
      { type: "MCC-A7", credits: 4 },
      { type: "MCC-A8", credits: 4 },
      { type: "DSE-A1", credits: 4 },
      { type: "CC-M4(V)", credits: 4 },
      { type: "AEC-4", credits: 2 },
      { type: "VAC-4", credits: 2 },
    ],
  },
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "MCC-A9", credits: 4 },
      { type: "MCC-A10", credits: 4 },
      { type: "DSE-A2", credits: 4 },
      { type: "DSE-A3", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Internship", credits: 4 },
    ],
  },
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 22,
    courses: [
      { type: "MCC-A11", credits: 4 },
      { type: "MCC-A12", credits: 4 },
      { type: "DSE-A4", credits: 4 },
      { type: "DSE-A5", credits: 4 },
      { type: "CC-M6(V)", credits: 4 },
      { type: "SEC-4", credits: 2 },
    ],
  },
  // Semester 7
  {
    number: 7,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-H1", credits: 4 },
      { type: "CC-H2", credits: 4 },
      { type: "CC-H3", credits: 4 },
      { type: "DSE-H1", credits: 4 },
      { type: "PC-H1", credits: 4 },
      { type: "CC-HM1", credits: 4 },
    ],
  },
  // Semester 8 - Option A (Standard)
  {
    number: "8A",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "DDSE-H2", credits: 4 },
      { type: "PC-H2", credits: 4 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
  // OR Separator
  {
    number: "OR",
    color: "#fff3cd",
    totalCredits: 0,
    isOrRow: true,
    courses: [
      {
        type: "════════════════════════════════════════════════════════════ OR ════════════════════════════════════════════════════════════",
        credits: 0,
      },
    ],
  },
  // Semester 8 - Option B (Project/Dissertation)
  {
    number: "8B",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "PROJECT/DISSERTATION", credits: 12 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
];
// Complete Scheme D based on screenshots (8 Semesters)
const schemeD = [
  // Semester 1
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
  // Semester 2
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
  // Semester 3
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
  // Semester 4
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
  // Semester 5
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 20,
    courses: [
      { type: "CC-A5", credits: 4 },
      { type: "CC-B5", credits: 4 },
      { type: "CC-C5", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Internship", credits: 4 },
    ],
  },
  // Semester 6
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A6", credits: 4 },
      { type: "CC-B6", credits: 4 },
      { type: "CC-C6", credits: 4 },
      { type: "CC-M6(V)", credits: 4 },
      { type: "CC-M7(V)", credits: 4 },
    ],
  },
  // Semester 7
  {
    number: 7,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-H1", credits: 4 },
      { type: "CC-H2", credits: 4 },
      { type: "CC-H3", credits: 4 },
      { type: "DSE-H1", credits: 4 },
      { type: "PC-H1", credits: 4 },
      { type: "CC-HM1", credits: 4 },
    ],
  },
  // Semester 8 - Option A (Standard)
  {
    number: 8,
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "CC-H6", credits: 4 },
      { type: "DSE-H2", credits: 4 },
      { type: "PC-H2", credits: 4 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
];

// Scheme D with BOTH options for Semester 8
const schemeDWithAlternate = [
  // Semester 1
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
  // Semester 2
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
  // Semester 3
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
  // Semester 4
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
  // Semester 5
  {
    number: 5,
    color: "#d9e2f3",
    totalCredits: 20,
    courses: [
      { type: "CC-A5", credits: 4 },
      { type: "CC-B5", credits: 4 },
      { type: "CC-C5", credits: 4 },
      { type: "CC-M5(V)", credits: 4 },
      { type: "Internship", credits: 4 },
    ],
  },
  // Semester 6
  {
    number: 6,
    color: "#fbe5d6",
    totalCredits: 20,
    courses: [
      { type: "CC-A6", credits: 4 },
      { type: "CC-B6", credits: 4 },
      { type: "CC-C6", credits: 4 },
      { type: "CC-M6(V)", credits: 4 },
      { type: "CC-M7(V)", credits: 4 },
    ],
  },
  // Semester 7
  {
    number: 7,
    color: "#d9e2f3",
    totalCredits: 24,
    courses: [
      { type: "CC-H1", credits: 4 },
      { type: "CC-H2", credits: 4 },
      { type: "CC-H3", credits: 4 },
      { type: "DSE-H1", credits: 4 },
      { type: "PC-H1", credits: 4 },
      { type: "CC-HM1", credits: 4 },
    ],
  },
  // Semester 8 - Option A (Standard)
  {
    number: "8A",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "CC-H6", credits: 4 },
      { type: "DSE-H2", credits: 4 },
      { type: "PC-H2", credits: 4 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
  // OR Separator
  {
    number: "OR",
    color: "#fff3cd",
    totalCredits: 0,
    isOrRow: true,
    courses: [
      {
        type: "════════════════════════════════════════════════════════════ OR ════════════════════════════════════════════════════════════",
        credits: 0,
      },
    ],
  },
  // Semester 8 - Option B (Project/Dissertation)
  {
    number: "8B",
    color: "#fbe5d6",
    totalCredits: 24,
    courses: [
      { type: "CC-H4", credits: 4 },
      { type: "CC-H5", credits: 4 },
      { type: "PROJECT/DISSERTATION", credits: 12 },
      { type: "CC-HM2", credits: 4 },
    ],
  },
];

const curriculumSchemes = {
  "Scheme A": schemeA,
  "Scheme B": schemeB, // Placeholders for you to fill in later
  "Scheme C": schemeC,
  "Scheme D": schemeD,
  "Scheme P": [],
  "Scheme Q": [],
  "Scheme R": [],
  "Scheme S": [],
};

app.get("/curriculum", verifyLogin, async (req, res) => {
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

  // Fetch saved draft if available
  let draftData = {};
  let savedCoursesMap = {};
  if (req.query.program_name && req.query.specialization) {
    try {
      const draftResult = await pool.query(
        "SELECT draft_data FROM curriculum_drafts WHERE program_name = $1 AND specialization = $2",
        [req.query.program_name, req.query.specialization],
      );
      if (draftResult.rows.length > 0) {
        draftData = draftResult.rows[0].draft_data || {};

        // Collect course codes to check against the main course_syllabus table
        const courseCodesToCheck = Object.values(draftData)
          .map((item) => item.code)
          .filter((code) => code && code.trim() !== "");

        if (courseCodesToCheck.length > 0) {
          const existingResult = await pool.query(
            "SELECT * FROM course_syllabus WHERE course_code = ANY($1::text[])",
            [courseCodesToCheck],
          );
          existingResult.rows.forEach((row) => {
            savedCoursesMap[row.course_code] = row;
          });
        }
      }
    } catch (err) {
      console.error("Error fetching curriculum draft:", err);
    }
  }

  res.render("curriculum.ejs", {
    semesters,
    schemeName,
    query: req.query,
    draftData,
    savedCoursesMap,
  });
});

app.post("/save-curriculum-draft", verifyLogin, async (req, res) => {
  try {
    const { program_name, specialization, draft_data } = req.body;
    if (program_name && specialization) {
      await pool.query(insertCurriculumDraftQuery, [
        program_name,
        specialization,
        JSON.stringify(draft_data),
      ]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
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

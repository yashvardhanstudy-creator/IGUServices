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
const curriculumSchemes = require("./curriculumSchemes");

const PORT = process.env.PORT_REAL || 3005;
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
    if (done) done();
  } else {
    console.log("✅ Connected to PostgreSQL database", client.database);
    done();
  }
});

pool.query(createUserTable, (err, res) => {
  if (err) {
    console.error("Error creating user table:", err);
  } else {
    console.log("✅ Table 'auth' ensured to exist.");
  }
});

// pool.query(
//   "ALTER TABLE course_syllabus ADD COLUMN IF NOT EXISTS owning_program_code TEXT",
//   (err, res) => {
//     if (err) {
//       console.error("Error adding owning columns:", err);
//     } else {
//       console.log("✅ Ensured 'owning_program_code' column exists.");
//     }
//   },
// );
pool.query(createProgramTableQuery, (err, res) => {
  if (err) {
    console.error("Error creating programs table:", err);
  } else {
    console.log("✅ Table 'programs' ensured to exist.");
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

app.get("/courses", verifyPrivilageLogin, async (req, res) => {
  // Render the form. It's now a dynamic, client-side driven form for new courses.
  res.render("courseForm.ejs");
});

app.get("/api/program/:programCode", verifyLogin, async (req, res) => {
  try {
    const programCode = req.params.programCode;
    const result = await pool.query(
      "SELECT num_pos, num_psos FROM programs WHERE program_code = $1",
      [programCode],
    );

    if (result.rows.length > 0) {
      res.json({ exists: true, program: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("❌ Error fetching program via API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
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

    let lockedPO = null;
    let lockedPSO = null;
    if (
      course.owning_program_code &&
      !course.owning_program_code.startsWith("POOL") &&
      course.owning_program_code !== "From University Pool"
    ) {
      const progRes = await pool.query(
        "SELECT num_pos, num_psos FROM programs WHERE program_code = $1",
        [course.owning_program_code],
      );
      if (progRes.rows.length > 0) {
        lockedPO = progRes.rows[0].num_pos;
        lockedPSO = progRes.rows[0].num_psos;
      }
    }

    // Dynamically find all programs and semesters where this course is used
    const draftsResult = await pool.query(
      "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code",
    );
    let programs = new Set();
    let semesters = new Set();

    draftsResult.rows.forEach((row) => {
      const draft = row.draft_data || {};
      for (const [key, value] of Object.entries(draft)) {
        if (value && value.code === courseCode) {
          programs.add(row.subject_name);
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

    const isPoolCourse =
      !course.owning_program_code ||
      course.owning_program_code === "From University Pool" ||
      course.owning_program_code.startsWith("POOL");
    if (isPoolCourse) {
      if (
        course.owning_program_code &&
        course.owning_program_code.startsWith("POOL|")
      ) {
        course.programme_name = course.owning_program_code.substring(5);
      } else {
        course.programme_name = "University Pool";
      }
    } else {
      course.programme_name = Array.from(programs).join(", ") || "Unassigned";
    }

    const storedSemester =
      course.nep_mapping && course.nep_mapping.course_semester
        ? course.nep_mapping.course_semester
        : "";
    if (isPoolCourse) {
      course.semester = storedSemester || "";
    } else {
      course.semester =
        formattedSemesters.length > 0
          ? formattedSemesters.join(", ")
          : storedSemester || "";
    }

    res.render("courseForm.ejs", {
      course: course,
      lockedPO: lockedPO,
      lockedPSO: lockedPSO,
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
    const { program_filter } = req.query;

    const programsResult = await pool.query(
      "SELECT program_code, subject_name, specialization FROM programs ORDER BY subject_name ASC, specialization ASC",
    );
    const programsList = programsResult.rows;

    let courses = [];

    if (program_filter === "unassigned") {
      const draftsResult = await pool.query(
        "SELECT draft_data FROM curriculum_drafts",
      );
      const usedCodes = new Set();
      draftsResult.rows.forEach((row) => {
        Object.values(row.draft_data || {}).forEach((item) => {
          if (item && item.code) usedCodes.add(item.code);
        });
      });
      const usedCodesArray = Array.from(usedCodes);

      let query =
        "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE (owning_program_code NOT LIKE 'POOL%' AND owning_program_code IS NOT NULL AND owning_program_code != 'From University Pool')";
      let params = [];
      if (usedCodesArray.length > 0) {
        query += " AND course_code != ALL($1::text[])";
        params.push(usedCodesArray);
      }
      query += " ORDER BY created_at DESC";

      const coursesResult = await pool.query(query, params);
      courses = coursesResult.rows.map((c) => ({ ...c, linked_programs: [] }));
    } else if (program_filter === "pool") {
      const coursesResult = await pool.query(
        "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE owning_program_code LIKE 'POOL%' OR owning_program_code IS NULL OR owning_program_code = 'From University Pool' ORDER BY course_type ASC, created_at DESC",
      );
      courses = coursesResult.rows.map((c) => ({
        ...c,
        linked_programs: ["University Pool"],
      }));
    } else if (program_filter && program_filter !== "all") {
      const draftResult = await pool.query(
        "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code WHERE c.program_code = $1",
        [program_filter],
      );
      if (draftResult.rows.length > 0) {
        const row = draftResult.rows[0];
        const draft = row.draft_data || {};
        const programLabel = row.subject_name;
        const codes = new Set();
        Object.values(draft).forEach((item) => {
          if (item && item.code) codes.add(item.code);
        });
        const codesArray = Array.from(codes);
        if (codesArray.length > 0) {
          const coursesResult = await pool.query(
            "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE course_code = ANY($1::text[]) ORDER BY created_at DESC",
            [codesArray],
          );
          courses = coursesResult.rows.map((c) => ({
            ...c,
            linked_programs: [programLabel],
          }));
        }
      }
    } else if (program_filter === "all") {
      const coursesResult = await pool.query(
        "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus ORDER BY created_at DESC",
      );
      const draftsResult = await pool.query(
        "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code",
      );
      const courseProgramsMap = {};
      draftsResult.rows.forEach((row) => {
        const draft = row.draft_data || {};
        const programLabel = row.subject_name;
        Object.values(draft).forEach((item) => {
          if (item && item.code) {
            if (!courseProgramsMap[item.code])
              courseProgramsMap[item.code] = new Set();
            courseProgramsMap[item.code].add(programLabel);
          }
        });
      });
      courses = coursesResult.rows.map((course) => {
        let linked_programs = courseProgramsMap[course.course_code]
          ? Array.from(courseProgramsMap[course.course_code])
          : [];
        if (
          !course.owning_program_code ||
          course.owning_program_code.startsWith("POOL") ||
          course.owning_program_code === "From University Pool"
        ) {
          if (linked_programs.length === 0)
            linked_programs.push("University Pool");
        }
        return { ...course, linked_programs };
      });
    }

    res.render("coursesList.ejs", {
      courses,
      programsList,
      selectedFilter: program_filter || "",
      isAdmin: req.session.user.role === "admin",
    });
  } catch (error) {
    console.error("❌ Error fetching courses list:", error);
    res.status(500).send("Error fetching courses list.");
  }
});

app.post("/delete-course", verifyPrivilageLogin, async (req, res) => {
  try {
    const { courseCode } = req.body;
    if (courseCode) {
      // Check if course is actively linked to any curriculum draft
      const draftsResult = await pool.query(
        "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code",
      );
      const linkedPrograms = [];
      draftsResult.rows.forEach((row) => {
        const draft = row.draft_data || {};
        for (const key in draft) {
          if (draft[key] && draft[key].code === courseCode) {
            linkedPrograms.push(row.subject_name);
            break; // Found in this program, move to next
          }
        }
      });

      if (linkedPrograms.length > 0) {
        const errorMsg = `Cannot delete ${courseCode}. It is currently used in: ${linkedPrograms.join(", ")}. Please remove it from these curriculum drafts first.`;
        return res.redirect(
          `/courses-list?error=${encodeURIComponent(errorMsg)}`,
        );
      }

      await pool.query("DELETE FROM course_syllabus WHERE course_code = $1", [
        courseCode,
      ]);
    }
    res.redirect("/courses-list?message=Course deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).send("Error deleting course.");
  }
});

app.post("/courses", verifyLogin, async (req, res) => {
  try {
    const courseData = req.body;
    console.log("📥 Received Raw Course Data:", courseData);

    // Check for duplicate course code on new creation
    if (courseData.isEditMode === "false") {
      const existingCheck = await pool.query(
        "SELECT course_code FROM course_syllabus WHERE course_code = $1",
        [courseData.courseCode],
      );
      if (existingCheck.rows.length > 0) {
        return res.redirect(
          `/courses?error=${encodeURIComponent("Course code already exists. Please edit it from the Courses List.")}`,
        );
      }
    }

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
    const unitCLOs = normalizeArray(
      courseData.unitCLOs || courseData["unitCLOs[]"],
    );
    const unitHours = normalizeArray(
      courseData.unitHours || courseData["unitHours[]"],
    );

    const syllabusUnits = unitTitles.map((title, index) => ({
      title: title,
      content: xss(unitContents[index] || ""),
      clos: xss(unitCLOs[index] || ""),
      hours: parseInt(unitHours[index] || 0),
    }));

    // Process dynamic CO-PO Mapping
    const mapCO = normalizeArray(courseData.mapCO || courseData["mapCO[]"]);
    const coPoMapping = mapCO.map((co, index) => {
      const mapObj = { co: co };
      for (let j = 1; j <= 12; j++) {
        const poKey = `mapPO${j}`;
        const poKeyArr = `mapPO${j}[]`;
        if (
          courseData[poKey] !== undefined ||
          courseData[poKeyArr] !== undefined
        ) {
          const poArr = normalizeArray(
            courseData[poKey] || courseData[poKeyArr],
          );
          mapObj[`po${j}`] = poArr[index] || "";
        }
      }
      for (let j = 1; j <= 4; j++) {
        const psoKey = `mapPSO${j}`;
        const psoKeyArr = `mapPSO${j}[]`;
        if (
          courseData[psoKey] !== undefined ||
          courseData[psoKeyArr] !== undefined
        ) {
          const psoArr = normalizeArray(
            courseData[psoKey] || courseData[psoKeyArr],
          );
          mapObj[`pso${j}`] = psoArr[index] || "";
        }
      }
      return mapObj;
    });

    // Process Evaluation Criteria
    const evaluationCriteria = {
      eval_cp_th: courseData.eval_cp_th || "0",
      eval_cp_pr: courseData.eval_cp_pr || "NA",
      eval_written_exam_th: courseData.eval_written_exam_th || "0",
      eval_written_exam_pr: courseData.eval_written_exam_pr || "NA",
      eval_seminar_th: courseData.eval_seminar_th || "0",
      eval_seminar_pr: courseData.eval_seminar_pr || "NA",
      eval_lab_record_th: courseData.eval_lab_record_th || "NA",
      eval_lab_record_pr: courseData.eval_lab_record_pr || "NA",
      eval_seminar_demo_th: courseData.eval_seminar_demo_th || "NA",
      eval_seminar_demo_pr: courseData.eval_seminar_demo_pr || "NA",
      eval_viva_th: courseData.eval_viva_th || "NA",
      eval_viva_pr: courseData.eval_viva_pr || "NA",
      eval_midterm_th: courseData.eval_midterm_th || "0",
      eval_midterm_pr: courseData.eval_midterm_pr || "NA",
      eval_execution_th: courseData.eval_execution_th || "NA",
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
      course_semester: courseData.semester || "",
    };

    const isPoolCourse = courseData.is_pool_course === "true";
    let owningProgramCodeToSave = null;

    if (isPoolCourse) {
      owningProgramCodeToSave = courseData.owning_program
        ? `POOL|${courseData.owning_program}`
        : "POOL";
    } else {
      owningProgramCodeToSave = courseData.owning_program_code || null;
    }

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
        (typeof (
          courseData.courseOutcomes || courseData["courseOutcomes[]"]
        ) === "string"
          ? (courseData.courseOutcomes || courseData["courseOutcomes[]"]).split(
              /\r?\n/,
            )
          : normalizeArray(
              courseData.courseOutcomes || courseData["courseOutcomes[]"],
            )
        )
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      ), // $19
      JSON.stringify(syllabusUnits), // $20
      JSON.stringify(evaluationCriteria), // $21
      xss(courseData.resources || ""), // $22
      JSON.stringify(coPoMapping), // $23
      JSON.stringify(nepMapping), // $24
      owningProgramCodeToSave, // $25
    ];

    await pool.query(insertCourseQuery, values);
    console.log("✅ Course Data successfully saved to DB.");

    res.redirect("/?message=Course data saved safely!");
  } catch (error) {
    console.error("❌ Error processing course form:", error);
    res.status(500).send("Error saving course data.");
  }
});

app.get("/program-details-form", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) {
      return res.status(400).send("Missing program code");
    }

    const programResult = await pool.query(
      "SELECT * FROM programs WHERE program_code = $1",
      [program_code],
    );

    if (programResult.rows.length === 0) {
      return res.status(404).send("Program not found.");
    }

    const program = programResult.rows[0];
    // Pass existing details, or an empty object to the form
    const programDetails = program.program_details || {};

    res.render("programDetailsForm.ejs", {
      program,
      programDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching program details for form:", error);
    res.status(500).send("Error loading page.");
  }
});

app.post("/program-details-form", verifyLogin, async (req, res) => {
  try {
    const {
      title,
      program_code,
      academic_year,
      department,
      faculty,
      approval_staff_council_date,
      approval_staff_council_remark,
      approval_bos_date,
      approval_bos_remark,
      approval_faculty_date,
      approval_faculty_remark,
      approval_ac_date,
      approval_ac_remark,
      year_of_implementation,
      vision_mission_dept,
      about_programme,
      intake,
      min_eligibility,
      passing_criteria,
      eligibility_exam,
      peo,
      po,
      pso,
    } = req.body;

    const programDetails = {
      title: title || "",
      program_code: program_code || "",
      academic_year: academic_year || "",
      department: department || "",
      faculty: faculty || "",
      approvals: {
        staff_council: {
          date: approval_staff_council_date,
          remark: approval_staff_council_remark,
        },
        bos: { date: approval_bos_date, remark: approval_bos_remark },
        faculty: {
          date: approval_faculty_date,
          remark: approval_faculty_remark,
        },
        ac: { date: approval_ac_date, remark: approval_ac_remark },
      },
      year_of_implementation: year_of_implementation || "",
      vision_mission_dept: vision_mission_dept || "",
      about_programme: about_programme || "",
      intake: intake || "",
      min_eligibility: min_eligibility || "",
      passing_criteria: passing_criteria || "",
      eligibility_exam: eligibility_exam || "",
      peos: Array.isArray(peo)
        ? peo.filter((item) => item && item.trim() !== "")
        : [],
      pos: Array.isArray(po)
        ? po.filter((item) => item && item.trim() !== "")
        : [],
      psos: Array.isArray(pso)
        ? pso.filter((item) => item && item.trim() !== "")
        : [],
    };

    await pool.query(
      "UPDATE programs SET program_details = $1 WHERE program_code = $2",
      [JSON.stringify(programDetails), program_code],
    );

    const query = new URLSearchParams({
      program_code,
    }).toString();
    res.redirect(`/view-full-syllabus?${query}`);
  } catch (error) {
    console.error("❌ Error saving program details:", error);
    res.status(500).send("Error saving details.");
  }
});

app.get("/generate-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT program_code, subject_name, specialization FROM programs ORDER BY subject_name, specialization",
    );
    const options = result.rows;
    options.unshift({
      program_code: "UNIVERSITY_POOL",
      subject_name: "All University Pool Courses",
      specialization: "",
    });
    res.render("fullSyllabusForm.ejs", { options: options });
  } catch (error) {
    console.error("❌ Error fetching full syllabus options:", error);
    res.status(500).send("Error loading page.");
  }
});

async function getFullSyllabusData(program_code) {
  if (program_code === "UNIVERSITY_POOL") {
    const poolCoursesResult = await pool.query(
      "SELECT * FROM course_syllabus WHERE owning_program_code LIKE 'POOL%' OR owning_program_code IS NULL OR owning_program_code = 'From University Pool' ORDER BY course_type ASC, course_code ASC",
    );
    const poolCourses = poolCoursesResult.rows.map((c) => ({
      ...c,
      is_db_course: true,
      is_missing: false,
    }));

    return {
      program: {
        program_code: "UNIVERSITY_POOL",
        subject_name: "University Pool",
        specialization: "Common Courses",
        level: "UG/PG",
      },
      programDetails: {
        title: "All University Pool Courses",
        department: "Multiple Departments",
        academic_year: "Current",
      },
      semesters: [],
      allCourses: poolCourses,
      totalProgramCredits: 0,
      totalProgramMarks: 0,
      totalSemesters: 0,
    };
  }

  // 1. Fetch program data, including new details
  const programResult = await pool.query(
    "SELECT * FROM programs WHERE program_code = $1",
    [program_code],
  );

  if (programResult.rows.length === 0) {
    throw new Error("Program not found.");
  }
  const program = programResult.rows[0];
  const programDetails = program.program_details || {};

  // 2. Fetch draft data
  const draftResult = await pool.query(
    "SELECT draft_data FROM curriculum_drafts WHERE program_code = $1",
    [program_code],
  );

  const draftData =
    draftResult.rows.length > 0 ? draftResult.rows[0].draft_data || {} : {};

  // 3. Extract semesters and course codes mapping to Scheme
  let requestedScheme = program.scheme || "A";
  if (requestedScheme.trim().length === 1) {
    requestedScheme = "Scheme " + requestedScheme.trim().toUpperCase();
  }
  const isAvailable =
    curriculumSchemes[requestedScheme] &&
    curriculumSchemes[requestedScheme].length > 0;

  const baseSemesters = isAvailable
    ? curriculumSchemes[requestedScheme]
    : curriculumSchemes["Scheme A"];

  const orderedCourseCodes = [];
  const codeSet = new Set();
  const draftTypeMap = new Map();

  const finalSemesters = baseSemesters.map((sem) => {
    if (sem.isDivider) return sem;
    if (sem.isYearlyDivider) {
      return {
        ...sem,
        text: draftData[`yearly_divider_${sem.year}`] || "",
      };
    }

    const detailed_courses_refs = sem.courses.map((courseTemplate, index) => {
      const cellKey = `${sem.number}_${index}`;
      const draftCell = draftData[cellKey] || {};

      if (draftCell.is_custom_row) {
        return {
          is_custom_slot: true,
          is_custom_row: true,
          course_type: draftCell.type || courseTemplate.type,
          credits_total: draftCell.credits || courseTemplate.credits,
          course_name: draftCell.nom || "Internship / Project Work",
          course_code: draftCell.code || "-",
          is_missing: false,
          tp: draftCell.tp || "",
          hrs: draftCell.hrs || "",
          marks_internal_total: draftCell.int || 0,
          marks_endterm_total: draftCell.end || 0,
          marks_max: draftCell.max || 0,
          exam_duration: draftCell.dur || "-",
        };
      }

      if (draftCell.code) {
        if (!codeSet.has(draftCell.code)) {
          codeSet.add(draftCell.code);
          orderedCourseCodes.push(draftCell.code);
        }
        draftTypeMap.set(draftCell.code, draftCell.type || courseTemplate.type);
        return {
          course_code: draftCell.code,
          is_db_course: true,
          lt_split: draftCell.lt_split || "0",
        };
      }

      // If the admin typed a Nomenclature but left the code blank, save it as a custom placeholder
      if (draftCell.nom) {
        return {
          is_custom_slot: true,
          course_type: draftCell.type || courseTemplate.type,
          credits_total: draftCell.credits || courseTemplate.credits,
          course_name: draftCell.nom,
          course_code: "-",
          is_missing: false,
          lt_split: draftCell.lt_split || "0",
        };
      }

      // Otherwise, fill the empty slot based on the curriculum scheme template
      const isPoolType = /^(MDC|AEC|SEC|VAC|Pool)/i.test(courseTemplate.type);
      return {
        is_pool_slot: isPoolType,
        is_empty_slot: !isPoolType,
        course_type: courseTemplate.type,
        credits_total: courseTemplate.credits,
        course_name: isPoolType
          ? "From the University Pool"
          : "Unassigned Slot",
        course_code: "-",
        is_missing: false,
        lt_split: "0",
      };
    });

    return {
      ...sem,
      semester: sem.number,
      detailed_courses_refs,
    };
  });

  // 4. Fetch detailed courses
  let coursesMap = new Map();
  if (orderedCourseCodes.length > 0) {
    const courseResult = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = ANY($1::text[])",
      [orderedCourseCodes],
    );
    courseResult.rows.forEach((c) => coursesMap.set(c.course_code, c));
  }

  const getCourseOrDefault = (code) => {
    const course = coursesMap.get(code) || {
      course_code: code,
      course_name: "⚠️ Syllabus Not Found",
      is_missing: true,
    };
    return {
      ...course,
      course_type: draftTypeMap.get(code) || course.course_type,
    };
  };

  // 5. Calculate totals and assemble data
  const allCourses = orderedCourseCodes.map(getCourseOrDefault);

  const missingCourses = allCourses
    .filter((c) => c.is_missing)
    .map((c) => c.course_code);
  if (missingCourses.length > 0) {
    throw new Error(
      `Cannot generate syllabus. The following courses are missing details: ${missingCourses.join(", ")}. Please ask teachers to fill them out.`,
    );
  }

  let totalProgramCredits = 0;
  let totalProgramMarks = 0;
  const countedSemesters = new Set();

  const semestersWithCourses = finalSemesters.map((sem) => {
    if (sem.isDivider) return sem;
    if (sem.isYearlyDivider) return sem;

    const semNumber = parseInt(sem.semester);
    let isFirstTimeSeeingThisSemester = true;
    if (!isNaN(semNumber)) {
      isFirstTimeSeeingThisSemester = !countedSemesters.has(semNumber);
      if (isFirstTimeSeeingThisSemester) {
        countedSemesters.add(semNumber);
      }
    }

    const detailed_courses = sem.detailed_courses_refs.map((ref) => {
      if (ref.is_db_course) {
        const dbCourse = getCourseOrDefault(ref.course_code);
        if (!dbCourse.is_missing && isFirstTimeSeeingThisSemester) {
          totalProgramCredits += parseInt(dbCourse.credits_total) || 0;
          totalProgramMarks += parseInt(dbCourse.marks_max) || 0;
        }
        return { ...dbCourse, is_db_course: true, lt_split: ref.lt_split };
      } else {
        if (isFirstTimeSeeingThisSemester) {
          totalProgramCredits += parseInt(ref.credits_total) || 0;
          if (ref.is_custom_row) {
            totalProgramMarks += parseInt(ref.marks_max) || 0;
          }
        }
        return ref;
      }
    });
    return {
      ...sem,
      detailed_courses,
    };
  });

  // Get the maximum actual semester number to avoid counting 8A/8B as extra semesters
  const totalSemesters = Math.max(
    0,
    ...finalSemesters
      .filter((s) => !s.isDivider && !s.isYearlyDivider && s.semester)
      .map((s) => parseInt(s.semester))
      .filter((n) => !isNaN(n)),
  );

  return {
    program,
    programDetails,
    semesters: semestersWithCourses,
    allCourses,
    totalProgramCredits,
    totalProgramMarks,
    totalSemesters,
  };
}

app.get("/view-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) {
      return res.status(400).send("Missing program code");
    }

    const data = await getFullSyllabusData(program_code);

    res.render("fullSyllabusView.ejs", {
      baseUrl: `${req.protocol}://${req.get("host")}`,
      academic_program: data.program.subject_name,
      specialization: data.program.specialization,
      program: data.program,
      programDetails: data.programDetails,
      semesters: data.semesters,
      allCourses: data.allCourses,
      totalProgramCredits: data.totalProgramCredits,
      totalProgramMarks: data.totalProgramMarks,
      totalSemesters: data.totalSemesters,
    });
  } catch (error) {
    console.error("❌ Error generating full syllabus:", error);
    res.redirect(
      `/generate-full-syllabus?error=${encodeURIComponent(error.message)}`,
    );
  }
});

app.get("/download-full-syllabus-pdf", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) {
      return res.status(400).send("Missing program code");
    }

    const data = await getFullSyllabusData(program_code);

    req.app.render(
      "fullSyllabusView.ejs",
      {
        baseUrl: `${req.protocol}://${req.get("host")}`,
        academic_program: data.program.subject_name,
        specialization: data.program.specialization,
        program: data.program,
        programDetails: data.programDetails,
        semesters: data.semesters,
        allCourses: data.allCourses,
        totalProgramCredits: data.totalProgramCredits,
        totalProgramMarks: data.totalProgramMarks,
        totalSemesters: data.totalSemesters,
      },
      async (err, html) => {
        if (err) {
          console.error("Render error:", err);
          return res.status(500).send("Error rendering HTML for PDF");
        }

        try {
          const browser = await puppeteer.launch({
            headless: true,
            channel: "chrome",
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
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );
          await page.setContent(html, { waitUntil: "networkidle2" });
          await page.evaluate(async () => {
            const images = document.querySelectorAll("img");
            await Promise.all(
              Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Resolve on error too to prevent hanging
                });
              }),
            );
          });
          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: `
              <div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; position: relative;">
                <span style="position: absolute; left: 20px;">${data.program.specialization ? data.program.specialization : ""}</span>
                <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                <span style="position: absolute; right: 20px;">IGU Meerpur</span>
              </div>
            `,
            margin: {
              top: "20mm",
              right: "10mm",
              bottom: "25mm",
              left: "10mm",
            },
          });
          await browser.close();

          res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Full-Syllabus-${data.program.specialization ? data.program.specialization : data.program.subject_name}.pdf"`,
          });
          res.send(pdf);
        } catch (pdfErr) {
          console.error("❌ PDF Generation Error:", pdfErr);
          res
            .status(500)
            .send("Error generating PDF document. Please try again.");
        }
      },
    );
  } catch (error) {
    console.error("❌ Error generating full syllabus PDF:", error);
    res.redirect(
      `/generate-full-syllabus?error=${encodeURIComponent(error.message)}`,
    );
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

        try {
          const browser = await puppeteer.launch({
            headless: true,
            // Tell the Windows Service to use the system-installed Google Chrome
            channel: "chrome",
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

          // Prevent external image CDNs from blocking headless browsers
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );

          await page.setContent(html, { waitUntil: "networkidle2" });

          // Force Puppeteer to wait until all images are fully downloaded and rendered
          await page.evaluate(async () => {
            const images = document.querySelectorAll("img");
            await Promise.all(
              Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Resolve on error too to prevent hanging
                });
              }),
            );
          });

          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: `
              <div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; position: relative;">
                <span style="position: absolute; left: 20px;">Course Code: ${courseCode}</span>
                <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                <span style="position: absolute; right: 20px;">IGU Meerpur</span>
              </div>
            `,
            margin: {
              top: "20mm",
              right: "20mm",
              bottom: "25mm",
              left: "20mm",
            },
          });

          await browser.close();

          res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${courseCode}-Syllabus.pdf"`,
          });
          res.send(pdf);
        } catch (pdfErr) {
          console.error("❌ PDF Generation Error:", pdfErr);
          res
            .status(500)
            .send("Error generating PDF document. Please try again.");
        }
      },
    );
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).send("Error generating PDF.");
  }
});

app.get("/program-specialization-form", verifyPrivilageLogin, (req, res) => {
  const { program_code } = req.query;

  if (program_code) {
    pool.query(
      "SELECT * FROM programs WHERE program_code = $1",
      [program_code],
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

app.get("/curriculum", verifyPrivilageLogin, async (req, res) => {
  let requestedScheme = req.query.scheme || "Scheme A";

  // Normalize if the database only stored the single letter (e.g., "A" -> "Scheme A")
  if (requestedScheme.trim().length === 1) {
    requestedScheme = "Scheme " + requestedScheme.trim().toUpperCase();
  }

  // Check if the scheme exists in our mapping and has data; otherwise default to Scheme A
  const isAvailable =
    curriculumSchemes[requestedScheme] &&
    curriculumSchemes[requestedScheme].length > 0;

  const semesters = isAvailable
    ? curriculumSchemes[requestedScheme]
    : curriculumSchemes["Scheme A"];
  const schemeName = isAvailable
    ? requestedScheme
    : "Scheme A (Default Fallback)";

  // Fetch saved draft if available
  let draftData = {};
  let savedCoursesMap = {};
  if (req.query.program_code) {
    try {
      // Check if Program Details (POs/PSOs) have been initialized
      const progRes = await pool.query(
        "SELECT num_pos FROM programs WHERE program_code = $1",
        [req.query.program_code],
      );
      if (progRes.rows.length > 0) {
        const details = progRes.rows[0];
        if (!details.num_pos || details.num_pos < 8) {
          return res.redirect(
            `/program-details-form?program_code=${encodeURIComponent(req.query.program_code)}&error=${encodeURIComponent("Please verify your Program Details before building the curriculum.")}`,
          );
        }
      }

      const draftResult = await pool.query(
        "SELECT draft_data FROM curriculum_drafts WHERE program_code = $1",
        [req.query.program_code],
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

app.post("/save-curriculum-draft", verifyPrivilageLogin, async (req, res) => {
  try {
    const { program_code, draft_data } = req.body;
    if (program_code) {
      await pool.query(insertCurriculumDraftQuery, [
        program_code,
        JSON.stringify(draft_data),
      ]);

      // Generate Shell Courses for Teachers
      for (const [key, item] of Object.entries(draft_data)) {
        if (item.code && item.nom) {
          await pool.query(
            `INSERT INTO course_syllabus (course_code, course_name, course_type, credits_total, credit_scheme, owning_program_code) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (course_code) DO UPDATE SET 
             course_name = EXCLUDED.course_name,
             course_type = EXCLUDED.course_type,
             credits_total = EXCLUDED.credits_total,
             credit_scheme = COALESCE(NULLIF(EXCLUDED.credit_scheme, ''), course_syllabus.credit_scheme),
             owning_program_code = COALESCE(course_syllabus.owning_program_code, EXCLUDED.owning_program_code)
             WHERE course_syllabus.credit_scheme IS NULL OR course_syllabus.credit_scheme = ''`,
            [
              item.code,
              item.nom,
              item.type || "",
              parseInt(item.credits) || 0,
              item.credit_scheme || "",
              program_code,
            ],
          );
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.post("/reset-course-scheme", verifyPrivilageLogin, async (req, res) => {
  try {
    const {
      courseCode,
      creditScheme,
      courseName,
      courseType,
      creditsTotal,
      programCode,
    } = req.body;
    if (courseCode && creditScheme) {
      // 1. Delete the existing course directly (bypassing the linked check in /delete-course)
      await pool.query("DELETE FROM course_syllabus WHERE course_code = $1", [
        courseCode,
      ]);

      // 2. Recreate it as an empty shell course for the teacher
      await pool.query(
        `INSERT INTO course_syllabus (course_code, course_name, course_type, credits_total, credit_scheme, owning_program_code) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          courseCode,
          courseName || "",
          courseType || "",
          parseInt(creditsTotal) || 0,
          creditScheme,
          programCode || null,
        ],
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Missing data" });
    }
  } catch (err) {
    console.error("Error overriding scheme:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.post("/program-specialization", verifyPrivilageLogin, async (req, res) => {
  try {
    const {
      program_code,
      subject_name,
      specialization,
      level,
      scheme,
      num_pos,
      num_peos,
      num_psos,
    } = req.body;
    const defaultDetails = JSON.stringify({});
    await pool.query(insertProgramQuery, [
      program_code,
      subject_name,
      specialization || "",
      level,
      scheme,
      parseInt(num_pos) || 11,
      parseInt(num_peos) || 4,
      parseInt(num_psos) >= 0 ? parseInt(num_psos) : 2,
      defaultDetails,
    ]);
    res.redirect("/?message=Program and Specialization saved successfully!");
  } catch (error) {
    console.error("❌ Error saving program:", error);
    res.status(500).send("Error saving program.");
  }
});

app.get("/programs-list", verifyPrivilageLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM programs ORDER BY subject_name ASC, specialization ASC",
    );
    res.render("programsList.ejs", { programs: result.rows });
  } catch (error) {
    console.error("❌ Error fetching programs list:", error);
    res.status(500).send("Error fetching programs list.");
  }
});

app.post("/delete-program", verifyPrivilageLogin, async (req, res) => {
  try {
    const { program_code } = req.body;
    if (program_code) {
      await pool.query("DELETE FROM programs WHERE program_code = $1", [
        program_code,
      ]);
    }
    res.redirect("/programs-list?message=Program deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting program:", error);
    res.status(500).send("Error deleting program.");
  }
});

app.use((req, res) => {
  res.status(404).render("404.ejs");
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

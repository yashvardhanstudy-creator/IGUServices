const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const {
  verifyLogin,
  verifyPrivilageLogin,
  insertCurriculumDraftQuery,
} = require("../constants");
const curriculumSchemes = require("../curriculumSchemes");

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, "approval_" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum file size
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed!"));
    }
    cb(null, true);
  },
});

router.get("/api/program/:programCode", verifyLogin, async (req, res) => {
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

router.get("/program-details-form", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) return res.status(400).send("Missing program code");

    const programResult = await pool.query(
      "SELECT * FROM programs WHERE program_code = $1",
      [program_code],
    );
    if (programResult.rows.length === 0)
      return res.status(404).send("Program not found.");

    const program = programResult.rows[0];
    const programDetails = program.program_details || {};
    res.render("programDetailsForm.ejs", { program, programDetails });
  } catch (error) {
    console.error("❌ Error fetching program details for form:", error);
    res.status(500).send("Error loading page.");
  }
});

router.post(
  "/program-details-form",
  verifyLogin,
  function (req, res, next) {
    upload.single("approval_pdf")(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .send(
              "Error: File is too large! Maximum allowed size is 5MB. Please compress your PDF and try again, or click Back in your browser.",
            );
        }
        return res.status(400).send("Upload Error: " + err.message);
      } else if (err) {
        return res.status(400).send(err.message);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const {
        title,
        program_code,
        printed_program_code,
        academic_year,
        department,
        faculty,
        vision_mission_dept,
        about_programme,
        intake,
        min_eligibility,
        passing_criteria,
        eligibility_exam,
        peo,
        po,
        pso,
        scheme_total_semesters,
        scheme_total_marks,
        scheme_total_credits,
        scheme_framework,
        scheme_name_override,
      } = req.body;

      // Row-Level Security Check
      if (
        req.session.user &&
        req.session.user.name !== "admin" &&
        req.session.user.name !== "dev"
      ) {
        const checkRes = await pool.query(
          "SELECT department FROM programs WHERE program_code = $1",
          [program_code],
        );
        if (
          checkRes.rows.length > 0 &&
          checkRes.rows[0].department !== req.session.user.department
        ) {
          return res
            .status(403)
            .send(
              "Unauthorized: You can only modify programs belonging to your department.",
            );
        }
      }

      let approval_pdf = req.body.existing_approval_pdf || "";
      if (req.file) {
        approval_pdf = req.file.filename;
      }

      const programDetails = {
        title: title || "",
        program_code:
          typeof printed_program_code !== "undefined"
            ? printed_program_code.trim()
            : program_code || "",
        academic_year: academic_year || "",
        department: department || "",
        faculty: faculty || "",
        approval_pdf: approval_pdf,
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
        scheme_total_semesters: scheme_total_semesters || "",
        scheme_total_marks: scheme_total_marks || "",
        scheme_total_credits: scheme_total_credits || "",
        scheme_framework: scheme_framework || "",
        scheme_name_override: scheme_name_override || "",
      };

      await pool.query(
        "UPDATE programs SET program_details = $1 WHERE program_code = $2",
        [JSON.stringify(programDetails), program_code],
      );
      const query = new URLSearchParams({ program_code }).toString();
      res.redirect(`/view-full-syllabus?${query}`);
    } catch (error) {
      console.error("❌ Error saving program details:", error);
      res.status(500).send("Error saving details.");
    }
  },
);

router.get("/program-specialization-form", verifyPrivilageLogin, (req, res) => {
  res.render("programSpecializationForm.ejs", { program: null });
});

router.post(
  "/program-specialization",
  verifyPrivilageLogin,
  async (req, res) => {
    try {
      const {
        faculty,
        department,
        level,
        discipline_type,
        discipline_category,
        num_peos,
        num_pos,
        num_psos,
        scheme_pg,
      } = req.body;
      let scheme = "";
      if (level === "PG") scheme = scheme_pg || "P";
      else if (level === "UG") {
        if (discipline_type === "Inter-disciplinary") scheme = "D";
        else if (discipline_type === "Multi-disciplinary") scheme = "C";
      }

      let finalDept = department || "";
      if (
        req.session.user &&
        req.session.user.name !== "admin" &&
        req.session.user.name !== "dev" &&
        req.session.user.department
      ) {
        finalDept = req.session.user.department; // Force the department to match the logged-in user
      }

      const program_code = `${(finalDept || "PROG").substring(0, 4).toUpperCase().replace(/\s/g, "")}-${Date.now()}`;
      const defaultDetails = JSON.stringify({});
      const insertQuery = `INSERT INTO programs (program_code, subject_name, specialization, level, scheme, num_pos, num_peos, num_psos, program_details, faculty, department, ug_pg, discipline_type, discipline_category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (program_code) DO NOTHING`;

      await pool.query(insertQuery, [
        program_code,
        finalDept,
        "",
        level,
        scheme,
        parseInt(num_pos) || 11,
        parseInt(num_peos) || 4,
        parseInt(num_psos) >= 0 ? parseInt(num_psos) : 2,
        defaultDetails,
        faculty || "",
        finalDept || "",
        level || "",
        discipline_type || null,
        discipline_category || null,
      ]);
      res.redirect("/?message=Program created successfully!");
    } catch (error) {
      console.error("❌ Error saving program:", error);
      res.status(500).send("Error saving program.");
    }
  },
);

router.get("/programs-list", verifyPrivilageLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM programs WHERE program_code NOT LIKE '%_CORE' ORDER BY subject_name ASC, specialization ASC",
    );
    res.render("programsList.ejs", {
      programs: result.rows,
      isAdmin:
        req.session.user.name === "admin" || req.session.user.name === "dev",
      userDept: req.session.user.department,
    });
  } catch (error) {
    console.error("❌ Error fetching programs list:", error);
    res.status(500).send("Error fetching programs list.");
  }
});

router.post("/delete-program", verifyPrivilageLogin, async (req, res) => {
  try {
    const { program_code } = req.body;
    if (program_code) {
      // Row-Level Security Check
      if (
        req.session.user &&
        req.session.user.name !== "admin" &&
        req.session.user.name !== "dev"
      ) {
        const checkRes = await pool.query(
          "SELECT department FROM programs WHERE program_code = $1",
          [program_code],
        );
        if (
          checkRes.rows.length > 0 &&
          checkRes.rows[0].department !== req.session.user.department
        ) {
          return res
            .status(403)
            .send(
              "Unauthorized: You can only delete programs belonging to your department.",
            );
        }
      }

      await pool.query("DELETE FROM programs WHERE program_code = $1", [
        program_code,
      ]);
      // Also delete the associated _CORE program and drafts if they exist
      const coreProgramCode = program_code + "_CORE";
      await pool.query("DELETE FROM programs WHERE program_code = $1", [
        coreProgramCode,
      ]);
      await pool.query(
        "DELETE FROM curriculum_drafts WHERE program_code = $1",
        [program_code],
      );
      await pool.query(
        "DELETE FROM curriculum_drafts WHERE program_code = $1",
        [coreProgramCode],
      );
    }
    res.redirect("/programs-list?message=Program deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting program:", error);
    res.status(500).send("Error deleting program.");
  }
});

router.get("/curriculum", verifyPrivilageLogin, async (req, res) => {
  try {
    const programCode = req.query.program_code;
    if (!programCode) return res.status(400).send("Program code is required.");

    const programResult = await pool.query(
      "SELECT scheme, ug_pg, level, discipline_type FROM programs WHERE program_code = $1",
      [programCode],
    );

    if (programResult.rows.length === 0)
      return res.status(404).send("Program not found.");

    const program = programResult.rows[0];
    let requestedScheme = program.scheme || "A";

    if (requestedScheme.trim().length === 1)
      requestedScheme = "Scheme " + requestedScheme.trim().toUpperCase();

    if (
      program.ug_pg === "UG" &&
      program.discipline_type === "Multi-disciplinary" &&
      !programCode.endsWith("_CORE")
    ) {
      requestedScheme = "Scheme C";
    }

    const isAvailable =
      curriculumSchemes[requestedScheme] &&
      curriculumSchemes[requestedScheme].length > 0;
    const semestersRaw = isAvailable
      ? curriculumSchemes[requestedScheme]
      : curriculumSchemes["Scheme A"];
    const semesters = JSON.parse(JSON.stringify(semestersRaw));
    const schemeName = isAvailable
      ? requestedScheme
      : "Scheme A (Default Fallback)";

    semesters.forEach((sem) => {
      if (sem.courses && sem.courses.length > 0) {
        const expanded = [];
        sem.courses.forEach((c) => {
          // Generic handling for all elective types that need choices
          if (
            (c.type.startsWith("DEC") || c.type.startsWith("DSE")) &&
            !c.type.startsWith("DSEC")
          ) {
            for (let i = 1; i <= 6; i++) {
              expanded.push({
                ...c,
                type: c.type + "." + i,
                isElective: true,
                electiveOpt: i,
              });
            }
          } else {
            expanded.push(c);
          }
        });
        sem.courses = expanded;
      }
    });

    if (programCode.endsWith("_CORE")) {
      semesters.forEach((sem) => {
        if (sem.courses && sem.courses.length > 0) {
          sem.courses = [sem.courses[0]];
          sem.courses[0].type = "CC-" + sem.number;
          sem.totalCredits = sem.courses[0].credits || 0;
        }
      });
    }

    const draftResult = await pool.query(
      "SELECT draft_data FROM curriculum_drafts WHERE program_code = $1",
      [programCode],
    );
    const draftData =
      draftResult.rows.length > 0 ? draftResult.rows[0].draft_data || {} : {};

    const usedCodes = new Set();
    Object.values(draftData).forEach((item) => {
      if (item.slot_type && item.choices) {
        item.choices.forEach((choice) => {
          if (choice.code) usedCodes.add(choice.code);
        });
      } else if (item && item.code) {
        usedCodes.add(item.code);
      }
    });

    let savedCoursesMap = {};
    if (usedCodes.size > 0) {
      const coursesRes = await pool.query(
        "SELECT course_code, course_name, credit_scheme, credits_theory, credits_practical, credits_total, marks_internal_total, marks_endterm_total, marks_max, exam_duration, nep_mapping FROM course_syllabus WHERE course_code = ANY($1::text[])",
        [Array.from(usedCodes)],
      );
      coursesRes.rows.forEach((c) => {
        savedCoursesMap[c.course_code] = c;
      });
    }

    const commonCoursesRes = await pool.query(
      "SELECT * FROM course_syllabus WHERE owning_program_code = 'COMMON_PG'",
    );
    const commonCoursesMap = {};
    commonCoursesRes.rows.forEach((c) => {
      commonCoursesMap[c.course_type] = c;
    });

    res.render("curriculum.ejs", {
      semesters,
      schemeName,
      query: req.query,
      draftData,
      savedCoursesMap,
      programLevel: program.level || program.ug_pg,
      commonCoursesMap,
    });
  } catch (error) {
    console.error("❌ Error loading curriculum page:", error);
    res.status(500).send("Error loading curriculum page.");
  }
});

router.post(
  "/save-curriculum-draft",
  verifyPrivilageLogin,
  async (req, res) => {
    try {
      const { program_code, draft_data } = req.body;
      if (!program_code)
        return res
          .status(400)
          .json({ success: false, error: "Missing program code" });

      // Row-Level Security Check
      if (
        req.session.user &&
        req.session.user.name !== "admin" &&
        req.session.user.name !== "dev"
      ) {
        const checkRes = await pool.query(
          "SELECT department FROM programs WHERE program_code = $1",
          [program_code],
        );
        if (
          checkRes.rows.length > 0 &&
          checkRes.rows[0].department !== req.session.user.department
        ) {
          return res.status(403).json({
            success: false,
            error:
              "Unauthorized: You can only modify curricula for your department.",
          });
        }
      }

      await pool.query(insertCurriculumDraftQuery, [
        program_code,
        JSON.stringify(draft_data),
      ]);

      for (const [key, item] of Object.entries(draft_data)) {
        if (item && item.slot_type && item.choices) {
          // Process Elective Choices
          for (const choice of item.choices) {
            if (choice.code && choice.nom) {
              const existingCourse = await pool.query(
                "SELECT course_code, course_name, credit_scheme, nep_mapping FROM course_syllabus WHERE course_code = $1",
                [choice.code],
              );
              if (existingCourse.rows.length === 0) {
                await pool.query(
                  `INSERT INTO course_syllabus (course_code, course_name, course_type, credits_total, credit_scheme, owning_program_code) VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    choice.code,
                    choice.nom,
                    choice.type, // This is the base type, e.g. DEC-1
                    parseInt(item.credits) || 0,
                    item.credit_scheme || "",
                    program_code,
                  ],
                );
              } else {
                const dbCourse = existingCourse.rows[0];
                if (
                  item.credit_scheme &&
                  (item.credit_scheme !== dbCourse.credit_scheme ||
                    !dbCourse.credit_scheme)
                ) {
                  await pool.query(
                    "UPDATE course_syllabus SET credit_scheme = $1 WHERE course_code = $2",
                    [item.credit_scheme, choice.code],
                  );
                }
                if (choice.nom && choice.nom !== dbCourse.course_name) {
                  await pool.query(
                    "UPDATE course_syllabus SET course_name = $1 WHERE course_code = $2",
                    [choice.nom, choice.code],
                  );
                }

                let nep = dbCourse.nep_mapping;
                if (typeof nep === "string") {
                  try {
                    nep = JSON.parse(nep);
                  } catch (e) {
                    nep = {};
                  }
                }
                nep = nep || {};

                if (item.lt_split && nep.lt_split !== item.lt_split) {
                  nep.lt_split = item.lt_split;
                  await pool.query(
                    "UPDATE course_syllabus SET nep_mapping = $1 WHERE course_code = $2",
                    [JSON.stringify(nep), choice.code],
                  );
                }
              }
            }
          }
        } else if (
          item &&
          item.code &&
          item.nom &&
          item.type &&
          !item.is_custom_row
        ) {
          // Normal course processing
          const existingCourse = await pool.query(
            "SELECT course_code, course_name, credit_scheme, nep_mapping FROM course_syllabus WHERE course_code = $1",
            [item.code],
          );
          if (existingCourse.rows.length === 0) {
            await pool.query(
              `INSERT INTO course_syllabus (course_code, course_name, course_type, credits_total, credit_scheme, owning_program_code) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                item.code,
                item.nom,
                item.type,
                parseInt(item.credits) || 0,
                item.credit_scheme || "",
                program_code,
              ],
            );
          } else {
            const dbCourse = existingCourse.rows[0];
            // If the draft has a scheme, and it's different from the one in the DB,
            // or if the DB has no scheme, update it.
            if (
              item.credit_scheme &&
              (item.credit_scheme !== dbCourse.credit_scheme ||
                !dbCourse.credit_scheme)
            ) {
              await pool.query(
                "UPDATE course_syllabus SET credit_scheme = $1 WHERE course_code = $2",
                [item.credit_scheme, item.code],
              );
            }

            // If the nomenclature (course_name) was changed, update it
            if (item.nom && item.nom !== dbCourse.course_name) {
              await pool.query(
                "UPDATE course_syllabus SET course_name = $1 WHERE course_code = $2",
                [item.nom, item.code],
              );
            }

            let nep = dbCourse.nep_mapping;
            if (typeof nep === "string") {
              try {
                nep = JSON.parse(nep);
              } catch (e) {
                nep = {};
              }
            }
            nep = nep || {};

            if (item.lt_split && nep.lt_split !== item.lt_split) {
              nep.lt_split = item.lt_split;
              await pool.query(
                "UPDATE course_syllabus SET nep_mapping = $1 WHERE course_code = $2",
                [JSON.stringify(nep), item.code],
              );
            }
          }
        }
      }

      const progRes = await pool.query(
        "SELECT * FROM programs WHERE program_code = $1",
        [program_code],
      );
      if (progRes.rows.length > 0) {
        const prog = progRes.rows[0];
        if (
          prog.ug_pg === "UG" &&
          prog.discipline_type === "Multi-disciplinary"
        ) {
          const scheme_a_draft = {};
          const copyDraft = (srcKey, destKey, newType) => {
            if (draft_data[srcKey]) {
              scheme_a_draft[destKey] = { ...draft_data[srcKey] };
              if (newType) scheme_a_draft[destKey].type = newType;
            }
          };
          copyDraft("1_0", "1_0", "CC-1");
          copyDraft("2_0", "2_0", "CC-2");
          copyDraft("3_0", "3_0", "CC-3");
          copyDraft("4_0", "4_0", "CC-4");
          copyDraft("5_0", "5_0", "CC-5");
          copyDraft("6_0", "6_0", "CC-6");

          const coreProgramCode = program_code + "_CORE";
          await pool.query(
            `INSERT INTO programs (program_code, subject_name, specialization, level, scheme, num_pos, num_peos, num_psos, program_details, faculty, department, ug_pg, discipline_type, discipline_category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (program_code) DO NOTHING`,
            [
              coreProgramCode,
              prog.subject_name + " (Scheme A Core)",
              prog.specialization,
              prog.level,
              "A",
              prog.num_pos,
              prog.num_peos,
              prog.num_psos,
              prog.program_details,
              prog.faculty,
              prog.department,
              prog.ug_pg,
              prog.discipline_type,
              prog.discipline_category,
            ],
          );
          await pool.query(insertCurriculumDraftQuery, [
            coreProgramCode,
            JSON.stringify(scheme_a_draft),
          ]);
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Error saving curriculum draft:", error);
      res.status(500).json({ success: false, error: "Error saving draft." });
    }
  },
);

// =========================================
// Feedback & Issues Routes
// =========================================
router.get("/feedback", verifyLogin, async (req, res) => {
  try {
    // Auto-create the table safely if it doesn't exist yet!
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          person VARCHAR(255),
          contact VARCHAR(255),
          issues_text TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Explicitly excluding 'status' from the query per requirements
    const result = await pool.query(
      "SELECT id, title, department, person, contact, issues_text, created_at FROM feedback ORDER BY created_at DESC",
    );
    res.render("feedbackView.ejs", { feedbacks: result.rows });
  } catch (err) {
    console.error("Error loading feedback view:", err);
    res.status(500).send("Error loading feedback board.");
  }
});

router.get("/feedback/new", verifyLogin, (req, res) => {
  res.render("feedbackForm.ejs", {
    userDept: req.session.user ? req.session.user.department : "",
  });
});

router.post("/feedback", verifyLogin, async (req, res) => {
  try {
    const { title, department, person, contact, issues_text } = req.body;
    // Status is hard-coded as 'new' internally
    await pool.query(
      "INSERT INTO feedback (title, department, person, contact, issues_text, status) VALUES ($1, $2, $3, $4, $5, 'new')",
      [title, department, person, contact, issues_text],
    );
    res.redirect("/feedback");
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).send("Error submitting feedback.");
  }
});

module.exports = router;

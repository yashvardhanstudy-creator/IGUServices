const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const xss = require("xss");
const {
  verifyLogin,
  verifyPrivilageLogin,
  insertCourseQuery,
} = require("../constants");

router.get("/courses", verifyPrivilageLogin, async (req, res) => {
  res.render("courseForm.ejs");
});

router.get("/api/course/:courseCode", verifyLogin, async (req, res) => {
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

router.get("/edit-course/:courseCode", verifyLogin, async (req, res) => {
  try {
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
          const semNum = key.split("_")[0];
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

    const storedSemester =
      course.nep_mapping && course.nep_mapping.course_semester
        ? course.nep_mapping.course_semester
        : "";

    if (course.owning_program_code === "COMMON_PG") {
      course.programme_name = "Common to all PG Programmes";
      course.semester = storedSemester || "";
    } else if (isPoolCourse) {
      if (
        course.owning_program_code &&
        course.owning_program_code.startsWith("POOL|")
      ) {
        course.programme_name = course.owning_program_code.substring(5);
      } else {
        course.programme_name = "University Pool";
      }
      course.semester = storedSemester || "";
    } else {
      course.programme_name = Array.from(programs).join(", ") || "Unassigned";
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

router.get("/view-course/:courseCode", verifyLogin, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Course not found in the database.");
    }
    res.render("courseView.ejs", { data: result.rows[0] });
  } catch (error) {
    console.error("❌ Error fetching course data:", error);
    res.status(500).send("Error fetching course data.");
  }
});

router.get("/courses-list", verifyLogin, async (req, res) => {
  try {
    // Seed Common Courses
    const seedCourses = [
      {
        code: "24L6.5-EEC-RPE-400",
        name: "Research Ethics",
        type: "EEC",
        scheme: "2+0",
        credits: 2,
        prog: "COMMON_PG",
        sem: "Fourth",
      },
      {
        code: "24L6.0-CHM-201",
        name: "Constitutional, Human and Moral Values, and IPR",
        type: "CHM",
        scheme: "2+0",
        credits: 2,
        prog: "COMMON_PG",
        sem: "Second",
      },
    ];

    for (const c of seedCourses) {
      await pool.query(
        `INSERT INTO course_syllabus (
          course_code, course_name, course_type, credit_scheme, 
          credits_theory, credits_practical, credits_total,
          marks_internal_theory, marks_internal_practical, marks_internal_total,
          marks_endterm_theory, marks_endterm_practical, marks_endterm_total, marks_max,
          exam_duration, owning_program_code, nep_mapping
         ) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
         ON CONFLICT (course_code) DO NOTHING`,
        [
          c.code,
          c.name,
          c.type,
          c.scheme,
          2,
          0,
          2,
          15,
          0,
          15,
          35,
          0,
          35,
          50,
          "2 Hours",
          c.prog,
          JSON.stringify({ course_semester: c.sem }),
        ],
      );
    }

    const commonCoursesRes = await pool.query(
      "SELECT course_code, course_name AS course_title, course_type AS category FROM course_syllabus WHERE owning_program_code = 'COMMON_PG' ORDER BY course_type ASC",
    );
    const commonCourses = commonCoursesRes.rows.map((c) => ({
      ...c,
      linked_programs: ["Common to all PG Programmes"],
    }));

    const { program_filter } = req.query;
    const programsResult = await pool.query(
      "SELECT program_code, subject_name, specialization FROM programs WHERE program_code NOT LIKE '%_CORE' ORDER BY subject_name ASC, specialization ASC",
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
        "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE (owning_program_code NOT LIKE 'POOL%' AND owning_program_code IS NOT NULL AND owning_program_code != 'From University Pool' AND owning_program_code != 'COMMON_PG')";
      let params = [];
      if (usedCodesArray.length > 0) {
        query += " AND course_code != ALL($1::text[])";
        params.push(usedCodesArray);
      }
      query += " ORDER BY created_at DESC";
      const coursesResult = await pool.query(query, params);
      courses = coursesResult.rows.map((c) => ({ ...c, linked_programs: [] }));
    } else if (program_filter && program_filter.startsWith("pool")) {
      let query =
        "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE (owning_program_code LIKE 'POOL%' OR owning_program_code IS NULL OR owning_program_code = 'From University Pool') AND owning_program_code != 'COMMON_PG'";
      let params = [];
      if (program_filter !== "pool_all") {
        const type = program_filter.replace("pool_", "");
        query += " AND course_type = $1";
        params.push(type);
      }
      query += " ORDER BY course_type ASC, created_at DESC";
      const coursesResult = await pool.query(query, params);
      courses = coursesResult.rows.map((c) => ({
        ...c,
        linked_programs: [
          c.owning_program_code && c.owning_program_code.startsWith("POOL|")
            ? c.owning_program_code.split("|").slice(1).join(" - ")
            : "University Pool",
        ],
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
    } else if (program_filter && program_filter !== "all") {
      const programRes = await pool.query(
        "SELECT * FROM programs WHERE program_code = $1",
        [program_filter],
      );
      const program = programRes.rows.length > 0 ? programRes.rows[0] : null;

      const draftResult = await pool.query(
        "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code WHERE c.program_code = $1",
        [program_filter],
      );
      if (draftResult.rows.length > 0) {
        const row = draftResult.rows[0];
        const draft = row.draft_data || {};
        const programLabel = row.subject_name;
        const codes = new Set();
        const codeToTypeMap = {};

        if (
          program &&
          program.ug_pg === "UG" &&
          program.discipline_type === "Multi-disciplinary"
        ) {
          const schemeTemplate = curriculumSchemes["Scheme C"] || [];
          const semMap = {};
          schemeTemplate.forEach((s) => {
            if (s.courses && !s.isDivider && !s.isYearlyDivider)
              semMap[s.number] = s.courses;
          });

          Object.entries(draft).forEach(([key, value]) => {
            if (value && value.code) {
              codes.add(value.code);
              const [semNum, courseIndex] = key.split("_").map(Number);
              if (courseIndex === 0 && semMap[semNum]) {
                const originalType = semMap[semNum][0].type;
                codeToTypeMap[value.code] = `CC-${semNum}/${originalType}`;
              }
            }
          });
        } else {
          Object.values(draft).forEach((item) => {
            if (item && item.code) codes.add(item.code);
          });
        }

        const codesArray = Array.from(codes);
        if (codesArray.length > 0) {
          const coursesResult = await pool.query(
            "SELECT course_code, course_name AS course_title, course_type AS category, owning_program_code FROM course_syllabus WHERE course_code = ANY($1::text[]) ORDER BY created_at DESC",
            [codesArray],
          );
          courses = coursesResult.rows.map((c) => {
            if (codeToTypeMap[c.course_code]) {
              c.category = codeToTypeMap[c.course_code];
            }
            return { ...c, linked_programs: [programLabel] };
          });
        }
      }
    }
    res.render("coursesList.ejs", {
      courses,
      commonCourses,
      programsList,
      selectedFilter: program_filter || "",
      isAdmin: req.session.user.role === "admin",
    });
  } catch (error) {
    console.error("❌ Error fetching courses list:", error);
    res.status(500).send("Error fetching courses list.");
  }
});

router.post("/delete-course", verifyPrivilageLogin, async (req, res) => {
  try {
    const { courseCode, program_filter } = req.body;
    const redirectUrl = `/courses-list?${program_filter ? `program_filter=${encodeURIComponent(program_filter)}&` : ""}`;

    if (courseCode) {
      const checkCommon = await pool.query(
        "SELECT owning_program_code FROM course_syllabus WHERE course_code = $1",
        [courseCode],
      );
      if (
        checkCommon.rows.length > 0 &&
        checkCommon.rows[0].owning_program_code === "COMMON_PG"
      ) {
        return res.redirect(
          `${redirectUrl}error=${encodeURIComponent("Cannot delete common PG courses.")}`,
        );
      }

      const draftsResult = await pool.query(
        "SELECT p.subject_name, p.specialization, c.draft_data FROM curriculum_drafts c JOIN programs p ON c.program_code = p.program_code",
      );
      const linkedPrograms = [];
      draftsResult.rows.forEach((row) => {
        const draft = row.draft_data || {};
        for (const key in draft) {
          if (draft[key] && draft[key].code === courseCode) {
            linkedPrograms.push(row.subject_name);
            break;
          }
        }
      });

      if (linkedPrograms.length > 0) {
        const errorMsg = `Cannot delete ${courseCode}. It is currently used in: ${linkedPrograms.join(", ")}. Please remove it from these curriculum drafts first.`;
        return res.redirect(
          `${redirectUrl}error=${encodeURIComponent(errorMsg)}`,
        );
      }
      await pool.query("DELETE FROM course_syllabus WHERE course_code = $1", [
        courseCode,
      ]);
    }
    res.redirect(`${redirectUrl}message=Course deleted successfully!`);
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).send("Error deleting course.");
  }
});

router.post("/courses", verifyLogin, async (req, res) => {
  try {
    const courseData = req.body;
    const isEditMode = courseData.isEditMode === "true";
    const normalizeArray = (val) =>
      Array.isArray(val) ? val : val ? [val] : [];

    const coPoMapping = [];
    const mapCO = normalizeArray(courseData.mapCO || courseData["mapCO[]"]);

    mapCO.forEach((co, index) => {
      if (co.trim() !== "") {
        const rowData = { co: co.trim() };
        let numPOs = parseInt(courseData.numPOs) || 12;
        let numPSOs = parseInt(courseData.numPSOs) || 4;
        for (let i = 1; i <= numPOs; i++)
          rowData[`po${i}`] =
            normalizeArray(
              courseData[`mapPO${i}`] || courseData[`mapPO${i}[]`],
            )[index] || "";
        for (let i = 1; i <= numPSOs; i++)
          rowData[`pso${i}`] =
            normalizeArray(
              courseData[`mapPSO${i}`] || courseData[`mapPSO${i}[]`],
            )[index] || "";
        coPoMapping.push(rowData);
      }
    });

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

    const resourcesArray = normalizeArray(
      courseData.resources || courseData["resources[]"],
    );
    const resourcesString = resourcesArray
      .filter((r) => r && r.trim() !== "")
      .join("\n");

    const evaluationCriteria = {
      eval_cp_th: courseData.eval_cp_th || "",
      eval_cp_pr: courseData.eval_cp_pr || "",
      eval_written_exam_th: courseData.eval_written_exam_th || "",
      eval_written_exam_pr: courseData.eval_written_exam_pr || "",
      eval_seminar_th: courseData.eval_seminar_th || "",
      eval_seminar_pr: courseData.eval_seminar_pr || "",
      eval_lab_record_th: courseData.eval_lab_record_th || "",
      eval_lab_record_pr: courseData.eval_lab_record_pr || "",
      eval_seminar_demo_th: courseData.eval_seminar_demo_th || "",
      eval_seminar_demo_pr: courseData.eval_seminar_demo_pr || "",
      eval_viva_th: courseData.eval_viva_th || "",
      eval_viva_pr: courseData.eval_viva_pr || "",
      eval_midterm_th: courseData.eval_midterm_th || "",
      eval_midterm_pr: courseData.eval_midterm_pr || "",
      eval_execution_th: courseData.eval_execution_th || "",
      eval_execution_pr: courseData.eval_execution_pr || "",
    };

    const closList = (courseData.courseOutcomes || "")
      .split(/\r?\n|\r/)
      .map((c) => c.trim())
      .filter((c) => c !== "");
    const nepMapping = {
      employability: courseData.nep_employability || "",
      entrepreneurship: courseData.nep_entrepreneurship || "",
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
      const faculty = courseData.pool_faculty
        ? courseData.pool_faculty.trim()
        : "";
      const dept = courseData.pool_department
        ? courseData.pool_department.trim()
        : "";
      owningProgramCodeToSave = `POOL|${faculty}|${dept}`;
    } else {
      owningProgramCodeToSave = courseData.owning_program_code || null;
    }

    const values = [
      courseData.courseCode || "",
      courseData.creditScheme || "",
      courseData.natureOfCourse || "",
      courseData.courseName || "",
      courseData.courseType || "",
      courseData.prerequisite || "",
      parseInt(courseData.credits_theory) || 0,
      parseInt(courseData.credits_practical) || 0,
      parseInt(courseData.credits_total) || 0,
      parseInt(courseData.marks_internal_theory) || 0,
      parseInt(courseData.marks_internal_practical) || 0,
      parseInt(courseData.marks_internal_total) || 0,
      parseInt(courseData.marks_endterm_theory) || 0,
      parseInt(courseData.marks_endterm_practical) || 0,
      parseInt(courseData.marks_endterm_total) || 0,
      parseInt(courseData.marks_max) || 0,
      courseData.exam_duration || "",
      courseData.paperSetterInstructions || "",
      JSON.stringify(closList),
      JSON.stringify(syllabusUnits),
      JSON.stringify(evaluationCriteria),
      resourcesString,
      JSON.stringify(coPoMapping),
      JSON.stringify(nepMapping),
      owningProgramCodeToSave,
    ];

    await pool.query(insertCourseQuery, values);
    res.redirect(
      isEditMode
        ? "/courses-list?message=Course+Updated+Successfully"
        : "/?message=Course+Created+Successfully",
    );
  } catch (error) {
    console.error("❌ Error saving course:", error);
    res.redirect("/courses-list?error=Error+saving+course");
  }
});

router.post("/reset-course-scheme", verifyPrivilageLogin, async (req, res) => {
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
      await pool.query("DELETE FROM course_syllabus WHERE course_code = $1", [
        courseCode,
      ]);
      await pool.query(
        `INSERT INTO course_syllabus (course_code, course_name, course_type, credits_total, credit_scheme, owning_program_code) VALUES ($1, $2, $3, $4, $5, $6)`,
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

module.exports = router;

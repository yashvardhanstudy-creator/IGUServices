const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const { verifyLogin } = require("../constants");
const curriculumSchemes = require("../curriculumSchemes");

const sharedSchemeMap = {
  "4+0": {
    cred: 4,
    th: 4,
    pr: 0,
    int_th: 30,
    int_pr: 0,
    int: 30,
    end_th: 70,
    end_pr: 0,
    end: 70,
    max: 100,
    dur: "3 Hours",
  },
  "0+4": {
    cred: 4,
    th: 0,
    pr: 4,
    int_th: 0,
    int_pr: 30,
    int: 30,
    end_th: 0,
    end_pr: 70,
    end: 70,
    max: 100,
    dur: "4 Hours",
  },
  "3+1": {
    cred: 4,
    th: 3,
    pr: 1,
    int_th: 20,
    int_pr: 10,
    int: 30,
    end_th: 50,
    end_pr: 20,
    end: 70,
    max: 100,
    dur: "3 Hours (Theory), 3 Hours (Practical)",
  },
  "2+2": {
    cred: 4,
    th: 2,
    pr: 2,
    int_th: 15,
    int_pr: 15,
    int: 30,
    end_th: 35,
    end_pr: 35,
    end: 70,
    max: 100,
    dur: "2 Hours (Theory), 3 Hours (Practical)",
  },
  "3+0": {
    cred: 3,
    th: 3,
    pr: 0,
    int_th: 25,
    int_pr: 0,
    int: 25,
    end_th: 50,
    end_pr: 0,
    end: 50,
    max: 75,
    dur: "3 Hours",
  },
  "2+0": {
    cred: 2,
    th: 2,
    pr: 0,
    int_th: 15,
    int_pr: 0,
    int: 15,
    end_th: 35,
    end_pr: 0,
    end: 35,
    max: 50,
    dur: "2 Hours",
  },
  "1+1": {
    cred: 2,
    th: 1,
    pr: 1,
    int_th: 10,
    int_pr: 5,
    int: 15,
    end_th: 20,
    end_pr: 15,
    end: 35,
    max: 50,
    dur: "2 Hours (Theory), 3 Hours (Practical)",
  },
  "2+1": {
    cred: 3,
    th: 2,
    pr: 1,
    int_th: 15,
    int_pr: 5,
    int: 20,
    end_th: 35,
    end_pr: 20,
    end: 55,
    max: 75,
    dur: "2 Hours (Theory), 3 Hours (Practical)",
  },
};

router.get("/generate-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT program_code, subject_name, specialization, ug_pg, discipline_type FROM programs WHERE program_code NOT LIKE '%_CORE' ORDER BY subject_name, specialization",
    );
    const options = result.rows;
    options.unshift({
      program_code: "UNIVERSITY_POOL",
      subject_name: "All University Pool Courses",
      specialization: "",
      ug_pg: null,
    });
    res.render("fullSyllabusForm.ejs", { options: options });
  } catch (error) {
    console.error("❌ Error fetching full syllabus options:", error);
    res.status(500).send("Error loading page.");
  }
});

// Guaranteeing the Approval Template route is properly mounted
router.get("/download-approval-template", verifyLogin, async (req, res) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><style>
        body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
        h2 { text-align: center; margin-bottom: 40px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
        th, td { border: 1px solid black; padding: 15px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style></head>
      <body>
          <h2>Details of Approvals</h2>
          <table>
              <thead><tr><th>Council/Board</th><th>Date</th><th>Remark</th></tr></thead>
              <tbody>
                  <tr><td>Staff Council</td><td></td><td></td></tr>
                  <tr><td>Board of Studies</td><td></td><td></td></tr>
                  <tr><td>Faculty</td><td></td><td></td></tr>
                  <tr><td>Academic Council</td><td></td><td></td></tr>
              </tbody>
          </table>
          <div style="text-align: right; margin-top: 150px; font-weight: bold;">
              <p>Chairperson</p>
              <p>(Signature with Stamp)</p>
          </div>
      </body>
      </html>
    `;
    const browser = await puppeteer.launch({
      headless: true,
      channel: "chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
    });
    await browser.close();
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Empty_Approval_Template.pdf"`,
    });
    res.send(pdf);
  } catch (error) {
    console.error("❌ Error generating template:", error);
    res.status(500).send("Error generating template.");
  }
});

async function getFullSyllabusData(program_code) {
  const isCoreSyllabus = program_code.endsWith("_CORE");
  const base_program_code = isCoreSyllabus
    ? program_code.replace("_CORE", "")
    : program_code;

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
      academic_program: "University Pool",
      specialization: "None",
    };
  }

  // 1. Fetch program data
  const programResult = await pool.query(
    "SELECT * FROM programs WHERE program_code = $1",
    [base_program_code],
  );
  if (programResult.rows.length === 0) throw new Error("Program not found");
  let program = programResult.rows[0];
  let programDetails = program.program_details;

  // Safely parse JSON if the database returns it as a string
  if (typeof programDetails === "string") {
    try {
      programDetails = JSON.parse(programDetails);
    } catch (e) {
      programDetails = {};
    }
  }
  programDetails = programDetails || {};

  // Fallback to base program creation data if details form hasn't been saved yet
  if (!programDetails.department && program.department) {
    programDetails.department = program.department;
  }
  if (!programDetails.faculty && program.faculty) {
    programDetails.faculty = program.faculty;
  }

  if (isCoreSyllabus) {
    program = { ...program }; // Create a shallow copy to avoid modifying the original object in cache
    program.program_code = program_code;
    program.subject_name = `${program.subject_name} (Core Courses)`;
    program.specialization = "Scheme A";
    programDetails.title = "Core Courses (Scheme A)";
    programDetails.program_code = program_code;
  }

  // 2. Fetch curriculum draft
  const draftResult = await pool.query(
    "SELECT draft_data FROM curriculum_drafts WHERE program_code = $1",
    [program_code],
  );
  const draftData =
    draftResult.rows.length > 0 ? draftResult.rows[0].draft_data || {} : {};

  // 3. Get corresponding scheme template
  let requestedScheme = program.scheme || "A";
  if (requestedScheme.trim().length === 1)
    requestedScheme = "Scheme " + requestedScheme.trim().toUpperCase();

  if (
    program.ug_pg === "UG" &&
    program.discipline_type === "Multi-disciplinary" &&
    !program_code.endsWith("_CORE")
  ) {
    requestedScheme = "Scheme C";
  }

  const isAvailable =
    curriculumSchemes[requestedScheme] &&
    curriculumSchemes[requestedScheme].length > 0;
  let semesters = JSON.parse(
    JSON.stringify(
      isAvailable
        ? curriculumSchemes[requestedScheme]
        : curriculumSchemes["Scheme A"],
    ),
  );

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

  if (program_code.endsWith("_CORE")) {
    // Strictly limit Core PDFs to 6 Semesters and remove dividers
    semesters = semesters.filter((sem) => {
      if (sem.isDivider || sem.isYearlyDivider) return false;
      const num = parseInt(sem.number);
      return !isNaN(num) && num <= 6;
    });

    semesters.forEach((sem) => {
      if (sem.courses && sem.courses.length > 0) {
        sem.courses = [sem.courses[0]];
        sem.courses[0].type = "CC-" + sem.number;
        sem.totalCredits = sem.courses[0].credits || 0;
      }
    });
  }

  // 4. Collect all required course codes
  const courseCodesToFetch = new Set();
  Object.values(draftData).forEach((cell) => {
    if (cell && cell.code && !cell.is_custom_row)
      courseCodesToFetch.add(cell.code);
  });

  // 5. Fetch full data for those courses
  let courseDataMap = {};
  if (courseCodesToFetch.size > 0) {
    const coursesResult = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = ANY($1::text[])",
      [Array.from(courseCodesToFetch)],
    );
    coursesResult.rows.forEach((course) => {
      courseDataMap[course.course_code] = course;
    });
  }

  // 6. Aggregate data into semesters and compute totals
  let totalProgramCredits = 0;
  let totalProgramMarks = 0;
  let totalSemesters = 0;
  const allCourses = [];
  const addedToAllCourses = new Set();
  const electiveCourseGroups = {};
  const processedElectiveBases = new Map(); // Tracks which semester first defined an elective group

  semesters.forEach((sem) => {
    if (sem.isYearlyDivider) {
      let defaultExit = "";
      if (sem.year === 1)
        defaultExit =
          "UG Certificate in _______  (MAJOR SUBJECT)  of  _____  Credits will be Awarded in Case of Exit (after 2nd Semester) after completing Internship (4-6 weeks) of 4 Credits";
      else if (sem.year === 2)
        defaultExit =
          "UG Diploma in _______ (MAJOR SUBJECT)  of  _____  Credits will be Awarded in Case of Exit (after 4th Semester) after completing Internship (4-6 weeks) of 4 Credits";
      else if (sem.year === 3)
        defaultExit =
          "Bachelor of _______  with Major in _______  of  _____  Credits will be Awarded in Case of Exit (after 6th Semester)";
      else if (sem.year === 4)
        defaultExit =
          "Bachelor of _______ (Hons.) / (Hons. with Research) in Major  _______  of  _____  Credits will be Awarded (after 8th Semester)";
      const savedVal = draftData["yearly_divider_" + sem.year];
      sem.text = savedVal !== undefined ? savedVal : defaultExit;
      return;
    }
    if (sem.isDivider) return;
    totalSemesters++;

    sem.detailed_courses = [];
    sem.courses.forEach((courseTemplate, index) => {
      const cellKey = `${sem.number}_${index}`;
      const draftCell = draftData[cellKey] || {};
      const isSeminar = /^SEMINAR$/i.test(courseTemplate.type);
      const isDissertation =
        /^(PROJECT(?:\s*WORK)?\/DISSERTATION|DISSERTATION)$/i.test(
          courseTemplate.type,
        );
      const isInternship = /^(Internship|Intership)$/i.test(
        courseTemplate.type,
      );

      let courseObj;

      if (
        draftCell.is_custom_row ||
        isSeminar ||
        isDissertation ||
        isInternship
      ) {
        courseObj = {
          is_custom_slot: true,
          is_custom_row: true,
          course_type:
            isSeminar || isDissertation || isInternship
              ? courseTemplate.type
              : draftCell.type || courseTemplate.type,
          credits_total: isSeminar
            ? "2"
            : isDissertation
              ? "12"
              : isInternship
                ? ""
                : draftCell.credits || courseTemplate.credits,
          course_name: isSeminar
            ? "Seminar"
            : isDissertation
              ? "Dissertation"
              : isInternship
                ? "*Internship"
                : draftCell.nom || "Internship / Project Work",
          course_code: draftCell.code || "-",
          is_missing: false,
          tp: isSeminar
            ? "2T / 0P"
            : isDissertation
              ? "0T / 12P"
              : isInternship
                ? ""
                : draftCell.tp || "",
          hrs: isSeminar
            ? "2+0+0=2"
            : isDissertation
              ? "0+0+24=24"
              : isInternship
                ? ""
                : draftCell.hrs || "",
          marks_internal_total: isSeminar
            ? "0"
            : isDissertation
              ? "0"
              : isInternship
                ? ""
                : draftCell.int || "0",
          marks_endterm_total: isSeminar
            ? "50"
            : isDissertation
              ? "300"
              : isInternship
                ? ""
                : draftCell.end || "0",
          marks_max: isSeminar
            ? "50"
            : isDissertation
              ? "300"
              : isInternship
                ? "100"
                : draftCell.max || "0",
          exam_duration: isSeminar
            ? "2 Hours"
            : isDissertation
              ? "0 Hours"
              : isInternship
                ? ""
                : draftCell.dur || "-",
        };
      } else if (draftCell.code) {
        const fullCourse = courseDataMap[draftCell.code];
        if (fullCourse) {
          courseObj = {
            ...fullCourse,
            course_type: draftCell.type || courseTemplate.type,
            credit_scheme: draftCell.credit_scheme || fullCourse.credit_scheme,
            lt_split: draftCell.lt_split || "0",
            is_db_course: true,
            is_missing: false,
          };

          if (
            (!courseObj.marks_max || courseObj.marks_max == 0) &&
            courseObj.credit_scheme &&
            sharedSchemeMap[courseObj.credit_scheme]
          ) {
            courseObj.marks_internal_theory =
              sharedSchemeMap[courseObj.credit_scheme].int_th;
            courseObj.marks_internal_practical =
              sharedSchemeMap[courseObj.credit_scheme].int_pr;
            courseObj.marks_internal_total =
              sharedSchemeMap[courseObj.credit_scheme].int;
            courseObj.marks_endterm_theory =
              sharedSchemeMap[courseObj.credit_scheme].end_th;
            courseObj.marks_endterm_practical =
              sharedSchemeMap[courseObj.credit_scheme].end_pr;
            courseObj.marks_endterm_total =
              sharedSchemeMap[courseObj.credit_scheme].end;
            courseObj.marks_max = sharedSchemeMap[courseObj.credit_scheme].max;
            courseObj.exam_duration =
              sharedSchemeMap[courseObj.credit_scheme].dur;
          }

          if (!addedToAllCourses.has(courseObj.course_code)) {
            allCourses.push(courseObj);
            addedToAllCourses.add(courseObj.course_code);
          }
        } else {
          courseObj = {
            course_code: draftCell.code,
            course_name: draftCell.nom || "Unassigned Slot",
            course_type: draftCell.type || courseTemplate.type,
            credits_total: draftCell.credits || courseTemplate.credits,
            credit_scheme: draftCell.credit_scheme || "",
            is_db_course: false,
            is_missing: true,
          };
        }
      } else {
        courseObj = {
          course_code: "-",
          course_name: "Unassigned Slot",
          course_type: courseTemplate.type,
          credits_total: courseTemplate.credits,
          is_db_course: false,
          is_missing: true,
        };
      }

      // Combine Course Type for Scheme C Multi-disciplinary Core Courses (e.g., CC-1/MCC-1)
      if (
        program.ug_pg === "UG" &&
        program.discipline_type === "Multi-disciplinary" &&
        !isCoreSyllabus &&
        index === 0
      ) {
        const originalType = courseObj.course_type;
        courseObj.course_type = `CC-${sem.number}/${originalType}`;
        courseObj.curriculum_display_type = originalType;
        // Also update the master list if it exists
        const masterCourse = allCourses.find(
          (c) => c.course_code === courseObj.course_code,
        );
        if (masterCourse) {
          masterCourse.course_type = courseObj.course_type;
        }
      }

      courseObj.isElective = courseTemplate.isElective;
      courseObj.electiveOpt = courseTemplate.electiveOpt;

      if (!courseObj.isElective || courseObj.electiveOpt === 1) {
        totalProgramCredits += parseInt(courseObj.credits_total) || 0;
        totalProgramMarks += parseInt(courseObj.marks_max) || 0;
      }

      if (courseTemplate.isElective) {
        const baseElectiveType = courseTemplate.type.split(".")[0]; // e.g., 'DEC-1', 'DSE-A'
        const exactSemester = String(sem.number); // Track the exact string to isolate variant slaves

        if (!electiveCourseGroups[baseElectiveType]) {
          electiveCourseGroups[baseElectiveType] = [];
        }

        if (!processedElectiveBases.has(baseElectiveType)) {
          // First time we're seeing this elective group, it's the master.
          processedElectiveBases.set(baseElectiveType, exactSemester);
        }

        const masterSemester = processedElectiveBases.get(baseElectiveType);

        if (masterSemester !== exactSemester) {
          // This is a linked elective from a variant semester (e.g. 4A), so we don't add its choices.
          courseObj.isLinkedElective = true;
          courseObj.masterSemester = masterSemester;
        } else {
          // This is another choice within the same base semester group.
          if (
            courseObj.is_db_course ||
            (courseObj.is_custom_row && courseObj.course_code !== "-")
          ) {
            electiveCourseGroups[baseElectiveType].push(courseObj);
          }
        }

        if (courseTemplate.electiveOpt === 1) {
          const summaryDraft =
            draftData[`${sem.number}_${index}_summary`] || {};
          let repMarks = {};
          if (summaryDraft.credit_scheme) {
            const sMap = {
              "4+0": {
                cred: 4,
                th: 4,
                pr: 0,
                int: 30,
                int_th: 30,
                int_pr: 30,
                end: 70,
                end_th: 70,
                end_pr: 70,
                max: 100,
                dur: "3 Hours",
              },
              "0+4": {
                cred: 4,
                th: 0,
                pr: 4,
                int: 30,
                int_th: 30,
                int_pr: 30,
                end: 70,
                end_th: 70,
                end_pr: 70,
                max: 100,
                dur: "4 Hours",
              },
              "3+1": {
                cred: 4,
                th: 3,
                pr: 1,
                int: 30,
                int_th: 30,
                int_pr: 30,
                end: 70,
                end_th: 70,
                end_pr: 70,
                max: 100,
                dur: "3 Hours (Theory), 3 Hours (Practical)",
              },
              "2+2": {
                cred: 4,
                th: 2,
                pr: 2,
                int: 30,
                int_th: 30,
                int_pr: 30,
                end: 70,
                end_th: 70,
                end_pr: 70,
                max: 100,
                dur: "2 Hours (Theory), 3 Hours (Practical)",
              },
              "3+0": {
                cred: 3,
                th: 3,
                pr: 0,
                int: 25,
                int_th: 25,
                int_pr: 25,
                end: 50,
                end_th: 50,
                end_pr: 50,
                max: 75,
                dur: "3 Hours",
              },
              "2+0": {
                cred: 2,
                th: 2,
                pr: 0,
                int: 15,
                int_th: 15,
                int_pr: 15,
                end: 35,
                end_th: 35,
                end_pr: 35,
                max: 50,
                dur: "2 Hours",
              },
              "1+1": {
                cred: 2,
                th: 1,
                pr: 1,
                int: 15,
                int_th: 15,
                int_pr: 15,
                end: 35,
                end_th: 35,
                end_pr: 35,
                max: 50,
                dur: "2 Hours (Theory), 3 Hours (Practical)",
              },
              "2+1": {
                cred: 3,
                th: 2,
                pr: 1,
                int: 20,
                int_th: 20,
                int_pr: 20,
                end: 55,
                end_th: 55,
                end_pr: 55,
                max: 75,
                dur: "2 Hours (Theory), 3 Hours (Practical)",
              },
            };
            if (sMap[summaryDraft.credit_scheme]) {
              repMarks = {
                marks_internal_total: sMap[summaryDraft.credit_scheme].int,
                marks_endterm_total: sMap[summaryDraft.credit_scheme].end,
                marks_max: sMap[summaryDraft.credit_scheme].max,
                exam_duration: sMap[summaryDraft.credit_scheme].dur,
                credits_theory: sMap[summaryDraft.credit_scheme].th,
                credits_practical: sMap[summaryDraft.credit_scheme].pr,
                credit_scheme: summaryDraft.credit_scheme,
                lt_split: summaryDraft.lt_split || "0",
              };
            }
          }
          const representativeRow = {
            ...courseObj,
            ...repMarks,
            course_name: courseObj.isLinkedElective
              ? `Same as Semester ${courseObj.masterSemester}`
              : "Any One from the Choices Given Below",
            isElectiveGroup: true,
            baseElectiveType: baseElectiveType,
          };
          sem.detailed_courses.push(representativeRow);
        }
      } else {
        sem.detailed_courses.push(courseObj);
      }
    });
  });

  semesters.forEach((sem) => {
    if (sem.detailed_courses) {
      sem.detailed_courses.forEach((course) => {
        if (course.isElectiveGroup && !course.isLinkedElective) {
          const choices = electiveCourseGroups[course.baseElectiveType] || [];
          course.course_code =
            choices.length > 0
              ? choices.map((c) => c.course_code).join(" / ")
              : "-";
        }
      });
    }
  });

  return {
    program,
    programDetails,
    semesters,
    allCourses,
    totalProgramCredits,
    totalProgramMarks,
    totalSemesters,
    academic_program: program.subject_name,
    specialization: program.specialization,
    is_core_pdf: isCoreSyllabus,
    electiveCourseGroups,
  };
}

router.get("/view-full-syllabus", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) return res.status(400).send("Program code is required.");
    const data = await getFullSyllabusData(program_code);
    res.render("fullSyllabusView.ejs", data);
  } catch (error) {
    console.error("❌ Error loading full syllabus:", error);
    res.status(500).send("Error loading syllabus.");
  }
});

router.get("/download-full-syllabus-pdf", verifyLogin, async (req, res) => {
  try {
    const { program_code } = req.query;
    if (!program_code) return res.status(400).send("Missing program code");
    const data = await getFullSyllabusData(program_code);

    const viewFile = data.is_core_pdf
      ? "coreSyllabusView.ejs"
      : "fullSyllabusView.ejs";
    req.app.render(viewFile, data, async (err, html) => {
      if (err) return res.status(500).send("Error rendering HTML for PDF");
      try {
        const browser = await puppeteer.launch({
          headless: true,
          channel: "chrome",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
                img.onerror = resolve;
              });
            }),
          );
        });

        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: `<div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; padding-top: 5px;">Department of ${data.programDetails.department || data.program.department || "N/A"} w.e.f. from 2026-27</div>`,
          footerTemplate: `
            <div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; position: relative;">
              <span style="position: absolute; left: 20px;">Syllabus - ${data.academic_program}</span>
              <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
              <span style="position: absolute; right: 20px;">IGU Meerpur</span>
            </div>
          `,
          preferCSSPageSize: true,
        });
        await browser.close();

        let finalPdfBuffer = pdf;
        // PDF-Lib Magic: Merge the uploaded file securely into the new document!
        if (
          !data.is_core_pdf &&
          data.programDetails &&
          data.programDetails.approval_pdf
        ) {
          try {
            const uploadPath = path.join(
              __dirname,
              "../public/uploads",
              data.programDetails.approval_pdf,
            );
            if (fs.existsSync(uploadPath)) {
              const generatedPdfDoc = await PDFDocument.load(pdf);
              const uploadedPdfDoc = await PDFDocument.load(
                fs.readFileSync(uploadPath),
              );

              if (uploadedPdfDoc.getPageCount() > 0) {
                const [approvalPage] = await generatedPdfDoc.copyPages(
                  uploadedPdfDoc,
                  [0],
                );
                generatedPdfDoc.insertPage(1, approvalPage); // Insert right after the cover page
                const mergedPdfBytes = await generatedPdfDoc.save();
                finalPdfBuffer = Buffer.from(mergedPdfBytes);
              }
            }
          } catch (mergeErr) {
            console.error("❌ PDF Merge Error:", mergeErr);
          }
        }

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Syllabus_${data.academic_program.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        });
        res.send(finalPdfBuffer);
      } catch (pdfErr) {
        console.error("❌ PDF Generation Error:", pdfErr);
        res.status(500).send("Error generating PDF document.");
      }
    });
  } catch (error) {
    console.error("❌ Error initiating PDF download:", error);
    res.status(500).send("Error generating PDF.");
  }
});

router.get("/download-pool-pdf", verifyLogin, async (req, res) => {
  try {
    const { program_code, pool_type } = req.query;
    if (!program_code || !pool_type)
      return res.status(400).send("Missing program code or pool type");

    const progRes = await pool.query(
      "SELECT * FROM programs WHERE program_code = $1",
      [program_code],
    );
    if (progRes.rows.length === 0)
      return res.status(404).send("Program not found.");

    const program = progRes.rows[0];
    let programDetails = program.program_details;
    if (typeof programDetails === "string") {
      try {
        programDetails = JSON.parse(programDetails);
      } catch (e) {
        programDetails = {};
      }
    }
    programDetails = programDetails || {};

    if (!programDetails.department && program.department) {
      programDetails.department = program.department;
    }
    if (!programDetails.faculty && program.faculty) {
      programDetails.faculty = program.faculty;
    }

    const poolCode = `POOL|${program.faculty}|${program.department}`;
    const targetTypes =
      pool_type === "minor"
        ? ["Minor", "Minor (Vocational)"]
        : ["AEC", "SEC", "VAC", "MDC"];

    const coursesRes = await pool.query(
      "SELECT * FROM course_syllabus WHERE owning_program_code = $1 AND course_type = ANY($2::text[])",
      [poolCode, targetTypes],
    );
    const courses = coursesRes.rows;

    if (courses.length === 0)
      return res
        .status(404)
        .send(
          `No courses found for this department in the ${pool_type === "minor" ? "Minor" : "AEC/SEC/VAC/MDC"} pool.`,
        );

    const groupedCourses = {};
    if (pool_type === "minor") {
      groupedCourses["Minor"] = [];
      groupedCourses["Minor (Vocational)"] = [];
    } else {
      groupedCourses["AEC"] = [];
      groupedCourses["SEC"] = [];
      groupedCourses["VAC"] = [];
      groupedCourses["MDC"] = [];
    }

    courses.forEach((c) => {
      const group = c.course_type;
      if (groupedCourses[group] !== undefined) groupedCourses[group].push(c);
    });

    const poolTitle =
      pool_type === "minor"
        ? "Pool of Minor and Minor (Vocational)"
        : "Pool of AEC, SEC, VAC, MDC";

    req.app.render(
      "poolSyllabusView.ejs",
      {
        baseUrl: `${req.protocol}://${req.get("host")}`,
        program,
        programDetails,
        poolTitle,
        groupedCourses,
        allCourses: courses,
      },
      async (err, html) => {
        if (err) {
          console.error("❌ Template Render Error (Pool Syllabus):", err);
          return res.status(500).send("Error rendering HTML for PDF");
        }
        try {
          const browser = await puppeteer.launch({
            headless: true,
            channel: "chrome",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
                  img.onerror = resolve;
                });
              }),
            );
          });

          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `<div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; padding-top: 5px;">Department of ${programDetails.department || program.department || "N/A"} w.e.f. from 2026-27</div>`,
            footerTemplate: `
              <div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; position: relative;">
                <span style="position: absolute; left: 20px;">${poolTitle}</span>
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
            "Content-Disposition": `attachment; filename="${poolTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
          });
          res.send(pdf);
        } catch (pdfErr) {
          console.error("❌ PDF Generation Error:", pdfErr);
          res.status(500).send("Error generating PDF document.");
        }
      },
    );
  } catch (error) {
    console.error("❌ Error generating pool syllabus PDF:", error);
    res.status(500).send("Error generating pool syllabus PDF");
  }
});

router.get("/download-master-pool-pdf", verifyLogin, async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).send("Missing category");

    const coursesRes = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_type = $1 AND (owning_program_code LIKE 'POOL%' OR owning_program_code IS NULL OR owning_program_code = 'From University Pool') ORDER BY owning_program_code ASC, course_code ASC",
      [category],
    );
    const courses = coursesRes.rows;

    if (courses.length === 0)
      return res
        .status(404)
        .send(`No courses found for Master ${category} Catalog.`);

    const groupedCourses = {};
    courses.forEach((c) => {
      let faculty = "University Pool";
      let dept = "General Electives";
      if (c.owning_program_code && c.owning_program_code.startsWith("POOL|")) {
        const parts = c.owning_program_code.split("|");
        if (parts.length >= 3) {
          faculty = parts[1] || "Unspecified Faculty";
          dept = parts[2] || "Unspecified Department";
        } else if (parts.length === 2) {
          dept = parts[1] || "Unspecified Department";
        }
      }
      if (!groupedCourses[faculty]) groupedCourses[faculty] = {};
      if (!groupedCourses[faculty][dept]) groupedCourses[faculty][dept] = [];
      groupedCourses[faculty][dept].push(c);
    });

    const poolTitle = `Master Catalog: ${category} Electives`;

    const program = {
      program_code: "UNIVERSITY_POOL",
      level: "UG/PG",
      subject_name: "University Pool",
      specialization: "Master Catalog",
    };

    const programDetails = {
      title: poolTitle,
      department: "Multiple Departments",
      faculty: "University Pool",
      academic_year: "Current",
      peos: [],
      pos: [],
      psos: [],
    };

    req.app.render(
      "poolSyllabusView.ejs",
      {
        baseUrl: `${req.protocol}://${req.get("host")}`,
        program,
        programDetails,
        poolTitle,
        category,
        groupedCourses,
        allCourses: courses,
      },
      async (err, html) => {
        if (err) {
          console.error("❌ Template Render Error (Master Catalog):", err);
          return res.status(500).send("Error rendering HTML for PDF");
        }
        try {
          const browser = await puppeteer.launch({
            headless: true,
            channel: "chrome",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const page = await browser.newPage();
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          );
          await page.setContent(html, { waitUntil: "networkidle2" });

          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `<div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; padding-top: 5px;">Multiple Departments w.e.f. from 2026-27</div>`,
            footerTemplate: `
              <div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; position: relative;">
                <span style="position: absolute; left: 20px;">${poolTitle}</span>
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
            "Content-Disposition": `attachment; filename="Master_${category.replace(/[^a-zA-Z0-9]/g, "_")}_Catalog.pdf"`,
          });
          res.send(pdf);
        } catch (pdfErr) {
          console.error("❌ PDF Generation Error:", pdfErr);
          res.status(500).send("Error generating Master Pool PDF.");
        }
      },
    );
  } catch (error) {
    console.error("❌ Error generating master pool PDF:", error);
    res.status(500).send("Error generating master pool PDF");
  }
});

router.get("/download-pdf/:courseCode", verifyLogin, async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const result = await pool.query(
      "SELECT * FROM course_syllabus WHERE course_code = $1",
      [courseCode],
    );
    if (result.rows.length === 0)
      return res.status(404).send("Course not found");
    const course = result.rows[0];

    let deptName = "N/A";
    if (course.owning_program_code) {
      if (course.owning_program_code.startsWith("POOL|")) {
        const parts = course.owning_program_code.split("|");
        deptName =
          parts.length === 3 ? parts[2] : parts[1] || "University Pool";
      } else if (
        course.owning_program_code !== "From University Pool" &&
        course.owning_program_code !== "COMMON_PG"
      ) {
        const pRes = await pool.query(
          "SELECT department FROM programs WHERE program_code = $1",
          [course.owning_program_code],
        );
        if (pRes.rows.length > 0) deptName = pRes.rows[0].department || "N/A";
      } else {
        deptName = "University Pool";
      }
    }

    req.app.render("courseView.ejs", { data: course }, async (err, html) => {
      if (err) return res.status(500).send("Render Error");
      try {
        const browser = await puppeteer.launch({
          headless: true,
          channel: "chrome",
          args: ["--no-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({
          format: "A4",
          displayHeaderFooter: true,
          headerTemplate: `<div style="font-size: 11px; font-family: 'Arial', serif; width: 100%; text-align: center; color: #000; padding-top: 5px;">Department of ${deptName} w.e.f. from 2026-27</div>`,
          footerTemplate: "<span></span>",
          margin: { top: "20mm", bottom: "20mm" },
        });
        await browser.close();
        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${courseCode}.pdf"`,
        });
        res.send(pdf);
      } catch (pdfErr) {
        res.status(500).send("PDF Error");
      }
    });
  } catch (err) {
    res.status(500).send("Error");
  }
});

module.exports = router;

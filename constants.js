const createUserTable = `
  CREATE TABLE IF NOT EXISTS auth (
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'normal',
  PRIMARY KEY(username)
)
`;

const createCourseTableQuery = `
  CREATE TABLE IF NOT EXISTS course_syllabus (
      course_code TEXT PRIMARY KEY,
      credit_scheme TEXT,
      nature_of_course TEXT,
      course_name TEXT,
      course_type TEXT,
      prerequisite TEXT,
      
      credits_theory INTEGER,
      credits_practical INTEGER,
      credits_total INTEGER,
      
      marks_internal_theory INTEGER,
      marks_internal_practical INTEGER,
      marks_internal_total INTEGER,
      marks_endterm_theory INTEGER,
      marks_endterm_practical INTEGER,
      marks_endterm_total INTEGER,
      marks_max INTEGER,
      
      exam_duration TEXT,
      paper_setter_instructions TEXT,
      
      course_outcomes JSONB,
      syllabus_units JSONB,
      evaluation_criteria JSONB,
      learning_resources TEXT,
      co_po_mapping JSONB,
      nep_mapping JSONB,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const insertCourseQuery = `
  INSERT INTO course_syllabus (
    course_code, credit_scheme, nature_of_course,
    course_name, course_type, prerequisite,
    credits_theory, credits_practical, credits_total,
    marks_internal_theory, marks_internal_practical, marks_internal_total,
    marks_endterm_theory, marks_endterm_practical, marks_endterm_total, marks_max,
    exam_duration, paper_setter_instructions,
    course_outcomes, syllabus_units, evaluation_criteria, learning_resources, co_po_mapping, nep_mapping
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
  )
  ON CONFLICT (course_code) DO UPDATE SET
    credit_scheme = EXCLUDED.credit_scheme,
    nature_of_course = EXCLUDED.nature_of_course,
    course_name = EXCLUDED.course_name,
    course_type = EXCLUDED.course_type,
    prerequisite = EXCLUDED.prerequisite,
    credits_theory = EXCLUDED.credits_theory,
    credits_practical = EXCLUDED.credits_practical,
    credits_total = EXCLUDED.credits_total,
    marks_internal_theory = EXCLUDED.marks_internal_theory,
    marks_internal_practical = EXCLUDED.marks_internal_practical,
    marks_internal_total = EXCLUDED.marks_internal_total,
    marks_endterm_theory = EXCLUDED.marks_endterm_theory,
    marks_endterm_practical = EXCLUDED.marks_endterm_practical,
    marks_endterm_total = EXCLUDED.marks_endterm_total,
    marks_max = EXCLUDED.marks_max,
    exam_duration = EXCLUDED.exam_duration,
    paper_setter_instructions = EXCLUDED.paper_setter_instructions,
    course_outcomes = EXCLUDED.course_outcomes,
    syllabus_units = EXCLUDED.syllabus_units,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    learning_resources = EXCLUDED.learning_resources,
    co_po_mapping = EXCLUDED.co_po_mapping,
    nep_mapping = EXCLUDED.nep_mapping;
`;

const createProgramTableQuery = `
  CREATE TABLE IF NOT EXISTS programs (
      program_name TEXT,
      specialization TEXT,
      level TEXT,
      scheme TEXT,
      PRIMARY KEY (program_name, specialization)
  );
`;

const insertProgramQuery = `
  INSERT INTO programs (program_name, specialization, level, scheme)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (program_name, specialization) DO UPDATE SET
    level = EXCLUDED.level,
    scheme = EXCLUDED.scheme;
`;

const createCurriculumDraftsTableQuery = `
  CREATE TABLE IF NOT EXISTS curriculum_drafts (
      program_name TEXT,
      specialization TEXT,
      draft_data JSONB,
      PRIMARY KEY (program_name, specialization),
      FOREIGN KEY (program_name, specialization) REFERENCES programs(program_name, specialization) ON DELETE CASCADE
  );
`;

const insertCurriculumDraftQuery = `
  INSERT INTO curriculum_drafts (program_name, specialization, draft_data)
  VALUES ($1, $2, $3)
  ON CONFLICT (program_name, specialization) DO UPDATE SET
    draft_data = EXCLUDED.draft_data;
`;

const dbConnectInfoDevLaptop = {
  user: "postgres",
  host: "localhost",
  database: "nirf",
  password: "Kraton+999",
  port: 5432,
};

const dbConnectInfoReal = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME_REAL,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const dbConnectInfoTest = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const verifyPrivilageLogin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.redirect("/");
  }
};

const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

module.exports = {
  dbConnectInfoTest,
  dbConnectInfoDevLaptop,
  dbConnectInfoReal,
  createCourseTableQuery,
  insertCourseQuery,
  createUserTable,
  verifyPrivilageLogin,
  verifyLogin,
  createProgramTableQuery,
  insertProgramQuery,
  createCurriculumDraftsTableQuery,
  insertCurriculumDraftQuery,
};

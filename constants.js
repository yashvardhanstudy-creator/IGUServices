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
      
      owning_program_code TEXT,
      
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
    course_outcomes, syllabus_units, evaluation_criteria, learning_resources, co_po_mapping, nep_mapping,
    owning_program_code
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
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
    nep_mapping = EXCLUDED.nep_mapping,
    owning_program_code = EXCLUDED.owning_program_code;
`;

const createProgramTableQuery = `
  CREATE TABLE IF NOT EXISTS programs (
      program_code TEXT PRIMARY KEY,
      subject_name TEXT,
      specialization TEXT,
      level TEXT,
      scheme TEXT,
      num_pos INTEGER DEFAULT 11,
      num_peos INTEGER DEFAULT 4,
      num_psos INTEGER DEFAULT 2,
      program_details JSONB
  );
`;

const insertProgramQuery = `
  INSERT INTO programs (program_code, subject_name, specialization, level, scheme, num_pos, num_peos, num_psos, program_details)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (program_code) DO UPDATE SET
    subject_name = EXCLUDED.subject_name,
    specialization = EXCLUDED.specialization,
    level = EXCLUDED.level,
    scheme = EXCLUDED.scheme,
    num_pos = EXCLUDED.num_pos,
    num_peos = EXCLUDED.num_peos,
    num_psos = EXCLUDED.num_psos;
`;

const createCurriculumDraftsTableQuery = `
  CREATE TABLE IF NOT EXISTS curriculum_drafts (
      program_code TEXT PRIMARY KEY,
      draft_data JSONB,
      FOREIGN KEY (program_code) REFERENCES programs(program_code) ON DELETE CASCADE
  );
`;

const insertCurriculumDraftQuery = `
  INSERT INTO curriculum_drafts (program_code, draft_data)
  VALUES ($1, $2)
  ON CONFLICT (program_code) DO UPDATE SET
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

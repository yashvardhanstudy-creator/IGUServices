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
      category TEXT,
      course_title TEXT,
      prerequisite TEXT,
      
      l INTEGER,
      t INTEGER,
      p INTEGER,
      credit INTEGER,
      class_marks INTEGER,
      exam_marks INTEGER,
      practical_marks INTEGER,
      total_marks INTEGER,
      exam_duration TEXT,
      
      important_note TEXT, -- For Paper-Setter Instructions
      
      syllabus_units JSONB,
      course_outcomes JSONB,
      suggested_books JSONB,
      reference_books JSONB,
      co_po_mapping JSONB,
      evaluation_criteria JSONB,
      nep_mapping JSONB,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const insertCourseQuery = `
  INSERT INTO course_syllabus (
    course_code, category, course_title, prerequisite,
    l, t, p, credit, 
    class_marks, exam_marks, practical_marks, total_marks, exam_duration, 
    important_note, 
    syllabus_units, course_outcomes, suggested_books, reference_books, co_po_mapping,
    evaluation_criteria, nep_mapping
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
  )
  ON CONFLICT (course_code) DO UPDATE SET
    category = EXCLUDED.category,
    course_title = EXCLUDED.course_title,
    l = EXCLUDED.l,
    t = EXCLUDED.t,
    p = EXCLUDED.p,
    credit = EXCLUDED.credit,
    class_marks = EXCLUDED.class_marks,
    exam_marks = EXCLUDED.exam_marks,
    practical_marks = EXCLUDED.practical_marks,
    total_marks = EXCLUDED.total_marks,
    exam_duration = EXCLUDED.exam_duration,
    important_note = EXCLUDED.important_note,
    syllabus_units = EXCLUDED.syllabus_units,
    course_outcomes = EXCLUDED.course_outcomes,
    suggested_books = EXCLUDED.suggested_books,
    reference_books = EXCLUDED.reference_books,
    co_po_mapping = EXCLUDED.co_po_mapping,
    prerequisite = EXCLUDED.prerequisite,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    nep_mapping = EXCLUDED.nep_mapping;
`;

const createSemesterCoursesTableQuery = `
  CREATE TABLE IF NOT EXISTS semester_courses (
      semester TEXT,
      academic_program TEXT,
      specialization TEXT,
      year_onward TEXT,
      courses_code JSONB,
      important_note JSONB,
      PRIMARY KEY (semester, academic_program, specialization, year_onward)
  );
`;

const insertSemesterCoursesQuery = `
  INSERT INTO semester_courses (semester, academic_program, specialization, year_onward, courses_code, important_note)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (semester, academic_program, specialization, year_onward) DO UPDATE SET
    courses_code = EXCLUDED.courses_code,
    important_note = EXCLUDED.important_note;
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
  createSemesterCoursesTableQuery,
  insertSemesterCoursesQuery,
  createProgramTableQuery,
  insertProgramQuery,
};

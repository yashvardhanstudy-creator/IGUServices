const createTableQuery = `
  CREATE TABLE IF NOT EXISTS nirf_form_data (
      submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      year TEXT,
      department TEXT,
      PRIMARY KEY (year, department),

      -- Student Strength - UG (3 Years)
      ug3_male_students INTEGER,
      ug3_female_students INTEGER,
      ug3_total_students INTEGER,
      ug3_within_state INTEGER,
      ug3_outside_state INTEGER,
      ug3_outside_country INTEGER,
      ug3_economically_backward INTEGER,
      ug3_socially_challenged INTEGER,
      ug3_scholarship_government INTEGER,
      ug3_scolarship_institution INTEGER,
      ug3_scholarship_private INTEGER,
      ug3_noscholarship INTEGER,

      -- Student Strength - UG (4 Years)
      ug4_male_students INTEGER,
      ug4_female_students INTEGER,
      ug4_total_students INTEGER,
      ug4_within_state INTEGER,
      ug4_outside_state INTEGER,
      ug4_outside_country INTEGER,
      ug4_economically_backward INTEGER,
      ug4_socially_challenged INTEGER,
      ug4_scholarship_government INTEGER,
      ug4_scolarship_institution INTEGER,
      ug4_scholarship_private INTEGER,
      ug4_noscholarship INTEGER,

      -- Student Strength - PG (2 Years)
      pg2_male_students INTEGER,
      pg2_female_students INTEGER,
      pg2_total_students INTEGER,
      pg2_within_state INTEGER,
      pg2_outside_state INTEGER,
      pg2_outside_country INTEGER,
      pg2_economically_backward INTEGER,
      pg2_socially_challenged INTEGER,
      pg2_scholarship_government INTEGER,
      pg2_scolarship_institution INTEGER,
      pg2_scholarship_private INTEGER,
      pg2_noscholarship INTEGER,

      -- Student Strength - PG (3 Years)
      pg3_male_students INTEGER,
      pg3_female_students INTEGER,
      pg3_total_students INTEGER,
      pg3_within_state INTEGER,
      pg3_outside_state INTEGER,
      pg3_outside_country INTEGER,
      pg3_economically_backward INTEGER,
      pg3_socially_challenged INTEGER,
      pg3_scholarship_government INTEGER,
      pg3_scolarship_institution INTEGER,
      pg3_scholarship_private INTEGER,
      pg3_noscholarship INTEGER,

      -- Student Strength - PG-Integrated (5 Years)
      pg5_male_students INTEGER,
      pg5_female_students INTEGER,
      pg5_total_students INTEGER,
      pg5_within_state INTEGER,
      pg5_outside_state INTEGER,
      pg5_outside_country INTEGER,
      pg5_economically_backward INTEGER,
      pg5_socially_challenged INTEGER,
      pg5_scholarship_government INTEGER,
      pg5_scolarship_institution INTEGER,
      pg5_scholarship_private INTEGER,
      pg5_noscholarship INTEGER,

      -- Student Strength - Any Other
      Any_Other_male_students INTEGER,
      Any_Other_female_students INTEGER,
      Any_Other_total_students INTEGER,
      Any_Other_within_state INTEGER,
      Any_Other_outside_state INTEGER,
      Any_Other_outside_country INTEGER,
      Any_Other_economically_backward INTEGER,
      Any_Other_socially_challenged INTEGER,
      Any_Other_scholarship_government INTEGER,
      Any_Other_scolarship_institution INTEGER,
      Any_Other_scholarship_private INTEGER,
      Any_Other_noscholarship INTEGER,

      -- Placement & Higher Studies - UG (3 Years)
      ug3_2ndprevious_to_submission_year_firstyears_sanctionedintake INTEGER,
      ug3_2ndprevious_to_submission_year_supernumeraryseats INTEGER,
      ug3_2ndprevious_to_submission_year_lateralentry INTEGER,
      ug3_2ndprevious_to_submission_year_selected_for_higherstudies INTEGER,
      ug3_previous_to_submission_year_firstyears_sanctionedintake INTEGER,
      ug3_previous_to_submission_year_supernumeraryseats INTEGER,
      ug3_previous_to_submission_year_lateralentry INTEGER,
      ug3_previous_to_submission_year_selected_for_higherstudies INTEGER,
      ug3_latest_submission_year_firstyears_sanctionedintake INTEGER,
      ug3_latest_submission_year_supernumeraryseats INTEGER,
      ug3_latest_submission_year_lateralentry INTEGER,
      ug3_latest_submission_year_selected_for_higherstudies INTEGER,

      -- Placement & Higher Studies - UG (4 Years)
      ug4_2ndprevious_to_submission_year_firstyears_sanctionedintake INTEGER,
      ug4_2ndprevious_to_submission_year_supernumeraryseats INTEGER,
      ug4_2ndprevious_to_submission_year_lateralentry INTEGER,
      ug4_2ndprevious_to_submission_year_selected_for_higherstudies INTEGER,
      ug4_previous_to_submission_year_firstyears_sanctionedintake INTEGER,
      ug4_previous_to_submission_year_supernumeraryseats INTEGER,
      ug4_previous_to_submission_year_lateralentry INTEGER,
      ug4_previous_to_submission_year_selected_for_higherstudies INTEGER,
      ug4_latest_submission_year_firstyears_sanctionedintake INTEGER,
      ug4_latest_submission_year_supernumeraryseats INTEGER,
      ug4_latest_submission_year_lateralentry INTEGER,
      ug4_latest_submission_year_selected_for_higherstudies INTEGER,

      -- Placement & Higher Studies - PG (2 Years)
      pg2_previous_to_submission_year_firstyear INTEGER,
      pg2_previous_to_submission_year_supernumeraryseats INTEGER,
      pg2_previous_to_submission_year_higherstudies INTEGER,
      pg2_latest_submission_year_firstyear INTEGER,
      pg2_latest_submission_year_supernumeraryseats INTEGER,
      pg2_latest_submission_year_higherstudies INTEGER,

      -- Placement & Higher Studies - PG (3 Years)
      pg3_2ndprevious_to_submission_year_firstyear INTEGER,
      pg3_2ndprevious_to_submission_year_supernumeraryseats INTEGER,
      pg3_2ndprevious_to_submission_year_lateralentry INTEGER,
      pg3_2ndprevious_to_submission_year_higherstudies INTEGER,
      pg3_previous_to_submission_year_firstyear INTEGER,
      pg3_previous_to_submission_year_supernumeraryseats INTEGER,
      pg3_previous_to_submission_year_lateralentry INTEGER,
      pg3_previous_to_submission_year_higherstudies INTEGER,
      pg3_latest_submission_year_firstyear INTEGER,
      pg3_latest_submission_year_supernumeraryseats INTEGER,
      pg3_latest_submission_year_lateralentry INTEGER,
      pg3_latest_submission_year_higherstudies INTEGER,

      -- Placement & Higher Studies - PG-Integrated (5 Years)
      pg5_previous_to_submission_year_firstyear INTEGER,
      pg5_previous_to_submission_year_supernumeraryseats INTEGER,
      pg5_previous_to_submission_year_higherstudies INTEGER,
      pg5_latest_submission_year_firstyear INTEGER,
      pg5_latest_submission_year_supernumeraryseats INTEGER,
      pg5_latest_submission_year_higherstudies INTEGER,

      -- Ph.D. Students Details (2026-27)
      phd_totalstudents INTEGER,
      phd_fulltime INTEGER,
      phd_parttime INTEGER
  );
`;
const createUserTable = `
  CREATE TABLE IF NOT EXISTS auth (
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'normal',
  PRIMARY KEY(username)
)
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

const insertQuery = `
      INSERT INTO nirf_form_data (
      year,
      department,
      ug3_male_students,
      ug3_female_students,
      ug3_total_students,
      ug3_within_state,
      ug3_outside_state,
      ug3_outside_country,
      ug3_economically_backward,
      ug3_socially_challenged,
      ug3_scholarship_government,
      ug3_scolarship_institution,
      ug3_scholarship_private,
      ug3_noscholarship,
      ug4_male_students,
      ug4_female_students,
      ug4_total_students,
      ug4_within_state,
      ug4_outside_state,
      ug4_outside_country,
      ug4_economically_backward,
      ug4_socially_challenged,
      ug4_scholarship_government,
      ug4_scolarship_institution,
      ug4_scholarship_private,
      ug4_noscholarship,
      pg2_male_students,
      pg2_female_students,
      pg2_total_students,
      pg2_within_state,
      pg2_outside_state,
      pg2_outside_country,
      pg2_economically_backward,
      pg2_socially_challenged,
      pg2_scholarship_government,
      pg2_scolarship_institution,
      pg2_scholarship_private,
      pg2_noscholarship,
      pg3_male_students,
      pg3_female_students,
      pg3_total_students,
      pg3_within_state,
      pg3_outside_state,
      pg3_outside_country,
      pg3_economically_backward,
      pg3_socially_challenged,
      pg3_scholarship_government,
      pg3_scolarship_institution,
      pg3_scholarship_private,
      pg3_noscholarship,
      pg5_male_students,
      pg5_female_students,
      pg5_total_students,
      pg5_within_state,
      pg5_outside_state,
      pg5_outside_country,
      pg5_economically_backward,
      pg5_socially_challenged,
      pg5_scholarship_government,
      pg5_scolarship_institution,
      pg5_scholarship_private,
      pg5_noscholarship,
      Any_Other_male_students,
      Any_Other_female_students,
      Any_Other_total_students,
      Any_Other_within_state,
      Any_Other_outside_state,
      Any_Other_outside_country,
      Any_Other_economically_backward,
      Any_Other_socially_challenged,
      Any_Other_scholarship_government,
      Any_Other_scolarship_institution,
      Any_Other_scholarship_private,
      Any_Other_noscholarship,
      ug3_2ndprevious_to_submission_year_firstyears_sanctionedintake,
      ug3_2ndprevious_to_submission_year_supernumeraryseats,
      ug3_2ndprevious_to_submission_year_lateralentry,
      ug3_2ndprevious_to_submission_year_selected_for_higherstudies,
      ug3_previous_to_submission_year_firstyears_sanctionedintake,
      ug3_previous_to_submission_year_supernumeraryseats,
      ug3_previous_to_submission_year_lateralentry,
      ug3_previous_to_submission_year_selected_for_higherstudies,
      ug3_latest_submission_year_firstyears_sanctionedintake,
      ug3_latest_submission_year_supernumeraryseats,
      ug3_latest_submission_year_lateralentry,
      ug3_latest_submission_year_selected_for_higherstudies,
      ug4_2ndprevious_to_submission_year_firstyears_sanctionedintake,
      ug4_2ndprevious_to_submission_year_supernumeraryseats,
      ug4_2ndprevious_to_submission_year_lateralentry,
      ug4_2ndprevious_to_submission_year_selected_for_higherstudies,
      ug4_previous_to_submission_year_firstyears_sanctionedintake,
      ug4_previous_to_submission_year_supernumeraryseats,
      ug4_previous_to_submission_year_lateralentry,
      ug4_previous_to_submission_year_selected_for_higherstudies,
      ug4_latest_submission_year_firstyears_sanctionedintake,
      ug4_latest_submission_year_supernumeraryseats,
      ug4_latest_submission_year_lateralentry,
      ug4_latest_submission_year_selected_for_higherstudies,
      pg2_previous_to_submission_year_firstyear,
      pg2_previous_to_submission_year_supernumeraryseats,
      pg2_previous_to_submission_year_higherstudies,
      pg2_latest_submission_year_firstyear,
      pg2_latest_submission_year_supernumeraryseats,
      pg2_latest_submission_year_higherstudies,
      pg3_2ndprevious_to_submission_year_firstyear,
      pg3_2ndprevious_to_submission_year_supernumeraryseats,
      pg3_2ndprevious_to_submission_year_lateralentry,
      pg3_2ndprevious_to_submission_year_higherstudies,
      pg3_previous_to_submission_year_firstyear,
      pg3_previous_to_submission_year_supernumeraryseats,
      pg3_previous_to_submission_year_lateralentry,
      pg3_previous_to_submission_year_higherstudies,
      pg3_latest_submission_year_firstyear,
      pg3_latest_submission_year_supernumeraryseats,
      pg3_latest_submission_year_lateralentry,
      pg3_latest_submission_year_higherstudies,
      pg5_previous_to_submission_year_firstyear,
      pg5_previous_to_submission_year_supernumeraryseats,
      pg5_previous_to_submission_year_higherstudies,
      pg5_latest_submission_year_firstyear,
      pg5_latest_submission_year_supernumeraryseats,
      pg5_latest_submission_year_higherstudies,
      phd_totalstudents,
      phd_fulltime,
      phd_parttime
  )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125
      );
    `;

const createYear = (year) => {
  return `${year}-${year + 1}`;
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
  createTableQuery,
  dbConnectInfoTest,
  dbConnectInfoDevLaptop,
  dbConnectInfoReal,
  insertQuery,
  createUserTable,
  verifyPrivilageLogin,
  verifyLogin,
  createYear,
};

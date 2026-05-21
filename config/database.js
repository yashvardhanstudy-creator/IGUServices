const { Pool } = require("pg");
const {
  dbConnectInfoTest,
  createUserTable,
  createCourseTableQuery,
  createProgramTableQuery,
  createCurriculumDraftsTableQuery,
} = require("../constants");

const pool = new Pool(dbConnectInfoTest);

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

pool.connect((err, client, done) => {
  if (err) {
    console.error("Database connection failed:", err);
    if (done) done();
  } else {
    console.log("✅ Connected to PostgreSQL database", client.database);
    done();
  }
});

pool.query(createUserTable, (err) => {
  if (err) console.error("Error creating user table:", err);
  else console.log("✅ Table 'auth' ensured to exist.");
});
pool.query(createProgramTableQuery, (err) => {
  if (err) console.error("Error creating programs table:", err);
  else console.log("✅ Table 'programs' ensured to exist.");
});
pool.query(createCourseTableQuery, (err) => {
  if (err) console.error("Error creating course table:", err);
  else console.log("✅ Table 'course_syllabus' ensured to exist.");
});
pool.query(createCurriculumDraftsTableQuery, (err) => {
  if (err) console.error("Error creating curriculum_drafts table:", err);
  else console.log("✅ Table 'curriculum_drafts' ensured to exist.");
});

module.exports = pool;

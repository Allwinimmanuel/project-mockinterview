import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// User Model
export const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("candidate", "admin"),
    defaultValue: "candidate",
  },
});

// Drive Model (Replaces Assessment to match Frontend)
export const Drive = sequelize.define("Drive", {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  company: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "Active" },
  date: { type: DataTypes.STRING },
  candidates: { type: DataTypes.JSON }, // array of candidate objects
  roundSchedules: { type: DataTypes.JSON }, // nested schedule objects
  submissions: { type: DataTypes.JSON }, // array of submissions for this drive
});

// Question Model
export const Question = sequelize.define("Question", {
  id: { type: DataTypes.STRING, primaryKey: true }, // Using string IDs like 'qa1', 'arr_easy_1'
  roundCategory: { type: DataTypes.STRING, allowNull: false }, // e.g. 'Quantitative Aptitude', 'Arrays'
  type: {
    type: DataTypes.ENUM("mcq", "coding", "technical", "hr"),
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM("Easy", "Medium", "Hard"),
    defaultValue: "Medium",
  },
  content: { type: DataTypes.JSON, allowNull: false }, // Stores the question text, options, answer index, or starterCode/testcases
});

// Submission Model
export const Submission = sequelize.define("Submission", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: { type: DataTypes.UUID, references: { model: User, key: "id" } },
  driveId: { type: DataTypes.STRING, references: { model: Drive, key: "id" } },
  answers: { type: DataTypes.JSON }, // Candidate's selected options or written code
  proctoringLogs: { type: DataTypes.JSON }, // All AI proctoring warnings and focus losses
  roundId: { type: DataTypes.STRING }, // Track which round this submission belongs to
  score: { type: DataTypes.FLOAT, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM("in-progress", "completed", "terminated"),
    defaultValue: "in-progress",
  },
});

// Candidate Drive Status Model (Stores all applicants for a drive)
export const DriveCandidate = sequelize.define("DriveCandidate", {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  driveId: { type: DataTypes.STRING, references: { model: Drive, key: "id" } },
  status: { type: DataTypes.STRING, defaultValue: "Pending" },
  registeredAt: { type: DataTypes.STRING },
});

// Candidate Round Specific Shortlist Status
export const CandidateRoundStatus = sequelize.define("CandidateRoundStatus", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  candidateId: { type: DataTypes.STRING, references: { model: DriveCandidate, key: "id" } },
  driveId: { type: DataTypes.STRING, references: { model: Drive, key: "id" } },
  roundId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
});

// 5 Separate Tables for Rounds 1 to 5 (Explicit User Request)
const createRoundModel = (roundNumber) => {
  return sequelize.define(`Round${roundNumber}Detail`, {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    candidateId: { type: DataTypes.STRING },
    candidateName: { type: DataTypes.STRING },
    candidateEmail: { type: DataTypes.STRING },
    driveId: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    score: { type: DataTypes.FLOAT },
    answers: { type: DataTypes.JSON },
    proctoringLogs: { type: DataTypes.JSON },
  });
};

export const Round1Detail = createRoundModel(1);
export const Round2Detail = createRoundModel(2);
export const Round3Detail = createRoundModel(3);
export const Round4Detail = createRoundModel(4);
export const Round5Detail = createRoundModel(5);

export const RoundModels = {
  '1': Round1Detail,
  '2': Round2Detail,
  '3': Round3Detail,
  '4': Round4Detail,
  '5': Round5Detail,
};

// ----------------------------------------------------
// FINAL NORMALIZATION TABLES (Schedules, Alerts, Answers)
// ----------------------------------------------------

export const RoundSchedule = sequelize.define("RoundSchedule", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  driveId: { type: DataTypes.STRING, references: { model: Drive, key: "id" } },
  roundId: { type: DataTypes.STRING, allowNull: false },
  startDate: { type: DataTypes.STRING },
  endDate: { type: DataTypes.STRING },
  startTime: { type: DataTypes.STRING },
  endTime: { type: DataTypes.STRING },
  duration: { type: DataTypes.INTEGER },
});

export const ProctoringAlert = sequelize.define("ProctoringAlert", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  candidateId: { type: DataTypes.STRING },
  driveId: { type: DataTypes.STRING },
  roundId: { type: DataTypes.STRING },
  alertType: { type: DataTypes.STRING },
  timestamp: { type: DataTypes.STRING },
});

export const CandidateAnswer = sequelize.define("CandidateAnswer", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  candidateId: { type: DataTypes.STRING },
  driveId: { type: DataTypes.STRING },
  roundId: { type: DataTypes.STRING },
  questionId: { type: DataTypes.STRING },
  submittedCode: { type: DataTypes.TEXT },
  language: { type: DataTypes.STRING },
  isCorrect: { type: DataTypes.BOOLEAN },
  testCasesPassed: { type: DataTypes.INTEGER },
  totalTestCases: { type: DataTypes.INTEGER },
  runtime: { type: DataTypes.STRING },
});

// Relationships
User.hasMany(Submission, { foreignKey: "userId" });
Submission.belongsTo(User, { foreignKey: "userId" });

Drive.hasMany(Submission, { foreignKey: "driveId" });
Submission.belongsTo(Drive, { foreignKey: "driveId" });

const syncDB = async () => {
  try {
    // Sync the defined models without altering existing tables on every restart.
    // This avoids foreign-key rebuild deadlocks when the database is already populated.
    await sequelize.sync();
    console.log("✅ MySQL Database synchronized.");
  } catch (err) {
    console.error("❌ Error synchronizing database:", err);
  }
};

export { syncDB };

import express from 'express';
import { Question, Submission, User, Drive, DriveCandidate, CandidateRoundStatus, RoundModels, RoundSchedule, ProctoringAlert, CandidateAnswer } from '../models/index.js';

const router = express.Router();

// 1. Get all questions (we will later filter by assessmentId or round)
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.findAll();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Submit an exam
router.post('/submit', async (req, res) => {
  try {
    const { userId, assessmentId, roundId, answers, proctoringLogs, score, status } = req.body;
    
    const submission = await Submission.create({
      userId,
      driveId: assessmentId, // map assessmentId back to driveId for submission
      roundId,
      answers,
      proctoringLogs,
      score: score || 0,
      status: status || 'completed'
    });

    // --- NEW LOGIC: Store separately into Round 1 - Round 5 tables ---
    if (roundId && RoundModels[String(roundId)]) {
      const RoundModel = RoundModels[String(roundId)];
      let rDetails = await RoundModel.findOne({ where: { candidateId: userId, driveId: assessmentId } });
      if (rDetails) {
        await rDetails.update({ score: score || 0, answers, proctoringLogs });
      } else {
        await RoundModel.create({ 
          candidateId: userId, 
          driveId: assessmentId, 
          score: score || 0, 
          answers, 
          proctoringLogs 
        });
      }
    }
    // -----------------------------------------------------------------

    // --- NEW LOGIC: Unspool Answers and Proctoring Logs into Tables ---
    if (proctoringLogs && Array.isArray(proctoringLogs)) {
      for (const log of proctoringLogs) {
        await ProctoringAlert.create({
          candidateId: userId,
          driveId: assessmentId,
          roundId: String(roundId || 1),
          alertType: log.message || log.type || 'Warning',
          timestamp: log.timestamp || new Date().toISOString()
        });
      }
    }

    if (answers && answers.questionsData && Array.isArray(answers.questionsData)) {
      for (const q of answers.questionsData) {
        await CandidateAnswer.create({
          candidateId: userId,
          driveId: assessmentId,
          roundId: String(roundId || 1),
          questionId: String(q.questionId),
          submittedCode: q.code || '',
          language: q.language || 'javascript',
          isCorrect: q.verdict === 'Accepted' || (q.passPercentage === 100),
          testCasesPassed: q.passedCount || 0,
          totalTestCases: q.totalTestcases || 0,
          runtime: q.runtime || '0ms'
        });
      }
    }
    // ------------------------------------------------------------------

    res.status(201).json({ message: 'Exam submitted successfully', submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Simple Login Mock (will be expanded later)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'candidate'
    });

    res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get all drives
router.get('/drives', async (req, res) => {
  try {
    const drives = await Drive.findAll();
    res.json(drives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Sync a drive (create or update)
router.post('/drives', async (req, res) => {
  try {
    const { id, name, company, status, date, candidates, roundSchedules, submissions } = req.body;
    
    let drive = await Drive.findOne({ where: { id } });
    if (drive) {
      drive = await drive.update({ name, company, status, date, candidates, roundSchedules, submissions });
    } else {
      drive = await Drive.create({ id, name, company, status, date, candidates, roundSchedules, submissions });
    }

    // --- NEW RELATIONAL DB LOGIC FOR SHORTLISTS AND CANDIDATES ---
    if (candidates && Array.isArray(candidates)) {
      for (const c of candidates) {
        await DriveCandidate.upsert({
          id: c.id,
          name: c.name || 'Unknown',
          email: c.email || 'unknown@example.com',
          driveId: c.driveId || id,
          status: c.status || 'Pending',
          registeredAt: c.registeredAt || new Date().toISOString()
        });

        if (c.roundStatuses) {
          for (const [roundId, rStatus] of Object.entries(c.roundStatuses)) {
            // Remove old status for this specific candidate/round combination to avoid duplicates
            await CandidateRoundStatus.destroy({
              where: { candidateId: c.id, driveId: id, roundId: String(roundId) }
            });
            // Insert the fresh status
            await CandidateRoundStatus.create({
              candidateId: c.id,
              driveId: id,
              roundId: String(roundId),
              status: rStatus
            });

            // Update the specific Round 1-5 Tables
            if (RoundModels[String(roundId)]) {
              const RoundModel = RoundModels[String(roundId)];
              let rDetails = await RoundModel.findOne({ where: { candidateId: c.id, driveId: id } });
              if (rDetails) {
                await rDetails.update({ status: rStatus, candidateName: c.name, candidateEmail: c.email });
              } else {
                await RoundModel.create({ 
                  candidateId: c.id, 
                  candidateName: c.name || 'Unknown', 
                  candidateEmail: c.email || 'unknown@example.com', 
                  driveId: id, 
                  status: rStatus 
                });
              }
            }
          }
        }
      }
    }
    
    // --- NEW LOGIC: Unspool Round Schedules ---
    if (roundSchedules && typeof roundSchedules === 'object') {
      for (const [rId, sched] of Object.entries(roundSchedules)) {
        let scheduleRec = await RoundSchedule.findOne({ where: { driveId: id, roundId: String(rId) } });
        if (scheduleRec) {
          await scheduleRec.update({
            startDate: sched.startDate,
            endDate: sched.endDate,
            startTime: sched.startTime,
            endTime: sched.endTime,
            duration: sched.duration || 60
          });
        } else {
          await RoundSchedule.create({
            driveId: id,
            roundId: String(rId),
            startDate: sched.startDate,
            endDate: sched.endDate,
            startTime: sched.startTime,
            endTime: sched.endTime,
            duration: sched.duration || 60
          });
        }
      }
    }
    // -----------------------------------------------------------

    res.json({ message: 'Drive synced successfully', drive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

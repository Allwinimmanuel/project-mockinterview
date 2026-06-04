import { createContext, useContext, useState, useEffect } from 'react';
import { generateQuestions, generateTechnicalMCQ } from '../data/questionBank';
import { fetchDrives, syncDrive } from '../services/api';

const DriveContext = createContext(null);

const INITIAL_DRIVES = [
  { id: 'drv-001', name: 'Software Engineer 2026', company: 'TechCorp', status: 'Active', candidates: 450, date: 'Oct 15, 2026' },
  { id: 'drv-002', name: 'Campus Recruitment - Tier 1', company: 'Global AI', status: 'Active', candidates: 1200, date: 'Nov 01, 2026' },
  { id: 'drv-003', name: 'Data Scientist Hiring', company: 'DataFlex', status: 'Completed', candidates: 320, date: 'Sep 10, 2026' },
];

const ROUND_NAMES = {
  '1': 'Aptitude Test',
  '2': 'Coding Round',
  '3': 'Technical Interview',
  '4': 'Managerial Round',
  '5': 'HR Interview',
};

export const DriveProvider = ({ children }) => {
  const [drives, setDrives] = useState(INITIAL_DRIVES);
  const [candidates, setCandidates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [roundSchedules, setRoundSchedules] = useState({});

  useEffect(() => {
    fetchDrives().then((data) => {
      if (data && data.length > 0) {
        setDrives(data);
        
        // aggregate all inner models back to top level for backward compatibility
        let allCandidates = [];
        let allSubmissions = [];
        let allSchedules = {};
        
        data.forEach(d => {
          if (d.candidates) allCandidates = [...allCandidates, ...d.candidates];
          if (d.submissions) allSubmissions = [...allSubmissions, ...d.submissions];
          if (d.roundSchedules) allSchedules[d.id] = d.roundSchedules;
        });

        setCandidates(allCandidates);
        setSubmissions(allSubmissions);
        setRoundSchedules(allSchedules);
      }
    });
  }, []);

  const persistToDB = async (updatedDrives, updatedCandidates, updatedSubmissions, updatedSchedules, driveIdToSync) => {
    const d = updatedDrives.find(d => d.id === driveIdToSync);
    if (!d) return;
    
    const driveData = {
      ...d,
      candidates: updatedCandidates.filter(c => c.driveId === driveIdToSync),
      submissions: updatedSubmissions.filter(s => s.driveId === driveIdToSync),
      roundSchedules: updatedSchedules[driveIdToSync] || {}
    };

    try {
      await syncDrive(driveData);
    } catch (e) {
      console.error("Failed to sync drive", e);
    }
  };

  const addDrive = (newDrive) => {
    const newD = { ...newDrive, id: `drv-${Math.floor(Math.random() * 100000)}`, status: 'Active', candidates: [] };
    const updated = [...drives, newD];
    setDrives(updated);
    persistToDB(updated, candidates, submissions, roundSchedules, newD.id);
  };

  const deleteDrive = (driveId) => {
    const updated = drives.filter(d => d.id !== driveId);
    setDrives(updated);
    localStorage.setItem('mock_drives', JSON.stringify(updated));
  };

  // Save a round schedule, auto-generate questions, and mark as allocated
  const saveRoundSchedule = (driveId, roundId, config) => {
    const isCodingRound    = roundId === '2';
    const isTechnicalAIRound = ['3', '4', '5'].includes(String(roundId));

    // For coding round: use numQuestions. For all other rounds: use totalQuestions.
    const numQuestionsForCoding = Math.max(1, Number(config.numQuestions)   || 1);
    const numQuestionsForMcq   = Math.max(1, Number(config.totalQuestions) || 15);
    const totalCount = isCodingRound ? numQuestionsForCoding : numQuestionsForMcq;

    // Use pre-generated questions if provided (e.g. from AI preview).
    // Otherwise fall back to the appropriate generator based on round type.
    let questions = [];
    if (config.questionAssignmentMode === 'manual' && config.manualQuestions && config.manualQuestions.length > 0) {
      questions = config.manualQuestions;
    } else if (isCodingRound && config.codingQuestions && config.codingQuestions.length > 0) {
      questions = config.codingQuestions;
    } else if (config.generatedQuestions && config.generatedQuestions.length > 0) {
      questions = config.generatedQuestions;
    } else {
      questions = isTechnicalAIRound
        ? generateTechnicalMCQ(config.topics || {}, totalCount, config.difficulty)
        : generateQuestions(config.topics || {}, totalCount, isCodingRound);
    }

    const schedule = {
      ...config,
      roundId,
      driveId,
      roundName: ROUND_NAMES[roundId] || `Round ${roundId}`,
      scheduledAt: new Date().toISOString(),
      allocated: true,
      numQuestions: numQuestionsForCoding,   // coding round cap
      totalQuestions: numQuestionsForMcq,    // mcq/technical round cap
      questions, // generated and capped questions stored here
    };

    const updated = {
      ...roundSchedules,
      [driveId]: {
        ...(roundSchedules[driveId] || {}),
        [roundId]: schedule,
      },
    };

    setRoundSchedules(updated);
    persistToDB(drives, candidates, submissions, updated, driveId);
  };

  // Check if a candidate is eligible for a given round
  // Round 1: all registered candidates are eligible
  // Round 2+: only candidates shortlisted from the previous round
  const isCandidateEligible = (candidateEmail, driveId, roundId) => {
    const round = Number(roundId);
    if (round === 1) return true; // Round 1 is open to all

    // Find the candidate record
    const candidate = candidates.find(
      c => c.email === candidateEmail && c.driveId === driveId
    );
    if (!candidate) return false;

    // For round N, candidate must have submitted round N-1
    const prevRoundId = String(round - 1);
    const candidatePrevSub = submissions.find(
      s => s.candidateId === candidate.id && s.driveId === driveId && String(s.roundId) === prevRoundId
    );
    if (!candidatePrevSub) return false;

    // They must be explicitly shortlisted FOR the previous round
    const roundStatuses = candidate.roundStatuses || {};
    if (roundStatuses[prevRoundId]) {
      return roundStatuses[prevRoundId] === 'Shortlisted';
    }
    
    // Fallback for older records
    return candidate.status === 'Shortlisted';
  };

  const hasCandidateSubmittedRound = (candidateEmail, driveId, roundId) => {
    const candidate = candidates.find(
      c => c.email === candidateEmail && c.driveId === driveId
    );
    if (!candidate) return false;
    return submissions.some(
      s => s.candidateId === candidate.id && s.driveId === driveId && s.roundId === roundId
    );
  };

  const registerCandidateForDrive = (candidateEmail, candidateName, driveId) => {
    const existing = candidates.find(c => c.email === candidateEmail && c.driveId === driveId);
    if (existing) return existing;

    const newCandidate = {
      id: `CAND-${Math.floor(Math.random() * 10000)}`,
      name: candidateName,
      email: candidateEmail,
      driveId,
      status: 'Pending',
      registeredAt: new Date().toISOString(),
    };
    const updated = [...candidates, newCandidate];
    setCandidates(updated);
    persistToDB(drives, updated, submissions, roundSchedules, driveId);
    return newCandidate;
  };

  const submitRound = (candidateId, driveId, roundId, score, secureScore, timeTaken, metrics = null) => {
    const newSub = {
      id: `SUB-${Math.floor(Math.random() * 10000)}`,
      candidateId, driveId, roundId, score, secureScore, timeTaken,
      metrics, // Store rich coding metrics like verdict, passPercentage, code, etc.
      submittedAt: new Date().toISOString(),
    };
    const updated = [...submissions.filter(s => !(s.candidateId === candidateId && s.roundId === roundId)), newSub];
    setSubmissions(updated);
    persistToDB(drives, candidates, updated, roundSchedules, driveId);
  };

  const updateCandidateStatus = (candidateId, driveId, roundId, newStatus) => {
    const updated = candidates.map(c => {
      if (c.id === candidateId && c.driveId === driveId) {
        const roundStatuses = c.roundStatuses || {};
        return { 
          ...c, 
          status: newStatus, // keep global status for UI backward compatibility
          roundStatuses: { ...roundStatuses, [roundId]: newStatus }
        };
      }
      return c;
    });
    setCandidates(updated);
    persistToDB(drives, updated, submissions, roundSchedules, driveId);
  };

  return (
    <DriveContext.Provider value={{
      drives, addDrive, deleteDrive,
      candidates, submissions,
      roundSchedules,
      saveRoundSchedule,
      isCandidateEligible,
      hasCandidateSubmittedRound,
      registerCandidateForDrive,
      submitRound,
      updateCandidateStatus,
    }}>
      {children}
    </DriveContext.Provider>
  );
};

export const useDrives = () => useContext(DriveContext);

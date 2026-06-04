const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const fetchQuestions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch questions:", error);
    return [];
  }
};

export const fetchQuestionBank = async () => {
  try {
    const questions = await fetchQuestions();

    // Transform flat array into { "Topic Name": [ questions ] }
    const questionBank = {};
    questions.forEach((q) => {
      // Parse JSON fields if they are strings
      try {
        if (typeof q.options === "string") q.options = JSON.parse(q.options);
        if (typeof q.visibleTestcases === "string")
          q.visibleTestcases = JSON.parse(q.visibleTestcases);
        if (typeof q.hiddenTestcases === "string")
          q.hiddenTestcases = JSON.parse(q.hiddenTestcases);
        if (typeof q.starterCode === "string")
          q.starterCode = JSON.parse(q.starterCode);
      } catch (e) {
        console.error("Error parsing question JSON fields", e);
      }

      if (!questionBank[q.topic]) {
        questionBank[q.topic] = [];
      }
      questionBank[q.topic].push(q);
    });

    return questionBank;
  } catch (error) {
    console.error("Failed to build question bank:", error);
    return {};
  }
};

export const submitExam = async (submissionData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      throw new Error("Failed to submit exam");
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting exam:", error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");
    return data.user;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (name, email, password, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");
    return data.user;
  } catch (error) {
    throw error;
  }
};

export const fetchDrives = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/drives`);
    if (!response.ok) throw new Error("Failed to fetch drives");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const syncDrive = async (driveData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/drives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driveData),
    });
    if (!response.ok) throw new Error("Failed to sync drive");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

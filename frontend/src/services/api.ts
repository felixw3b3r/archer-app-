const API_URL = 'http://192.168.1.103:2000/api';

// ==========================================
// STUDENT (ÖĞRENCİ) API
// ==========================================

export const getStudentSessions = async (userId: string) => {
  const response = await fetch(`${API_URL}/student/sessions/${userId}`);
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

export const saveStudentSession = async (sessionData: any) => {
  const response = await fetch(`${API_URL}/student/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sessionData),
  });
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

// ==========================================
// TEACHER (ÖĞRETMEN) API
// ==========================================

export const getTeacherStudents = async (teacherId: string) => {
  const response = await fetch(`${API_URL}/teacher/students/${teacherId}`);
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

export const addTeacherStudent = async (studentData: any) => {
  const response = await fetch(`${API_URL}/teacher/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(studentData),
  });
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

export const getTeacherCompetitions = async (teacherId: string) => {
  const response = await fetch(`${API_URL}/teacher/competitions/${teacherId}`);
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

export const saveTeacherCompetition = async (competitionData: any) => {
  const response = await fetch(`${API_URL}/teacher/competitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(competitionData),
  });
  if (!response.ok) {
    throw new Error('Ağ hatasi oluştu');
  }
  return await response.json();
};

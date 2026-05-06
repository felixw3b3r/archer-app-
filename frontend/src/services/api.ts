const API_URL = 'https://yusuftaha.space/api';

// ==========================================
// AUTH (KAYIT) API
// ==========================================

export const registerUser = async (userData: any) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Kayıt sırasında bir hata oluştu');
  }
  return data;
};

export const loginUser = async (userData: any) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Giriş sırasında bir hata oluştu');
  }
  return data;
};

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

export const getAllStudents = async () => {
  const response = await fetch(`${API_URL}/teacher/all-students`);
  if (!response.ok) throw new Error('Öğrenciler getirilemedi');
  return response.json();
};

export const addStudentByTeacher = async (studentData: { name: string; surname: string; dob: string }) => {
  const response = await fetch(`${API_URL}/teacher/add-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Öğrenci eklenemedi');
  }
  return response.json();
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

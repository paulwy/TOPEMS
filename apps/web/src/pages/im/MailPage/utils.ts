const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateEmailList = (emails: string): { valid: boolean; invalidEmails: string[] } => {
  if (!emails.trim()) {
    return { valid: true, invalidEmails: [] };
  }
  const emailList = emails
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidEmails = emailList.filter((email) => !validateEmail(email));
  return { valid: invalidEmails.length === 0, invalidEmails };
};

const validateJson = (jsonString: string): boolean => {
  if (!jsonString.trim()) return true;
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

export { validateEmailList, validateJson };

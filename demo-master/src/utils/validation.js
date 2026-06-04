export const validateDateTime = (dateStr, timeStr = null) => {
  if (!dateStr) return "Date is required.";

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (dateStr < todayStr) {
    return "Past dates cannot be selected. Please choose current or future date.";
  }

  if (timeStr === "") {
    return "Time is required.";
  }

  if (dateStr === todayStr && timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedTimeInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    if (selectedTimeInMinutes <= currentTimeInMinutes) {
      return "Please choose a future time. Current or past time is not allowed.";
    }
  }

  return null;
};

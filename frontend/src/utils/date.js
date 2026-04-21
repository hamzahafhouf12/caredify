export const formatDate = (date, locales = "fr-FR", options = {}) => {
  if (!date) return "--";
  const d = new Date(date);
  return d.toLocaleDateString(locales, options);
};

export const formatTime = (date, locales = "fr-FR", options = { hour: "2-digit", minute: "2-digit" }) => {
  if (!date) return "--";
  const d = new Date(date);
  return d.toLocaleTimeString(locales, options);
};

export const formatDateTime = (date, locales = "fr-FR") => {
  if (!date) return "--";
  const d = new Date(date);
  return `${d.toLocaleDateString(locales)} ${d.toLocaleTimeString(locales, { hour: "2-digit", minute: "2-digit" })}`;
};

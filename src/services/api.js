
const API_URL = import.meta.env.VITE_API_URL;
export async function apiRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error(
      "Unable to connect to the server. Please try again later."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid server response. Please try again.");
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong. Please try again."
    );

    error.status = response.status;
    error.errors = data.errors || {};

    throw error;
  }

  return data;
}

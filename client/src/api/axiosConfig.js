import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    withCredentials: true, 
});

// Intercept Errors Globally
api.interceptors.response.use(
    (response) => response, 
    (error) => {
        // 1. Check for Network Error (Offline / Server Down)
        if (!error.response) {
             // "Network Error" usually has no response object
             window.dispatchEvent(new Event('app-network-error'));
        } 
        // 2. Check for 500 Server Errors (Optional: if you want to block the app on 500)
        else if (error.response.status >= 500) {
             window.dispatchEvent(new Event('app-server-error'));
        }

        return Promise.reject(error);
    }
);

export default api;
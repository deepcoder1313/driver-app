
import axios from "axios";

// Replace with your PC's IP address
const API = axios.create({
  baseURL: "http://192.168.31.237:5000/api",
});

export default API;

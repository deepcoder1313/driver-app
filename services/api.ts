import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.31.237:5000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

console.log("🔥 DRIVER API:", API.defaults.baseURL);

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
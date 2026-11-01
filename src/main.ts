import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@fontsource-variable/manrope";
import "@fontsource-variable/literata";
import "./styles.css";

createApp(App).use(createPinia()).mount("#app");

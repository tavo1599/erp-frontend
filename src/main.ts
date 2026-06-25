// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/variables.css';  // ← primero las variables
import './assets/styles/global.css';
import './assets/styles/animations.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
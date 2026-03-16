import { createRouter, createWebHistory } from "vue-router";
import CompatReportView from "../views/CompatReportView.vue";
import CompatView from "../views/CompatView.vue";
import EmotionView from "../views/EmotionView.vue";
import GeneratingView from "../views/GeneratingView.vue";
import LandingView from "../views/LandingView.vue";
import ProfileInfoView from "../views/ProfileInfoView.vue";
import QuizView from "../views/QuizView.vue";
import ResultDetailView from "../views/ResultDetailView.vue";
import ResultView from "../views/ResultView.vue";

const routes = [
  { path: "/", name: "landing", component: LandingView, meta: { nav: false, backRoot: true } },
  { path: "/profile", name: "profile", component: ProfileInfoView, meta: { nav: false } },
  { path: "/emotion", name: "emotion", component: EmotionView, meta: { nav: false } },
  { path: "/quiz", name: "quiz", component: QuizView, meta: { nav: false } },
  { path: "/generating", name: "generating", component: GeneratingView, meta: { nav: false } },
  { path: "/result", name: "result", component: ResultView, meta: { nav: true, navKey: "result", backRoot: true } },
  { path: "/result/details", name: "result-details", component: ResultDetailView, meta: { nav: true, navKey: "result" } },
  { path: "/compat", name: "compat", component: CompatView, meta: { nav: true, navKey: "compat", backRoot: true } },
  { path: "/compat/report/:reportId", name: "compat-report", component: CompatReportView, meta: { nav: true, navKey: "compat" } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;

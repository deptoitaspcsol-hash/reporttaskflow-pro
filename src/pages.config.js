/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import DailyReports from './pages/DailyReports';
import Dashboard from './pages/Dashboard';
import PaymentClosings from './pages/PaymentClosings';
import PaymentHistory from './pages/PaymentHistory';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import Salaries from './pages/Salaries';
import Tasks from './pages/Tasks';
import UserManagement from './pages/UserManagement';
import WorkTypes from './pages/WorkTypes';
import WorkerGroups from './pages/WorkerGroups';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Performance from './pages/Performance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DailyReports": DailyReports,
    "Dashboard": Dashboard,
    "PaymentClosings": PaymentClosings,
    "PaymentHistory": PaymentHistory,
    "Projects": Projects,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "Salaries": Salaries,
    "Tasks": Tasks,
    "UserManagement": UserManagement,
    "WorkTypes": WorkTypes,
    "WorkerGroups": WorkerGroups,
    "Workers": Workers,
    "Attendance": Attendance,
    "Performance": Performance,
}

export const pagesConfig = {
    mainPage: "Workers",
    Pages: PAGES,
    Layout: __Layout,
};
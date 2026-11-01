/**
 * pages.config.js - Registro de páginas y de la página principal.
 *
 * Cada página vive en ./pages/<Nombre>.jsx y se registra aquí con su nombre de ruta:
 *   1) importar la página,  2) agregarla a PAGES,  3) (si es nueva) agregarla al menú en src/Layout.jsx.
 * `mainPage` es la página que se abre en "/".
 */
import Attendance from './pages/Attendance';
import DailyReports from './pages/DailyReports';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import PaymentClosings from './pages/PaymentClosings';
import PaymentHistory from './pages/PaymentHistory';
import Performance from './pages/Performance';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import Salaries from './pages/Salaries';
import Tasks from './pages/Tasks';
import UserManagement from './pages/UserManagement';
import WorkTypes from './pages/WorkTypes';
import WorkerGroups from './pages/WorkerGroups';
import Workers from './pages/Workers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Attendance": Attendance,
    "DailyReports": DailyReports,
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "PaymentClosings": PaymentClosings,
    "PaymentHistory": PaymentHistory,
    "Performance": Performance,
    "Projects": Projects,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "Salaries": Salaries,
    "Tasks": Tasks,
    "UserManagement": UserManagement,
    "WorkTypes": WorkTypes,
    "WorkerGroups": WorkerGroups,
    "Workers": Workers,
}

export const pagesConfig = {
    mainPage: "Workers",
    Pages: PAGES,
    Layout: __Layout,
};
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Root } from "./app/pages/Root";
import { Landing } from "./app/pages/Landing";
import { Login } from "./app/pages/Login";
import { Register } from "./app/pages/Register";
import { CandidateDashboard } from "./app/pages/CandidateDashboard";
import { CompanyDashboard } from "./app/pages/CompanyDashboard";
import { AdminDashboard } from "./app/pages/AdminDashboard";
import { SupportDashboard } from "./app/pages/SupportDashboard";
import { Showcase } from "./app/pages/Showcase";
import { Empleos } from "./app/pages/Empleos";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard" element={<Navigate to="/dashboard/candidate" replace />} />
          <Route path="dashboard/candidate" element={<CandidateDashboard />} />
          <Route path="dashboard/company" element={<CompanyDashboard />} />
          <Route path="dashboard/admin" element={<AdminDashboard />} />
          <Route path="dashboard/support" element={<SupportDashboard />} />
          <Route path="resources" element={<Navigate to="/dashboard/candidate" replace />} />
          <Route path="empleos" element={<Empleos />} />
          <Route path="showcase" element={<Showcase />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

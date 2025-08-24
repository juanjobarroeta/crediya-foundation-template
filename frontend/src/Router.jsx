import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import CustomerPage from "./pages/CustomerPage";
import CustomerProfile from "./pages/CustomerProfile";
import FinancialProducts from "./pages/FinancialProducts";
import CreateLoan from "./pages/CreateLoan";
import CreateCustomer from "./pages/CreateCustomer";
import LoanApprovals from "./pages/LoanApprovals";
import AccountingEntries from "./pages/AccountingEntries";
import RegisterPayment from "./pages/RegisterPayment";
import LoanStatement from "./pages/LoanStatement";
import CustomerDirectory from "./pages/CustomerDirectory";
import PublicRegister from "./pages/PublicRegister";
import AdminPromotions from "./pages/AdminPromotions";
import AdminExpenses from "./pages/AdminExpenses";
import ProfitSummary from "./pages/ProfitSummary";
import BalanceSheet from "./pages/BalanceSheet";
import InventoryRequest from "./pages/InventoryRequest"; // fixed export
import AdminApprovals from "./pages/AdminApprovals";
import AdminInventoryViewer from "./pages/AdminInventoryViewer";
import AdminManualEntry from "./pages/AdminManualEntry";
import Tesoreria from "./pages/Tesorería";
import ReclassifyPayment from "./pages/ReclassifyPayment";
import IncomeStatement from "./pages/IncomeStatement";
import RecepcionInventario from "./pages/RecepcionInventario";
import AssignIMEI from "./pages/AssignIMEI";
import GenerateContract from "./pages/GenerateContract";
import LoanQuotes from "./pages/LoanQuotes";
import AccountBalances from "./pages/AccountBalances";
import LoanRequest from "./pages/LoanRequest";
import InvestigationsDashboard from "./pages/InvestigationsDashboard";
import InvestigationStepper from "./pages/InvestigationStepper";
import OverdueLoans from "./pages/OverdueLoans";
import LoansDashboard from "./pages/LoansDashboard";
import AccountingAdmin from "./pages/AccountingAdmin";
import LoanDetails from "./pages/LoanDetails";
import LoanApplicationDetails from "./components/LoanApplicationDetails";
import CollectionsDashboard from "./pages/CollectionsDashboard";
import ProductProfile from "./pages/ProductProfile";
import CreateUser from "./pages/CreateUser";
import StoreDashboard from "./pages/StoreDashboard";
import BudgetManagement from "./pages/BudgetManagement";
import AccountingHub from "./pages/AccountingHub";
import UnifiedLoanSystem from "./pages/UnifiedLoanSystem";
import LoanResolution from "./pages/LoanResolution";
import LoanStatusManager from "./pages/LoanStatusManager";
import UserManagement from "./pages/UserManagement";
import StoreManagement from "./pages/StoreManagement";

// DEVELOPMENT MODE: Bypass authentication
const ProtectedRoute = ({ children }) => {
  // For development, always allow access
  console.log("🔓 DEV MODE: Bypassing authentication");
  return children;
};

const AdminRoute = ({ children }) => {
  // For development, always allow admin access
  console.log("🔓 DEV MODE: Bypassing admin authentication");
  return children;
};

const AppRouter = () => (
  <Router>
    <Routes>
      <Route path="/investigation" element={<LoanRequest />} />
      <Route path="/investigation-stepper" element={<InvestigationStepper />} />
      {/* DEVELOPMENT: Redirect auth to dashboard */}
      <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
      <Route path="/customer/:id" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
      <Route path="/financial-products" element={<ProtectedRoute><FinancialProducts /></ProtectedRoute>} />
      <Route path="/create-loan" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
      <Route path="/create-customer" element={<ProtectedRoute><CreateCustomer /></ProtectedRoute>} />
      <Route path="/admin/loans" element={<AdminRoute><LoanApprovals /></AdminRoute>} />
      <Route
        path="/admin/loan-applications/:id"
        element={
          <AdminRoute>
            <LoanApplicationDetails />
          </AdminRoute>
        }
      />
      <Route path="/accounting" element={<AdminRoute><AccountingEntries /></AdminRoute>} />
      <Route path="/admin/accounting" element={<AdminRoute><AccountingAdmin /></AdminRoute>} />
      <Route path="/register-payment" element={<ProtectedRoute><RegisterPayment /></ProtectedRoute>} />
      <Route path="/loans/:id/statement" element={<ProtectedRoute><LoanStatement /></ProtectedRoute>} />
      <Route path="/loans/:loan_id/details" element={<ProtectedRoute><LoanDetails /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><CustomerDirectory /></ProtectedRoute>} />
      <Route path="/registro" element={<PublicRegister />} />
      <Route path="/admin/promotions" element={<AdminRoute><AdminPromotions /></AdminRoute>} />
      <Route path="/admin/expenses" element={<AdminRoute><AdminExpenses /></AdminRoute>} />
      <Route path="/loans" element={<ProtectedRoute><LoansDashboard /></ProtectedRoute>} />
      <Route path="/admin/budgets" element={<AdminRoute><BudgetManagement /></AdminRoute>} />
      <Route path="/admin/profit" element={<AdminRoute><ProfitSummary /></AdminRoute>} />
      <Route path="/admin/balance-sheet" element={<AdminRoute><BalanceSheet /></AdminRoute>} />
      <Route path="/admin/inventory-request" element={<AdminRoute><InventoryRequest /></AdminRoute>} />
      <Route path="/admin/account-balances" element={<AdminRoute><AccountBalances /></AdminRoute>} />
      <Route path="/admin/inventory" element={<AdminInventoryViewer />} />
      <Route
        path="/admin/aprobaciones"
        element={
          <AdminRoute>
            <AdminApprovals />
          </AdminRoute>
        }
      />
      <Route
        path="/inventory-request"
        element={
          <ProtectedRoute>
            <InventoryRequest />
          </ProtectedRoute>
        }
      />
      <Route path="/inventory/:id" element={<ProtectedRoute><ProductProfile /></ProtectedRoute>} />
      <Route
        path="/balance-sheet"
        element={
          <AdminRoute>
            <BalanceSheet />
          </AdminRoute>
        }
      />
      <Route path="/admin/manual-entry" element={<AdminRoute><AdminManualEntry /></AdminRoute>} />
      <Route path="/admin/tesoreria" element={<AdminRoute><Tesoreria /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
      <Route path="/admin/stores" element={<AdminRoute><StoreManagement /></AdminRoute>} />
      <Route path="/warehouse/reception" element={<ProtectedRoute><RecepcionInventario /></ProtectedRoute>} />
      <Route
        path="/income-statement"
        element={
          <AdminRoute>
            <IncomeStatement />
          </AdminRoute>
        }
      />
      <Route path="/admin/assign-imei" element={<AdminRoute><AssignIMEI /></AdminRoute>} />
      <Route path="/admin/generate-contract" element={<AdminRoute><GenerateContract /></AdminRoute>} />
      <Route path="/loan-quotes" element={<ProtectedRoute><LoanQuotes /></ProtectedRoute>} />
      <Route path="/admin/investigations" element={<AdminRoute><InvestigationsDashboard /></AdminRoute>} />
      <Route path="/admin/overdue-loans" element={<AdminRoute><OverdueLoans /></AdminRoute>} />
      {/* DEVELOPMENT: Dashboard is now the main entry point */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/store-dashboard" element={<AdminRoute><StoreDashboard /></AdminRoute>} />
      <Route path="/admin/reclassify-payment" element={<AdminRoute><ReclassifyPayment /></AdminRoute>} />
      <Route path="/accounting-hub" element={<AdminRoute><AccountingHub /></AdminRoute>} />
      <Route
        path="/admin/collections"
        element={
          <AdminRoute>
            <CollectionsDashboard />
          </AdminRoute>
        }
      />
      <Route path="/admin/create-user" element={<AdminRoute><CreateUser /></AdminRoute>} />
      
      {/* Recovered State-of-the-Art Loan System Routes */}
      <Route path="/loans/unified" element={<ProtectedRoute><UnifiedLoanSystem /></ProtectedRoute>} />
      <Route path="/loans/unified/:loan_id" element={<ProtectedRoute><UnifiedLoanSystem /></ProtectedRoute>} />
      <Route path="/loans/:loan_id/resolution" element={<ProtectedRoute><LoanResolution /></ProtectedRoute>} />
      <Route path="/loans/:loan_id/status" element={<ProtectedRoute><LoanStatusManager /></ProtectedRoute>} />
      
      {/* DEVELOPMENT: Redirect everything to dashboard instead of auth */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Router>
);

export default AppRouter;
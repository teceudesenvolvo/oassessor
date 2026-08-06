import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import BrandLoader from './components/BrandLoader';

// Importing Components
const Footer = lazy(() => import('./components/Footer'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const PublicRoute = lazy(() => import('./components/PublicRoute'));
const AuthTokenHandler = lazy(() => import('./components/AuthTokenHandler'));

// CSV Importer
const ConvertCsv = lazy(() => import('./screens/out/convertCSV'));

// Importing Screens 
const Home = lazy(() => import('./screens/out/Home'));
const PlanLanding = lazy(() => import('./screens/out/PlanLanding'));
const Contact = lazy(() => import('./screens/out/Contact'));
const Checkout = lazy(() => import('./screens/out/Checkout'));
const Plans = lazy(() => import('./screens/out/Plans'));
const About = lazy(() => import('./screens/out/About'));
const DownloadApp = lazy(() => import('./screens/out/DownloadApp'));

const Login = lazy(() => import('./screens/out/Login'));
const TeamMemberRegistration = lazy(() => import('./screens/out/TeamMemberRegistration'));

const Dashboard = lazy(() => import('./screens/in/Dashboard'));
const DashboardHome = lazy(() => import('./screens/in/DashboardHome'));
const Team = lazy(() => import('./screens/in/Team'));
const Agenda = lazy(() => import('./screens/in/Agenda'));
const Voters = lazy(() => import('./screens/in/Voters'));
const NewVoter = lazy(() => import('./screens/in/NewVoter'));
const VoteComparison = lazy(() => import('./screens/in/VoteComparison'));
const VoterMap = lazy(() => import('./screens/in/VoterMap'));
const PollingStationMap = lazy(() => import('./screens/in/PollingStationMap'));
const VoterDetails = lazy(() => import('./screens/in/VoterDetails'));
const ElectoralFunnel = lazy(() => import('./screens/in/ElectoralFunnel'));
const VictoryPath = lazy(() => import('./screens/in/VictoryPath'));
const Leaderships = lazy(() => import('./screens/in/Leaderships'));
const Volunteers = lazy(() => import('./screens/in/Volunteers'));
const Visits = lazy(() => import('./screens/in/Visits'));
const Demands = lazy(() => import('./screens/in/Demands'));
const Events = lazy(() => import('./screens/in/Events'));
const CommunicationCenter = lazy(() => import('./screens/in/CommunicationCenter'));
const TerritoryCenter = lazy(() => import('./screens/in/TerritoryCenter'));
const ResearchCenter = lazy(() => import('./screens/in/ResearchCenter'));
const ReportsCenter = lazy(() => import('./screens/in/ReportsCenter'));
const AICenter = lazy(() => import('./screens/in/AICenter'));
const UsersManagement = lazy(() => import('./screens/in/UsersManagement'));
const AuditCenter = lazy(() => import('./screens/in/AuditCenter'));
const ImportCenter = lazy(() => import('./screens/in/ImportCenter'));
const SettingsCenter = lazy(() => import('./screens/in/SettingsCenter'));
const SubscriptionCenter = lazy(() => import('./screens/in/SubscriptionCenter'));
const SystemCenter = lazy(() => import('./screens/in/SystemCenter'));
const Profile = lazy(() => import('./screens/in/Profile'));
const Notifications = lazy(() => import('./screens/in/Notifications'));
const DataMigration = lazy(() => import('./screens/in/DataMigration'));
const EleitorForm = lazy(() => import('./screens/out/EleitorForm'));
const AccountabilityLayout = lazy(() => import('./screens/in/accountability/AccountabilityLayout'));
const AccountabilityOverview = lazy(() => import('./screens/in/accountability/OverviewTab'));
const AccountabilityConfiguration = lazy(() => import('./screens/in/accountability/ConfigurationTab'));
const AccountabilityBankAccounts = lazy(() => import('./screens/in/accountability/BankAccountsTab'));
const AccountabilityRevenues = lazy(() => import('./screens/in/accountability/RevenuesTab'));
const AccountabilityExpenses = lazy(() => import('./screens/in/accountability/ExpensesTab'));
const AccountabilityCatalogs = lazy(() => import('./screens/in/accountability/CatalogsTab'));
const AccountabilityDocuments = lazy(() => import('./screens/in/accountability/DocumentsTab'));
const AccountabilityReconciliation = lazy(() => import('./screens/in/accountability/ReconciliationTab'));
const AccountabilityBudget = lazy(() => import('./screens/in/accountability/BudgetTab'));
const AccountabilityPendingIssues = lazy(() => import('./screens/in/accountability/PendingIssuesTab'));
const AccountabilityReports = lazy(() => import('./screens/in/accountability/ReportsTab'));
const AccountabilityReview = lazy(() => import('./screens/in/accountability/ReviewTab'));
const AccountabilityClosing = lazy(() => import('./screens/in/accountability/ClosingTab'));

function App() {
  const loadingFallback = (
    <BrandLoader
      title="Preparando a plataforma"
      subtitle="Carregando módulos, interface e inteligência para a próxima ação."
    />
  );

  return (
    <Router>
      <div className="main-container">
        <Suspense fallback={loadingFallback}>
          <AuthTokenHandler />
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route path="/plan/:id" element={<PlanLanding />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/checkout/:planId" element={<Checkout />} />
            <Route path="/eleitor-form" element={<EleitorForm />} />
            <Route path="/download-app" element={<DownloadApp />} />

            {/* Extrator CSV */}
            <Route path="/convert-csv" element={<ConvertCsv />} />


            {/* Rotas públicas que redirecionam se o usuário estiver logado */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro-assessor-equipe" element={<TeamMemberRegistration />} />
            </Route>

            {/* Rotas protegidas que exigem login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />}>
                <Route index element={<DashboardHome />} />
                <Route path="team" element={<Team />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="voters" element={<Voters />} />
                <Route path="electoral-funnel" element={<ElectoralFunnel />} />
                <Route path="victory-path" element={<VictoryPath />} />
                <Route path="leaderships" element={<Leaderships />} />
                <Route path="volunteers" element={<Volunteers />} />
                <Route path="visits" element={<Visits />} />
                <Route path="demands" element={<Demands />} />
                <Route path="events" element={<Events />} />
                <Route path="communication" element={<CommunicationCenter />} />
                <Route path="territory" element={<TerritoryCenter />} />
                <Route path="research" element={<ResearchCenter />} />
                <Route path="reports" element={<ReportsCenter />} />
                <Route path="ai" element={<AICenter />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="audit" element={<AuditCenter />} />
                <Route path="import" element={<ImportCenter />} />
                <Route path="settings" element={<SettingsCenter />} />
                <Route path="subscription" element={<SubscriptionCenter />} />
                <Route path="system-center" element={<SystemCenter />} />
                <Route path="voters/new" element={<NewVoter />} />
                <Route path="voters/map" element={<VoterMap />} />
                <Route path="voters/stations-map" element={<PollingStationMap />} />
                <Route path="vote-comparison" element={<VoteComparison />} />
                <Route path="voters/:id" element={<VoterDetails />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="data-migration" element={<DataMigration />} />
                <Route path="prestacao-contas" element={<AccountabilityLayout />}>
                  <Route index element={<Navigate to="visao-geral" replace />} />
                  <Route path="visao-geral" element={<AccountabilityOverview />} />
                  <Route path="configuracao" element={<AccountabilityConfiguration />} />
                  <Route path="contas-bancarias" element={<AccountabilityBankAccounts />} />
                  <Route path="receitas" element={<AccountabilityRevenues />} />
                  <Route path="despesas" element={<AccountabilityExpenses />} />
                  <Route path="cadastros" element={<AccountabilityCatalogs />} />
                  <Route path="documentos" element={<AccountabilityDocuments />} />
                  <Route path="conciliacao" element={<AccountabilityReconciliation />} />
                  <Route path="orcamento" element={<AccountabilityBudget />} />
                  <Route path="pendencias" element={<AccountabilityPendingIssues />} />
                  <Route path="relatorios" element={<AccountabilityReports />} />
                  <Route path="revisao" element={<AccountabilityReview />} />
                  <Route path="fechamento" element={<AccountabilityClosing />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          <Footer />
        </Suspense>
      </div>
    </Router>
  );
}

export default App;

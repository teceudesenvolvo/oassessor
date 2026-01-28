import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Importing Components
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AuthTokenHandler from './components/AuthTokenHandler';

// CSV Importer
import ConvertCsv from './screens/out/convertCSV';

// Importing Screens 
import Home from './screens/out/Home';
import PlanLanding from './screens/out/PlanLanding';
import Contact from './screens/out/Contact';
import Checkout from './screens/out/Checkout';
import Plans from './screens/out/Plans';
import About from './screens/out/About';

import Login from './screens/out/Login';
import TeamMemberRegistration from './screens/out/TeamMemberRegistration';

import Dashboard from './screens/in/Dashboard';
import DashboardHome from './screens/in/DashboardHome';
import Team from './screens/in/Team';
import Agenda from './screens/in/Agenda';
import Voters from './screens/in/Voters';
import NewVoter from './screens/in/NewVoter';
import VoterMap from './screens/in/VoterMap';
import VoterDetails from './screens/in/VoterDetails';
import Profile from './screens/in/Profile';
import Notifications from './screens/in/Notifications';
import EleitorForm from './screens/out/EleitorForm';

function App() {
  return (
    <Router>
      <AuthTokenHandler />
      <div className="main-container">
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/plan/:id" element={<PlanLanding />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout/:planId" element={<Checkout />} />
          <Route path="/eleitor-form" element={<EleitorForm />} />

          {/* Extrator CSV */}
          <Route path="/convert-csv" element={<ConvertCsv />} />


          {/* Rotas públicas que redirecionam se o usuário estiver logado */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<TeamMemberRegistration />} />
          </Route>

          {/* Rotas protegidas que exigem login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<DashboardHome />} />
              <Route path="team" element={<Team />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="voters" element={<Voters />} />
              <Route path="voters/new" element={<NewVoter />} />
              <Route path="voters/map" element={<VoterMap />} />
              <Route path="voters/:id" element={<VoterDetails />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Route>
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
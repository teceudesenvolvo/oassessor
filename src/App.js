import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Importing Components
import Footer from './components/Footer';

// Importing Screens 
import Home from './screens/Home';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import PlanLanding from './screens/PlanLanding';
import Checkout from './screens/Checkout';


function App() {
  return (
    <Router>
      <div className="main-container">
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/plan/:id" element={<PlanLanding />} />
          <Route path="/checkout/:planId" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
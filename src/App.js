import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Importing Components
import Footer from './components/Footer';

// Importing Screens 
import Home from './screens/out/Home';
import PlanLanding from './screens/out/PlanLanding';
import Contact from './screens/out/Contact';
import Checkout from './screens/out/Checkout';
import Plans from './screens/out/Plans';
import About from './screens/out/About';

import Login from './screens/out/Login';

import Dashboard from './screens/in/Dashboard';

function App() {
  return (
    <Router>
      <div className="main-container">
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/plan/:id" element={<PlanLanding />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout/:planId" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
import React from 'react';
import './App.css';
import Header from './components/Header';
import Services from './components/Services';
import Footer from './components/Footer';

function App() {
  return (
    <div className="main-container">
      <Header />
      <main className="content">
        <Services />
      </main>
      <Footer />
    </div>
  );
}

export default App;
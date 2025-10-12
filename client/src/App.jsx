import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Home from './pages/Home';
import Help from './pages/Help';
import Upload from "./pages/Upload";
import Analysis from './pages/Analysis';
import AuthBox from './components/AuthBox';
import  AuthCallback from './pages/AuthCallback';
import { AuthProvider } from './contexts/AuthProvider';
// import ProtectedRoute from './routes/ProtectedRoute';
//import './app.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    })
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/help" element={<Help />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
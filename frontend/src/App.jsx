import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ChurchProfile from './pages/ChurchProfile.jsx';
import Join from './pages/Join.jsx';
import Login from './pages/Login.jsx';
import MyChurches from './pages/MyChurches.jsx';
import NotFound from './pages/NotFound.jsx';
import QrCode from './pages/QrCode.jsx';
import { getToken } from './api.js';

const RequireAuth = ({ children }) => (getToken() ? children : <Navigate to="/login" replace />);

const App = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Navigate to={getToken() ? '/churches' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/churches"
        element={
          <RequireAuth>
            <MyChurches />
          </RequireAuth>
        }
      />
      <Route path="/church/:token" element={<ChurchProfile />} />
      <Route path="/qr/:token" element={<QrCode />} />
      <Route path="/join/:token" element={<Join />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

export default App;

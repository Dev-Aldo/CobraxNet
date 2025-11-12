import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import EmailVerification from './features/auth/EmailVerification';
import Home from './features/posts/Home';
import Profile from './features/profile/Profile';
import UserProfile from './features/profile/UserProfile';
import Chat from './features/chat/Chat';
import GroupChat from './features/chat/GroupChat';
import Groups from './features/groups/Groups';
import GroupDetail from './features/groups/GroupDetail';
import PrivateRoute from './shared/components/PrivateRoute';
import Marketplace from './features/marketplace/Marketplace';
import ProductDetail from './features/marketplace/ProductDetail';
import ProductForm from './features/marketplace/ProductForm';


function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify/:token" element={<EmailVerification />} />

        {/* Ruta protegida Home */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        {/* Ruta protegida Perfil propio */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Ruta protegida Perfil de otros usuarios */}
        <Route
          path="/profile/:userId"
          element={
            <PrivateRoute>
              <UserProfile />
            </PrivateRoute>
          }
        />


        {/* Ruta protegida Chat privado */}
        <Route
          path="/chat/:userId"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />

        {/* Ruta protegida Grupos */}
        <Route
          path="/groups"
          element={
            <PrivateRoute>
              <Groups />
            </PrivateRoute>
          }
        />

        {/* Ruta protegida Detalle de Grupo */}
        <Route
          path="/groups/:groupId"
          element={
            <PrivateRoute>
              <GroupDetail />
            </PrivateRoute>
          }
        />

        {/* Ruta protegida Chat grupal */}
        <Route
          path="/group-chat/:groupId"
          element={
            <PrivateRoute>
              <GroupChat />
            </PrivateRoute>
          }
        />

        {/* Marketplace */}
        <Route
          path="/marketplace"
          element={
            <PrivateRoute>
              <Marketplace />
            </PrivateRoute>
          }
        />
        <Route
          path="/marketplace/new"
          element={
            <PrivateRoute>
              <ProductForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/marketplace/edit/:id"
          element={
            <PrivateRoute>
              <ProductForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/marketplace/:id"
          element={
            <PrivateRoute>
              <ProductDetail />
            </PrivateRoute>
          }
        />

        {/* Redirigir a /login si no se encuentra la ruta */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

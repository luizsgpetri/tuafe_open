import { Container, Nav, Navbar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { clearToken, getToken } from '../api.js';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(getToken());

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <Navbar bg="dark" variant="dark" expand="md">
        <Container>
          <Navbar.Brand as={Link} to="/">
            Church Community
          </Navbar.Brand>
          <Nav className="ms-auto">
            {isLoggedIn ? (
              <>
                <Nav.Link as={Link} to="/churches">
                  My churches
                </Nav.Link>
                <Nav.Link onClick={handleLogout}>Log out</Nav.Link>
              </>
            ) : (
              <Nav.Link as={Link} to="/login">
                Log in
              </Nav.Link>
            )}
          </Nav>
        </Container>
      </Navbar>
      <main className="app-main">
        <Container>{children}</Container>
      </main>
    </div>
  );
};

export default Layout;
